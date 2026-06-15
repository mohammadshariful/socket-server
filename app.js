const express = require('express')
const mongoose = require('mongoose')
require('dotenv').config()
const cors = require('cors')
const helmet = require('helmet')
const dns = require('dns')

dns.setServers(['8.8.8.8', '1.1.1.1']);
// console.log(dns.getDefaultResultOrder(), ': dns resolver name');

const app = express()


app.use(helmet())
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

const userRouter = require('./routes/user.route')
app.use('/api', userRouter);
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Socket server is running 🚀'
    });
});

app.use((error, req, res, next) => {
    console.error(error.stack)
    res.status(error.status || 500).json({
        error: error.message || "Internal server error  "
    })
})

const PORT = process.env.PORT || 3000
const MONGO_URI = process.env.MONGO_URI || `mongodb://127.0.0.1:27017/myapp`

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("✅ Connected to MongoDB")

        app.listen(PORT, () => {
            console.log(`server running on : PORT:${PORT}`)
        })
    })
    .catch(err => console.error("❌ Error:", err));


