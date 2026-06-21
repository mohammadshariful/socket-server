const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name: String,
    password: String,
    email: String,
    age: Number,
    refreshToken: {
        type: String,
        default: null
    }
})
module.exports = mongoose.model('User', userSchema)