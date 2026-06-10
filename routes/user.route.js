const express = require('express')
const router = express.Router()
const { getAllUsers, login, register } = require('../controllers/user.controller')
const { authMiddleware } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');
const { loginLimiter } = require('../middleware/rateLimiter');


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

router.post('/register', registerValidation, validate, register)
router.post('/login', loginLimiter, login)
router.get('/users', authMiddleware, getAllUsers)

module.exports = router