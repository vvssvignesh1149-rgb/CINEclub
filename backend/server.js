const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Nodemailer transporter setup for cinenetclub@gmail.com
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'cinenetclub@gmail.com',
        pass: 'vfyt hooj qegx dgqs' // 16-digit App password ikkada ivvali
    }
});

// Temporary memory to store OTPs (or you can connect directly with Supabase)
let otpStorage = {};

// 1. Send OTP Route
app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStorage[email] = otp;

    const mailOptions = {
        from: 'cinenetclub@gmail.com',
        to: email,
        subject: 'CINENET Password Reset OTP',
        text: `Your 4-digit verification OTP for CINENET password reset is: ${otp}`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'OTP sent successfully to email!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to send email.' });
    }
});

// 2. Verify OTP Route
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (otpStorage[email] && otpStorage[email] === otp) {
        delete otpStorage[email]; // Clear OTP after success
        res.json({ success: true, message: 'OTP verified successfully!' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`CINENET Backend Server running on port ${PORT}`);
});