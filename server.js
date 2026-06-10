const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
require('dotenv').config()

// ─── App Setup ────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const SECRET = 'mySecretKey123'
// ─── Socket.IO Setup ─────────────────────────────────────────
const io = new Server(server, {
    cors: {
        origin: "*",          // Production-এ নির্দিষ্ট origin দিবে
        methods: ["GET", "POST"],
    },
});

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
//database connection

mongoose.connect('mongodb://localhost:27017/myapp')
    .then(() => console.log("Database connected!"))
    .catch((err) => console.log("Error:", err))
//create schema
const userSchema = new mongoose.Schema({
    name: String,
    age: Number,
    password: String,
    email: String
})

const User = mongoose.model("User", userSchema)
//middleware
// app.use((req, res, next) => {
//     console.log(`${req.method} ${req.url} - ${new Date().toLocaleTimeString()}`)
//     next()
// })

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: 'access denied' })
    }
    try {
        const decode = jwt.verify(token, SECRET);
        req.user = decode
        next()
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'token expired' })
        }
        return res.status(401).json({ message: 'invalid token' })
    }
}

// ─── REST Endpoints ───────────────────────────────────────────
app.get("/", (req, res) => {
    res.json({ message: "Socket.IO Server চলছে ✅", status: "ok" });
});

app.get('/users', authMiddleware, async (req, res) => {
    const users = await User.find()
    res.json(users)

})

app.post('/users', async (req, res) => {
    const user = new User(req.body)
    await user.save()
    res.json({ message: "User save হয়েছে!", data: user })
})

app.delete('/users/:id', async (req, res) => {
    await User.findByIdAndDelete(req.params.id)
    res.json({ message: 'user delete successful' })
})

app.put('/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { returnDocument: 'after' }

        )
        res.json({ message: "User update হয়েছে!", data: user })
    } catch (error) {
        res.status(500).json({ message: 'internal server error' })
    }
})
//get a single user
app.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'user not found' })
        }
        res.json({ message: 'user found successful', data: user })

    } catch (error) {
        res.status(500).json({ message: 'internal server error' })

    }
})
//jwt
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(401).json({ message: 'email or password must be provide.' })
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'user does not exist in system' })
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'password not match' })
        }
        const token = jwt.sign({ email }, SECRET, { expiresIn: '1h' })
        res.json({ message: 'user successful login', token })
    } catch (error) {
        res.status(500).json({ message: 'Internal server Error' })
    }
})

app.post('/register', async (req, res) => {
    try {
        const { password, name, age, email } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ password: hashedPassword, age, name, email });
        await user.save();
        res.json({ message: 'user registered', data: user })

    } catch (error) {
        res.status(500).json({ message: 'Inter server error' })

    }
})

// Online users ট্র্যাক করার জন্য
const onlineUsers = new Map(); // socketId → username

// ─── Socket.IO Events ─────────────────────────────────────────
io.on("connection", (socket) => {
    console.log(`🟢 নতুন connection: ${socket.id}`);

    // ── 1. User Join ──────────────────────────────────────────
    socket.on("user:join", (username) => {
        onlineUsers.set(socket.id, username);
        console.log(`👤 ${username} join করেছে`);

        // সবাইকে জানাও
        io.emit("user:list", Array.from(onlineUsers.values()));
        socket.broadcast.emit("notification", {
            type: "join",
            message: `${username} চ্যাটে যোগ দিয়েছে`,
        });
    });

    // ── 2. Message Send ───────────────────────────────────────
    socket.on("message:send", (data) => {
        const username = onlineUsers.get(socket.id) || "Anonymous";
        const payload = {
            id: Date.now(),
            username,
            text: data.text,
            timestamp: new Date().toISOString(),
        };

        console.log(`💬 [${username}]: ${data.text}`);

        // সবার কাছে message পাঠাও (sender সহ)
        io.emit("message:receive", payload);
    });

    // ── 3. Private Message ────────────────────────────────────
    socket.on("message:private", ({ toSocketId, text }) => {
        const fromUsername = onlineUsers.get(socket.id) || "Anonymous";
        socket.to(toSocketId).emit("message:private", {
            from: fromUsername,
            text,
            timestamp: new Date().toISOString(),
        });
    });

    // ── 4. Typing Indicator ───────────────────────────────────
    socket.on("typing:start", () => {
        const username = onlineUsers.get(socket.id);
        socket.broadcast.emit("typing:update", { username, isTyping: true });
    });

    socket.on("typing:stop", () => {
        const username = onlineUsers.get(socket.id);
        socket.broadcast.emit("typing:update", { username, isTyping: false });
    });

    // ── 5. Disconnect ─────────────────────────────────────────
    socket.on("disconnect", () => {
        const username = onlineUsers.get(socket.id);
        onlineUsers.delete(socket.id);
        console.log(`🔴 Disconnected: ${username || socket.id}`);

        io.emit("user:list", Array.from(onlineUsers.values()));
        if (username) {
            io.emit("notification", {
                type: "leave",
                message: `${username} চ্যাট ছেড়ে গেছে`,
            });
        }
    });
});

// ─── Server Start ─────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`\n🚀 Server চলছে → http://localhost:${PORT}`);
    console.log(`📡 Socket.IO ready\n`);
});