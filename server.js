require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken');

/* DB CONNECT */
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"));
console.log("MONGO URI:", process.env.MONGO_URI);

/* MODELS */
const Lead = mongoose.model("Lead", {
    name: String,
    email: String,
    phone: String,
    service: String,
    message: String,
    status: { type: String, default: "New" },
    createdAt: { type: Date, default: Date.now }
});



function authMiddleware(req, res, next) {

  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}


app.post('/api/login', (req, res) => {

    const { email, password } = req.body;

    // dummy login (test ke liye)
    if (email === "test@gmail.com" && password === "1234567890") {
        // 🔥 TOKEN GENERATE
        const token = jwt.sign(
            { email: email, role: "admin" }, // payload
            process.env.JWT_SECRET,          // secret key
            { expiresIn: "1d" }              // expiry
        );
        return res.json({
            success: true,
            token: token,
            user: { email }
        });
    }

    res.status(401).json({
        success: false,
        message: "Invalid credentials"
    });
});

/* SAVE LEAD */
app.post("/api/leads", async (req, res) => {
    //   const lead = new Lead(req.body);
    //   await lead.save();
    //   res.json({ success: true });

    const lead = req.body;

    // Save in DB (optional)

    // Send email
    transporter.sendMail({
        to: "test@gmail.com",
        subject: "New Lead Received",
        text: `Name: ${lead.name}, Phone: ${lead.phone}`
    });

    res.json({ success: true });
});

/* GET LEADS */
app.get("/api/leads", async (req, res) => {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
});

/* UPDATE STATUS */
app.put("/api/leads/:id", async (req, res) => {
    await Lead.findByIdAndUpdate(req.params.id, {
        status: req.body.status
    });
    res.json({ success: true });
});

app.post("/api/bookings", async (req, res) => {
    const booking = req.body;
    await Booking.create(booking);
    res.json({ success: true });
});

app.get("/api/bookings", async (req, res) => {
    const data = await Booking.find();
    res.json(data);
});
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;
    transporter.sendMail({
        from: email,
        to: process.env.EMAIL,
        subject: "New Contact Form",
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    }, (err, info) => {
        if (err) {
            console.log(err);
            return res.json({ success: false });
        }
        res.json({ success: true });
    });
});

app.get('/api/dashboard', authMiddleware, (req, res) => {
    res.json({
        message: "Welcome to dashboard",
        user: req.user
    });
});

app.listen(5000, () => console.log("Server running"));