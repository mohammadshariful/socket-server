const jwt = require('jsonwebtoken')
const SECRET = process.env.JWT_SECRET

const authMiddleware = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).json({ message: 'access denied' })
    }

    try {
        const token = authorization.split(' ')[1];
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