const rateLimiter = require('express-rate-limit')
const loginLimiter = rateLimiter({
    windowMs: 10 * 60 * 1000, // ১০ মিনিট
    max: 5,
    message: {
        error: "Too many try.please try again latter"
    }
})

const globalLimiter = rateLimiter({
    windowMs: 10 * 60 * 1000, // ১০ মিনিট
    max: 5,
    message: {
        error: "Too many try.please try again latter"
    }
})

module.exports = { loginLimiter, globalLimiter }