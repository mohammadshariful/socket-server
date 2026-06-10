const express = require('express')
const mongoose = require('mongoose')
require('dotenv').config()
const cors = require('cors')
const helmet = require('helmet')

const app = express()


app.use(helmet())
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

const userRouter = require('./routes/user.route')
app.use('/api', userRouter);


app.use((error, req, res, next) => {
    console.error(error.stack)
    res.status(error.status || 500).json({
        error: error.message || "Internal server error  "
    })
})

mongoose.connect('mongodb://localhost:27017/myapp')
    .then(() => console.log('Database connected!'))
    .catch(err => console.log('Error', err))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`server running on : http://localhost:${PORT}`)
})