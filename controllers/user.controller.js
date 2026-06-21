const User = require('../models/user.model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const asyncHandler = require('../middleware/asyncHandler');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');
const SECRET = process.env.JWT_SECRET

const register = asyncHandler(async (req, res) => {
    const { name, age, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({ name, age, email, password: hashedPassword })
    await user.save()
    res.json({ message: "User registered!", data: user })
})

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
        return res.status(404).json({ message: "User পাওয়া যায়নি" })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
        return res.status(401).json({ message: "Password ভুল" })
    }

    const accessToken = generateAccessToken(user.email);
    const refreshToken = generateRefreshToken(user.email);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false,
        // sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
    res.json({ message: "Login successful!", accessToken })
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken;

    if (!token) {
        return res.status(401).json({ message: 'No refresh token' });
    }

    const decoded = jwt.verify(token, SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user || user.refreshToken !== token) {
        return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken(user.email);
    res.json({ accessToken: newAccessToken });
})

//logout 
const logout = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken;
    if (token) {
        await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: null })
        // res.clearCookie('refreshToken')
        // res.json({ message: "Logged out successfully" });
    }
    // Cookie clear করো
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
})

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find()
    res.json(users)
})

module.exports = { register, login, getAllUsers, refreshAccessToken, logout }