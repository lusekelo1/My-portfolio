// ============================================
// server.js — Contact Form Backend
// Receives form submissions and emails them to you
// ============================================

const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const PROJECTS_FILE = path.join(__dirname, "projects.json");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve your portfolio files (index.html, stylesheet.css, script.js)
app.use(express.static("."));

// Set up the email transporter (using Gmail in this example)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address
    pass: process.env.EMAIL_PASS  // your Gmail App Password (not your regular password)
  }
});

// Very simple in-memory rate limit: max 3 submissions per IP every 10 minutes
const submissionLog = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (submissionLog.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  timestamps.push(now);
  submissionLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

// Basic email format check
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Contact form endpoint
app.post("/contact", async (req, res) => {
  const ip = req.ip;

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many messages sent. Please try again later." });
  }

  let { name, email, message, recaptchaToken } = req.body;

  // Verify the reCAPTCHA checkbox was completed
  if (!recaptchaToken) {
    return res.status(400).json({ error: "Please complete the reCAPTCHA." });
  }

  try {
    const verifyResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
    });
    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      return res.status(400).json({ error: "reCAPTCHA verification failed. Please try again." });
    }
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return res.status(500).json({ error: "Could not verify reCAPTCHA. Please try again." });
  }

  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please fill in all fields." });
  }

  // Trim whitespace
  name = name.trim();
  email = email.trim();
  message = message.trim();

  // Length limits (prevents huge spam payloads)
  if (name.length > 100 || email.length > 150 || message.length > 2000) {
    return res.status(400).json({ error: "One of your fields is too long." });
  }

  // Email format check
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER, // sends to yourself
    replyTo: email,
    subject: `New portfolio message from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: "Message sent successfully!" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ============================================
// Projects API
// ============================================

// Public: get the list of projects (used by index.html)
app.get("/api/projects", (req, res) => {
  fs.readFile(PROJECTS_FILE, "utf-8", (err, data) => {
    if (err) {
      console.error("Error reading projects file:", err);
      return res.status(500).json({ error: "Could not load projects." });
    }
    res.json(JSON.parse(data));
  });
});

// Protected: add a new project (used by admin.html)
app.post("/api/projects", (req, res) => {
  const { password, name, description } = req.body;

  // Check password against the one stored in .env
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  if (!name || !description) {
    return res.status(400).json({ error: "Please fill in all fields." });
  }

  if (name.trim().length > 100 || description.trim().length > 500) {
    return res.status(400).json({ error: "One of your fields is too long." });
  }

  fs.readFile(PROJECTS_FILE, "utf-8", (err, data) => {
    if (err) {
      console.error("Error reading projects file:", err);
      return res.status(500).json({ error: "Could not read projects." });
    }

    const projects = JSON.parse(data);
    projects.push({ name: name.trim(), description: description.trim() });

    fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2), (writeErr) => {
      if (writeErr) {
        console.error("Error saving project:", writeErr);
        return res.status(500).json({ error: "Could not save project." });
      }
      res.status(200).json({ success: "Project added!" });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});