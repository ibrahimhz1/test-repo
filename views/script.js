// Mobile Menu Toggle
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Smooth Scrolling for Navbar Links (only on home.html)
if (window.location.pathname.includes('home.html')) {
    document.querySelectorAll('.nav-links a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                targetSection.scrollIntoView({ behavior: 'smooth' });
                if (window.innerWidth <= 768) {
                    navLinks.classList.remove('active');
                }
            }
        });
    });

    // Countdown Timer for Manuscript Submission Deadline (15 March 2025)
    function startCountdown() {
        const deadline = new Date('March 15, 2025 23:59:59').getTime();
        const now = new Date().getTime();
        const distance = deadline - now;

        if (distance < 0) {
            document.querySelector('.countdown').innerHTML = "Submission Deadline Passed";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.querySelector('.countdown').innerHTML = 
            `${days}d ${hours}h ${minutes}m ${seconds}s until Submission Deadline`;
    }

    setInterval(startCountdown, 1000);
    startCountdown();
}

// Contact Form Submission (only on contact.html)
// Check if the page is contact.html before running the script
if (window.location.pathname.includes('contact.html')) {
    document.getElementById('contact-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            name: this.name.value,
            email: this.email.value,
            message: this.message.value
        };

        console.log('Form Submitted:', formData);
        document.getElementById('result').innerHTML = "Please wait...";

        // Send data to Web3Forms API
        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                access_key: '6131165c-3ad9-4d2f-a286-01babd69ac4e',
                ...formData
            })
        })
        .then(async (response) => {
            let json = await response.json();
            if (response.status === 200) {
                document.getElementById('result').innerHTML = "Form submitted successfully";
                alert('Thank you for your message! We’ll get back to you soon.');
            } else {
                console.log(response);
                document.getElementById('result').innerHTML = json.message;
            }
        })
        .catch(error => {
            console.log(error);
            document.getElementById('result').innerHTML = "Something went wrong!";
        })
        .then(() => {
            this.reset();
            setTimeout(() => {
                document.getElementById('result').style.display = "none";
            }, 3000);
        });
    });
}

// Registration Page Interactivity (only on registration.html)
if (window.location.pathname.includes('registration.html')) {
    // Registration Form Validation and Submission
    const regForm = document.getElementById('registration-form');
    const inputs = regForm.querySelectorAll('input, select');

    inputs.forEach(input => {
        input.addEventListener('input', function() {
            const error = this.nextElementSibling;
            if (this.validity.valid) {
                error.textContent = '';
            } else if (this.name === 'name' && !this.value) {
                error.textContent = 'Name is required.';
            } else if (this.name === 'email' && !this.validity.valid) {
                error.textContent = 'Please enter a valid email.';
            } else if (this.name === 'category' && !this.value) {
                error.textContent = 'Please select a category.';
            }
        });
    });

    regForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        let isValid = true;
        inputs.forEach(input => {
            if (!input.validity.valid) {
                isValid = false;
                input.dispatchEvent(new Event('input'));
            }
        });

        if (isValid) {
            const formData = new FormData();
            formData.append('name', this.name.value);
            formData.append('email', this.email.value);
            formData.append('category', this.category.value);
            formData.append('file', this['payment-proof'].files[0]);  // Attach file

            try {
                const response = await fetch('http://localhost:5230/register', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                if (response.ok) {
                    alert('Registration submitted successfully!');
                    this.reset();
                    document.getElementById('preview').innerHTML = '';
                } else {
                    alert(`Error: ${result.message}`);
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('Something went wrong! Please try again.');
            }
        }
    });

    // File Upload Preview
    const paymentProof = document.getElementById('payment-proof');
    const preview = document.getElementById('preview');
    
    paymentProof.addEventListener('change', function() {
        preview.innerHTML = '';
        const file = this.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.onload = () => URL.revokeObjectURL(img.src); // Clean up memory
                preview.appendChild(img);
            } else if (file.type === 'application/pdf') {
                preview.textContent = `PDF Uploaded: ${file.name}`;
            } else {
                preview.textContent = 'Please upload an image or PDF.';
            }
        }
    });
}


// Submission Page Interactivity (only on submission.html)
if (window.location.pathname.includes('submission.html')) {
    const submissionForm = document.getElementById('submission-form');
    const paperUpload = document.getElementById('paper-upload');
    const paperPreview = document.getElementById('paper-preview');

    // File Upload Preview
    paperUpload.addEventListener('change', function() {
        paperPreview.innerHTML = '';
        const file = this.files[0];
        if (file && file.type === "application/pdf") {
            paperPreview.textContent = `PDF Uploaded: ${file.name}`;
        } else {
            paperPreview.textContent = 'Please upload a PDF file.';
        }
    });

    // Handle Form Submission
    submissionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);

        fetch("http://localhost:5230/submit", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log("Success:", data);
            alert("Paper submitted successfully!");
            this.reset();
            paperPreview.innerHTML = '';
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Something went wrong!");
        });
    });
}


