const express = require("express");
const bcrypt = require("bcrypt");
const { UserModel } = require("../models/user");
const{sendOTP} =require("../utils/mailServices")
require("dotenv").config();
const jwt = require("jsonwebtoken");
const UserRoute = express.Router();

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Initial signup
UserRoute.post("/signup", async (req, res) => {
  const { name, email, password, mobile } = req.body;
  try {
    // Check for existing email and mobile
    const existingUser = await UserModel.findOne({
      $or: [{ email }, { mobile }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).send({ err: { error: "Email already exists" } });
      }
      if (existingUser.mobile === mobile) {
        return res.status(400).send({ err: { error: "Mobile number already exists" } });
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP expires in 10 minutes

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 5);

    // Create user with unverified status
    const user = new UserModel({
      name,
      email,
      password: hashedPassword,
      mobile,
      isVerified: false,
      otp: {
        code: otp,
        expiresAt: otpExpiry
      }
    });

    await user.save();

    // Send OTP
    await sendOTP(email, otp);

    res.status(201).send({ 
      msg: "Please check your email for verification code",
      email: email
    });

  } catch (err) {
    return res.status(500).send({ error: err.message });
  }
});

// Verify OTP
UserRoute.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).send({ err: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).send({ err: "Email already verified" });
    }

    if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
      return res.status(400).send({ err: "No OTP found. Please request a new one" });
    }

    if (new Date() > user.otp.expiresAt) {
      return res.status(400).send({ err: "OTP has expired" });
    }

    if (user.otp.code !== otp) {
      return res.status(400).send({ err: "Invalid OTP" });
    }

    // Verify user and remove OTP
    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    res.status(200).send({ msg: "Email verified successfully" });

  } catch (err) {
    return res.status(500).send({ error: err.message });
  }
});

// Resend OTP
UserRoute.post("/resend-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).send({ err: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).send({ err: "Email already verified" });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

    user.otp = {
      code: otp,
      expiresAt: otpExpiry
    };
    await user.save();

    // Send new OTP
    await sendOTP(email, otp);

    res.status(200).send({ msg: "New OTP sent successfully" });

  } catch (err) {
    return res.status(500).send({ error: err.message });
  }
});

// Login route (updated to check verification)
UserRoute.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    
    if (!user) {
      return res.status(404).send({ err: "Email not found" });
    }

    if (!user.isVerified) {
      return res.status(403).send({ err: "Please verify your email first" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).send({ err: "Incorrect password" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY);
    const { _id, name } = user;

    res.status(200).send({
      msg: "Login successful",
      user: { _id, name, email },
      token
    });

  } catch (err) {
    return res.status(500).send({ error: err.message });
  }
});

module.exports = { UserRoute };
