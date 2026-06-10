const User = require('../models/user.model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const asyncHandler = require('../middleware/asyncHandler')
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
    const token = jwt.sign({ email }, SECRET, { expiresIn: '1h' })
    res.json({ message: "Login successful!", token })
})

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find()
    res.json(users)
})

module.exports = { register, login, getAllUsers }