require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const nodemailer = require('nodemailer');
const mongoose   = require('mongoose');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ─── MongoDB ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vss-enterprise')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── Schemas & Models ─────────────────────────────────────────────────────────
const testimonialSchema = new mongoose.Schema({
  customerName : { type: String, required: true },
  email        : { type: String, required: true },
  service      : { type: String, required: true },
  rating       : { type: Number, required: true, min: 1, max: 5 },
  message      : { type: String, required: true },
  createdAt    : { type: Date, default: Date.now }
});

const contactSchema = new mongoose.Schema({
  name      : { type: String, required: true },
  email     : { type: String, required: true },
  phone     : { type: String, required: true },
  service   : { type: String, required: true },
  message   : { type: String, required: true },
  createdAt : { type: Date, default: Date.now }
});

const Testimonial = mongoose.model('Testimonial', testimonialSchema);
const Contact     = mongoose.model('Contact', contactSchema);

// ─── Nodemailer Transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD   // Gmail App Password (not regular password)
  }
});

// Helper – send mail, log error but don't crash the request
async function sendMail(options) {
  try {
    await transporter.sendMail(options);
    console.log('📧 Email sent to', options.to);
  } catch (err) {
    console.error('❌ Email error:', err.message);
  }
}

// ─── HTML Email Templates ─────────────────────────────────────────────────────
function contactEmailHtml(d) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:0;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:28px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">🔔 नया संपर्क अनुरोध</h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">VSS Enterprises – Contact Form</p>
    </div>
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;color:#555;width:140px;font-weight:bold;">👤 नाम</td>       <td style="padding:10px 0;color:#222;">${d.name}</td></tr>
        <tr><td style="padding:10px 0;color:#555;font-weight:bold;">📧 ईमेल</td>     <td style="padding:10px 0;color:#222;">${d.email}</td></tr>
        <tr><td style="padding:10px 0;color:#555;font-weight:bold;">📱 फोन</td>      <td style="padding:10px 0;color:#222;">${d.phone}</td></tr>
        <tr><td style="padding:10px 0;color:#555;font-weight:bold;">🔧 सेवा</td>     <td style="padding:10px 0;color:#222;">${d.service}</td></tr>
        <tr><td style="padding:10px 0;color:#555;font-weight:bold;vertical-align:top;">💬 संदेश</td><td style="padding:10px 0;color:#222;">${d.message}</td></tr>
      </table>
    </div>
    <div style="background:#f0f0ff;padding:16px 32px;font-size:12px;color:#888;text-align:center;">
      📍 VSS Enterprises | vss.electricsenterprises@gmail.com
    </div>
  </div>`;
}

function testimonialEmailHtml(d) {
  const stars = '⭐'.repeat(d.rating);
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:0;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:28px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">⭐ नई प्रतिक्रिया / समीक्षा</h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">VSS Enterprises – Testimonial Form</p>
    </div>
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;color:#555;width:180px;font-weight:bold;">👤 ग्राहक का नाम</td><td style="padding:10px 0;color:#222;">${d.customerName}</td></tr>
        <tr><td style="padding:10px 0;color:#555;font-weight:bold;">📧 ईमेल</td>                   <td style="padding:10px 0;color:#222;">${d.email}</td></tr>
        <tr><td style="padding:10px 0;color:#555;font-weight:bold;">🔧 सेवा</td>                   <td style="padding:10px 0;color:#222;">${d.service}</td></tr>
        <tr><td style="padding:10px 0;color:#555;font-weight:bold;">⭐ रेटिंग</td>                 <td style="padding:10px 0;color:#222;">${stars} (${d.rating}/5)</td></tr>
        <tr><td style="padding:10px 0;color:#555;font-weight:bold;vertical-align:top;">💬 समीक्षा</td><td style="padding:10px 0;color:#222;">${d.message}</td></tr>
      </table>
    </div>
    <div style="background:#f0f0ff;padding:16px 32px;font-size:12px;color:#888;text-align:center;">
      📍 VSS Enterprises | vss.electricsenterprises@gmail.com
    </div>
  </div>`;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// POST /api/contact  – contact form submission
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body;
    if (!name || !email || !phone || !service || !message)
      return res.status(400).json({ success: false, message: 'All fields are required.' });

    // Save to MongoDB
    await new Contact({ name, email, phone, service, message }).save();

    // Email to admin (in Hindi)
    await sendMail({
      from    : `"VSS Enterprises" <${process.env.EMAIL}>`,
      to      : process.env.ADMIN_EMAIL || process.env.EMAIL,
      subject : '🔔 नया संपर्क अनुरोध – VSS Enterprises',
      html    : contactEmailHtml({ name, email, phone, service, message })
    });

    // Confirmation email to user (in English)
    await sendMail({
      from    : `"VSS Enterprises" <${process.env.EMAIL}>`,
      to      : email,
      subject : 'We received your message – VSS Enterprises',
      html    : `<p>Dear <strong>${name}</strong>,<br><br>Thank you for reaching out! We have received your message and will contact you within 24 hours.<br><br>Best regards,<br><strong>VSS Enterprises Team</strong></p>`
    });

    res.json({ success: true, message: 'Thank you! Your message has been received. We will contact you soon!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// POST /api/feedback  – feedback form submission
app.post('/api/feedback', async (req, res) => {
  try {
    const { customerName, email, service, rating, message } = req.body;
    if (!customerName || !email || !service || !rating || !message)
      return res.status(400).json({ success: false, message: 'All fields are required.' });

    // Save to MongoDB
    await new Testimonial({ customerName, email, service, rating, message }).save();

    // Email to admin (in Hindi)
    await sendMail({
      from    : `"VSS Enterprises" <${process.env.EMAIL}>`,
      to      : process.env.ADMIN_EMAIL || process.env.EMAIL,
      subject : '⭐ नई प्रतिक्रिया प्राप्त हुई – VSS Enterprises',
      html    : testimonialEmailHtml({ customerName, email, service, rating, message })
    });

    res.json({ success: true, message: 'Thank you for your feedback!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// POST /api/testimonial  – testimonial form on home page
app.post('/api/testimonial', async (req, res) => {
  try {
    const { customerName, email, service, rating, message } = req.body;
    if (!customerName || !email || !service || !rating || !message)
      return res.status(400).json({ success: false, message: 'All fields are required.' });

    const saved = await new Testimonial({ customerName, email, service, rating, message }).save();

    // Email to admin (in Hindi)
    await sendMail({
      from    : `"VSS Enterprises" <${process.env.EMAIL}>`,
      to      : process.env.ADMIN_EMAIL || process.env.EMAIL,
      subject : '⭐ नई समीक्षा प्राप्त हुई – VSS Enterprises',
      html    : testimonialEmailHtml({ customerName, email, service, rating, message })
    });

    res.json({ success: true, message: 'Thank you! Your testimonial has been submitted.', data: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// GET /api/testimonials  – fetch all for testimonials page
app.get('/api/testimonials', async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json({ success: true, data: testimonials });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── Admin Login ──────────────────────────────────────────────────────────────
const ADMIN = {
  email    : process.env.ADMIN_EMAIL || process.env.EMAIL || 'admin@vss.com',
  password : bcrypt.hashSync(process.env.ADMIN_PASSWORD || '123456', 8)
};

app.post('/api/login', (req, res) => {
  if (req.body.email !== ADMIN.email)
    return res.status(401).json({ message: 'Invalid email.' });
  if (!bcrypt.compareSync(req.body.password, ADMIN.password))
    return res.status(401).json({ message: 'Wrong password.' });

  const token = jwt.sign({ email: ADMIN.email }, process.env.JWT_SECRET || 'SECRET', { expiresIn: '1d' });
  res.json({ token });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀 VSS API running on http://localhost:${PORT}`));
