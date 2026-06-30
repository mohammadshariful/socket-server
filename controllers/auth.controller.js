const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const { generateRowToken, hashToken } = require('../utils/verificationToken')
const { sendEmail } = require('../utils/sendEmail');
const asyncHandler = require('../middleware/asyncHandler');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');

const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000

exports.signup = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.isVerified) {
        throw new Error('User already exists and is verified');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const rawToken = generateRowToken();
    const tokenHash = hashToken(rawToken);
    const expireAt = new Date(Date.now() + VERIFICATION_EXPIRY_MS);

    let user;

    if (existingUser && !existingUser.isVerified) {
        existingUser.password = hashedPassword;
        existingUser.verificationTokenHash = tokenHash;
        existingUser.verificationTokenExpireAt = expireAt;
        existingUser.lastVerificationSentAt = new Date();
        user = await existingUser.save();
    } else {
        user = await User.create({
            email,
            password: hashedPassword,
            verificationTokenHash: tokenHash,
            verificationTokenExpireAt: expireAt,
            lastVerificationSentAt: new Date()
        });
    }

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}&email=${email}`;

    await sendEmail({
        to: user.email,
        subject: "Verify your email",
        html: `
      <h2>Email verification</h2>
      <p>Click the link below to verify your email:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 24 hours.</p>
    `,
    });

    res.status(201).json({
        message: "Signup successful. Please check your email to verify your account.",
    });

})


exports.verifyEmail = asyncHandler(async (req, res) => {

    const { token, email } = req.body;
    if (!token || !email) {
        throw new Error('Token and email are required');
    }
    const tokenHash = hashToken(token);
    const user = await User.findOne({ email, verificationTokenHash: tokenHash, verificationTokenExpireAt: { $gt: new Date() } });


    if (!user) {
        const maybeVerified = await User.findOne({ email, isVerified: true })

        if (maybeVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }
        throw new Error("Invalid or expired verification link");
    }

    user.isVerified = true;
    user.verificationTokenHash = null;
    user.verificationTokenExpireAt = null;
    await user.save();
    res.status(200).json({ message: "Email verified successfully" });
})

//forgot password
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const genericMessage = {
        message: "If an account with that email exists, a password reset link has been sent."
    }

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(200).json(genericMessage);
    }

    const rawToken = generateRowToken();
    user.resetPasswordTokenHash = hashToken(rawToken);
    user.resetPasswordTokenExpire = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}&email=${email}`;

    await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 15 minutes.</p>
    `,
    });

    res.status(200).json(genericMessage);

})


//reset password
exports.resetPassword = asyncHandler(async (req, res) => {
    const { token, email, newPassword } = req.body;
    if (!token || !email || !newPassword) {
        throw new Error('Token, email, and new password are required');
    }

    const tokenHash = hashToken(token);
    const user = await User.findOne({ email, resetPasswordTokenHash: tokenHash, resetPasswordTokenExpire: { $gt: new Date() } });

    if (!user) {
        throw new Error("Invalid or expired password reset link");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordTokenHash = null;
    user.resetPasswordTokenExpire = null;


    const newAccessToken = generateAccessToken(user.email);
    const newRefreshToken = generateRefreshToken(user.email);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        // secure: true,
        // sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,


    })
    res.status(200).json({
        message: "Password reset successful",
        accessToken: newAccessToken
    });
})