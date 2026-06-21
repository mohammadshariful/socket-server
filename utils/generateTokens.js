const jwt = require('jsonwebtoken')

const generateAccessToken = (email) => {
    return jwt.sign(
        { email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    )

}


const generateRefreshToken = (email) => {
    return jwt.sign(
        { email },
        process.env.JWT_SECRET,
        { expiresIn: '2d' }
    )

}

module.exports = {
    generateAccessToken,
    generateRefreshToken
}