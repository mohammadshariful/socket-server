const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const { generateRowToken, hashToken } = require('../utils/verificationToken')
const { sendEmail } = require('../utils/sendEmail');
const asyncHandler = require('../middleware/asyncHandler');

const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;

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