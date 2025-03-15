require("dotenv").config();
const path = require('path');
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(cors());

// use static frontend files under views directory
app.use(express.static(path.join(__dirname, 'views')));


app.use("/uploads", express.static("uploads")); // Serve uploaded files
app.use("/uploads_pdf", express.static("uploads_pdf")); // Serve uploaded papers


// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));


// ✅ Define Schemas & Models
const RegistrationSchema = new mongoose.Schema({
  name: String,
  email: String,
  category: String,
  filePath: String,
  uploadedAt: { type: Date, default: Date.now },
});


const SubmissionSchema = new mongoose.Schema({
  authorName: String,
  email: String,
  paperTitle: String,
  paperFile: String,
  uploadedAt: { type: Date, default: Date.now },
});


const Registration = mongoose.model("Registration", RegistrationSchema);
const Submission = mongoose.model("Submission", SubmissionSchema);


// ✅ Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// ✅ Function to Send Email
const sendEmail = async (to, subject, text, attachments = []) => {
  try {
    console.log("inside...");
    await transporter.sendMail({
      from: `"Conference Team" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      attachments,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Email Sending Error:", error);
  }
};

// ✅ Configure File Upload for Registration (Uploads to 'uploads/')
const storageRegistration = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const uploadRegistration = multer({ storage: storageRegistration });

// ✅ Configure File Upload for Submissions (Uploads to 'uploads_pdf/')
const storageSubmission = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync("uploads_pdf")) fs.mkdirSync("uploads_pdf");
    cb(null, "uploads_pdf/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const uploadSubmission = multer({
  storage: storageSubmission,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"));
    }
  },
});

// ✅ API Endpoint - Register User with File Upload
app.post("/register", uploadRegistration.single("file"), async (req, res) => {
  try {
    const { name, email, category } = req.body;
    const filePath = req.file ? `/uploads/${req.file.filename}` : null;

    const newRegistration = new Registration({ name, email, category, filePath });
    await newRegistration.save();

    // 📧 Email to User
    sendEmail(
      email, 
      "Registration Successful", 
      `Hello ${name},\n\nThank you for registering. We have received your details.\nCategory: ${category}`,
      filePath ? [{ filename: req.file.originalname, path: req.file.path }] : []
    );

    // 📧 Email to Admin
    sendEmail(
      process.env.ADMIN_EMAIL, 
      "New Registration Received", 
      `New registration received:\n\nName: ${name}\nEmail: ${email}\nCategory: ${category}`,
      filePath ? [{ filename: req.file.originalname, path: req.file.path }] : []
    );

    res.status(201).json({ message: "Registration successful! Email sent." });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ API Endpoint - Get All Registrations
app.get("/registrations", async (req, res) => {
  try {
    const registrations = await Registration.find();
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ API Endpoint - Submit Paper (PDF Upload)
app.post("/submit", uploadSubmission.single("paper-upload"), async (req, res) => {
  try {
    const authorName = req.body["author-name"];
    console.log(authorName)
    const email = req.body.email;
    console.log(email)
    const paperTitle = req.body["paper-title"];
    console.log(paperTitle)
    const paperFile = req.file ? `uploads_pdf/${req.file.filename}` : null;
    console.log(req.file.path)

    if (!authorName || !email || !paperTitle || !paperFile) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    console.log("till this working...");

    const newSubmission = new Submission({ authorName, email, paperTitle, paperFile });
    
    await newSubmission.save();
    console.log("submitted to mongodb...");
    
    
    // 📧 Email to User
    sendEmail(
      email, 
      "Paper Submission Successful", 
      `Hello ${authorName},\n\nThank you for submitting your paper titled "${paperTitle}".`,
      paperFile ? [{ filename: req.file.originalname, path: req.file.path }] : []
    );

    // 📧 Email to Admin
    sendEmail(
      process.env.ADMIN_EMAIL, 
      "New Paper Submission Received", 
      `New paper submission received:\n\nAuthor: ${authorName}\nEmail: ${email}\nPaper Title: ${paperTitle}`,
      paperFile ? [{ filename: req.file.originalname, path: req.file.path }] : []
    );

    res.status(201).json({ message: "Paper submitted successfully! Email sent." });
  } catch (error) {
    res.status(500).json({ error: "Submission failed!" });
  }
});

// ✅ API Endpoint - Get All Submissions
app.get("/submissions", async (req, res) => {
  try {
    const submissions = await Submission.find();
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});


// Route to serve the PDF file
app.get('/download-pdf', (req, res) => {
  const filePath = path.join(__dirname, 'views', 'forms', 'DAM paper v4.pdf'); // Adjust the file path
  res.download(filePath, 'document.pdf', (err) => {
      if (err) {
          console.error("Error sending file:", err);
          res.status(500).send("Error downloading file");
      }
  });
});

// Route to serve HTML pages from views directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'contact.html'));
});

// Route to serve HTML pages from views directory
app.get('/registration', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'registration.html'));
});

app.get('/call_for_papers', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'call_for_papers.html'));
});

app.get('/submission', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'submission.html'));
});

// #################################

// ✅ Start Server
const PORT = process.env.PORT || 5230;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

