const jwt = require('jsonwebtoken')
const SECRET = process.env.JWT_SECRET

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: 'access denied' })
    }

    try {
        const decode = jwt.verify(token, SECRET)
        req.user = decode;
        next()

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'token expired' })
        }
        return res.status(401).json({ message: 'invalid token' })

    }

}
module.exports = { authMiddleware }