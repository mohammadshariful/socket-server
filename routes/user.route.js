const express = require('express')
const router = express.Router()
const { getAllUsers, login, register, refreshAccessToken, logout } = require('../controllers/user.controller')
const { signup, resetPassword, verifyEmail, forgotPassword } = require('../controllers/auth.controller')
const { authMiddleware } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');
const { loginLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');


const registerValidation = [
    body('name').notEmpty().withMessage('Name must be required'),
    body('password').isLength({ min: 6 }).withMessage('password length minimum 6 character'),
    body('email').isEmail().withMessage('Email must be valid')
]

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }
    next()
}

router.post('/register', registerValidation, validate, signup)
router.post('/login', loginLimiter, login)
router.post('/refresh-token', refreshAccessToken)
router.post('/logout', logout)
router.get('/users', authMiddleware, getAllUsers)

router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router