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

// IP-based rate limit — general abuse prevention
const forgotPasswordLimiter = rateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3,                  // একই IP থেকে সর্বোচ্চ 3 বার
    message: "Too many requests. Please try again later.",
});


module.exports = { loginLimiter, globalLimiter, forgotPasswordLimiter }