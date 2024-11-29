// routes/support.js

const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase Admin (ensure this is done in index.js as well)
var firebaseAuth = admin.auth();
var firestore = admin.firestore();

// **Define your email credentials directly in the code**
const EMAIL_SERVICE = 'webmail'; // e.g., 'gmail', 'yahoo', 'hotmail', etc.
const EMAIL_USER = 'hello@thesalesgong.com'; // Your email address
const EMAIL_PASS = '$alesGONG123'; // Your email password or app password

// **Configure Nodemailer transporter**
const transporter = nodemailer.createTransport({
  service: EMAIL_SERVICE, // e.g., 'gmail'
  auth: {
    user: EMAIL_USER, // Your email address
    pass: EMAIL_PASS, // Your email password or app password
  },
});

// **Verify the transporter configuration**
transporter.verify((error, success) => {
  if (error) {
    console.error("Nodemailer transporter configuration error:", error);
  } else {
    console.log("Nodemailer transporter is ready to send emails");
  }
});

// **GET /support/**
router.get("/", async (req, res) => {
  res.status(201).json({ message: "success" });
});

// **POST /support/contact**
router.post("/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  // **Basic validation (you can enhance this as needed)**
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // **Define email options**
  const mailOptions = {
    from: EMAIL_USER, // Sender address
    to: EMAIL_USER, // Receiver address (can be the same as sender)
    subject: `Contact Form Submission: ${subject}`,
    text: `
      You have a new contact form submission.

      Name: ${name}
      Email: ${email}
      Subject: ${subject}
      Message: ${message}
    `,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `,
  };

  try {
    // **Send the email**
    let info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);

    // **Optionally, you can save the contact form submission to Firestore**
    /*
    await firestore.collection('contact_forms').add({
      name,
      email,
      subject,
      message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    */

    // **Respond to the client**
    res.status(200).json({ message: "Your message has been sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "There was an error sending your message. Please try again later." });
  }
});

module.exports = router;