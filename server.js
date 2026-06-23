const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');
const { OpenAI } = require('openai');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

// =============================================
// 🔥 FIREBASE INITIALIZATION
// =============================================
let db;

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️ Firebase already initialized, using existing app');
}

db = admin.firestore();

// =============================================
// ☁️ CLOUDINARY CONFIGURATION
// =============================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// =============================================
// 🤖 OPENAI CONFIGURATION
// =============================================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// =============================================
// 📧 EMAIL CONFIGURATION - IMPROVED
// =============================================
const LOGO_URL = 'https://i.postimg.cc/KY95Xr8R/Dr-Mirna.jpg';
const PHARMACY_NAME = 'صيدلية د/ميرنا صفوت';
const PHARMACY_PHONE = process.env.PHARMACY_PHONE || '+20123456789';
const PHARMACY_EMAIL = process.env.SMTP_USER || 'info@drmirnapharmacy.com';
const PHARMACY_ADDRESS = process.env.PHARMACY_ADDRESS || 'مصر - القاهرة';

let transporter;
try {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  console.log('✅ Email transporter configured successfully');
} catch (error) {
  console.error('❌ Email transporter error:', error.message);
  transporter = null;
}

// =============================================
// 🎨 EMAIL TEMPLATE FUNCTION
// =============================================
const buildEmailTemplate = (title, content, buttonText, buttonLink, extraInfo) => {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
          background: #f0f4f8;
          direction: rtl;
          padding: 20px;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.12);
          border: 1px solid rgba(102, 126, 234, 0.15);
        }
        .email-header {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          padding: 30px 30px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .email-header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          right: -50%;
          bottom: -50%;
          background: radial-gradient(circle at 30% 50%, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .email-header .logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          position: relative;
          z-index: 1;
        }
        .email-header .logo-container img {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.3);
          box-shadow: 0 8px 25px rgba(0,0,0,0.3);
          object-fit: cover;
        }
        .email-header .logo-container .pharmacy-name {
          color: #ffffff;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 1px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .email-header .logo-container .pharmacy-name span {
          color: #667eea;
        }
        .email-header .sub-title {
          color: rgba(255,255,255,0.6);
          font-size: 13px;
          margin-top: 5px;
          position: relative;
          z-index: 1;
        }
        .email-body {
          padding: 35px 35px 25px;
          background: #ffffff;
        }
        .email-body .greeting {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 10px;
        }
        .email-body .greeting .highlight {
          color: #667eea;
        }
        .email-body .message-content {
          color: #444466;
          line-height: 1.8;
          font-size: 15px;
          margin: 15px 0 20px;
        }
        .email-body .message-content p {
          margin-bottom: 12px;
        }
        .email-body .message-content strong {
          color: #1a1a2e;
        }
        .email-body .info-box {
          background: #f8f9ff;
          border-radius: 16px;
          padding: 20px 25px;
          margin: 20px 0;
          border-right: 4px solid #667eea;
          border-left: 4px solid #667eea;
        }
        .email-body .info-box .info-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid rgba(102, 126, 234, 0.1);
          font-size: 14px;
        }
        .email-body .info-box .info-item:last-child {
          border-bottom: none;
        }
        .email-body .info-box .info-item .label {
          color: #8888aa;
          font-weight: 500;
        }
        .email-body .info-box .info-item .value {
          color: #1a1a2e;
          font-weight: 600;
        }
        .email-body .btn-container {
          text-align: center;
          margin: 25px 0 15px;
        }
        .email-body .btn-container .btn {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 45px;
          border-radius: 50px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s;
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.35);
        }
        .email-body .btn-container .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(102, 126, 234, 0.45);
        }
        .email-body .extra-info {
          background: #f0f4ff;
          border-radius: 12px;
          padding: 15px 20px;
          margin: 15px 0;
          font-size: 14px;
          color: #444466;
          border: 1px dashed rgba(102, 126, 234, 0.3);
        }
        .email-body .extra-info .emoji {
          font-size: 18px;
          margin-left: 8px;
        }
        .email-footer {
          background: #f8f9fa;
          padding: 20px 35px;
          text-align: center;
          border-top: 1px solid #eef0f5;
        }
        .email-footer .footer-text {
          color: #8888aa;
          font-size: 13px;
          line-height: 1.6;
        }
        .email-footer .footer-text strong {
          color: #667eea;
        }
        .email-footer .social-links {
          margin-top: 12px;
          display: flex;
          justify-content: center;
          gap: 15px;
        }
        .email-footer .social-links a {
          color: #8888aa;
          text-decoration: none;
          font-size: 20px;
          transition: color 0.3s;
        }
        .email-footer .social-links a:hover {
          color: #667eea;
        }
        .email-footer .footer-divider {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, #667eea, #764ba2);
          margin: 10px auto;
          border-radius: 2px;
        }
        .email-footer .disclaimer {
          font-size: 11px;
          color: #aaaacc;
          margin-top: 10px;
        }
        @media (max-width: 480px) {
          .email-body { padding: 20px; }
          .email-header .logo-container .pharmacy-name { font-size: 17px; }
          .email-header .logo-container img { width: 55px; height: 55px; }
          .email-body .btn-container .btn { padding: 12px 30px; font-size: 14px; }
          .email-body .info-box { padding: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="email-header">
          <div class="logo-container">
            <img src="${LOGO_URL}" alt="${PHARMACY_NAME}">
            <div>
              <div class="pharmacy-name">${PHARMACY_NAME}</div>
              <div class="sub-title">🩺 ${PHARMACY_ADDRESS}</div>
            </div>
          </div>
        </div>
        
        <!-- Body -->
        <div class="email-body">
          <div class="greeting">
            👋 مرحباً، <span class="highlight">عميلنا العزيز</span>
          </div>
          
          <div class="message-content">
            ${content}
          </div>
          
          ${extraInfo ? `<div class="extra-info">${extraInfo}</div>` : ''}
          
          ${buttonText && buttonLink ? `
            <div class="btn-container">
              <a href="${buttonLink}" class="btn">${buttonText}</a>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 20px; font-size: 13px; color: #8888aa;">
            <span>📞 ${PHARMACY_PHONE}</span>
            <span style="margin: 0 10px;">|</span>
            <span>✉️ ${PHARMACY_EMAIL}</span>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="email-footer">
          <div class="footer-divider"></div>
          <div class="footer-text">
            <strong>${PHARMACY_NAME}</strong> — 🏥 صحتك تهمنا
          </div>
          <div class="footer-text" style="font-size: 12px;">
            ${PHARMACY_ADDRESS} · ${PHARMACY_PHONE}
          </div>
          <div class="disclaimer">
            © ${new Date().getFullYear()} ${PHARMACY_NAME}. جميع الحقوق محفوظة.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// =============================================
// 📧 SEND EMAIL FUNCTION (IMPROVED)
// =============================================
const sendEmail = async (to, subject, title, content, buttonText = null, buttonLink = null, extraInfo = null) => {
  if (!transporter) {
    console.log('⚠️ Email disabled: transporter not configured');
    return false;
  }
  
  try {
    const html = buildEmailTemplate(title, content, buttonText, buttonLink, extraInfo);
    
    await transporter.sendMail({
      from: `"${PHARMACY_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: `🩺 ${subject}`,
      html: html
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
};

// =============================================
// 📱 TELEGRAM HELPER
// =============================================
const sendTelegram = async (message) => {
  try {
    await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    return true;
  } catch (error) {
    console.error('Telegram error:', error);
    return false;
  }
};

// =============================================
// 🔐 JWT MIDDLEWARE
// =============================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// =============================================
// 🔢 HELPER FUNCTIONS
// =============================================
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// =============================================
// 🚀 MIDDLEWARE
// =============================================
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// =============================================
// 🔐 ADMIN LOGIN
// =============================================
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const usersSnapshot = await db.collection('users')
      .where('email', '==', process.env.ADMIN_EMAIL)
      .get();

    let userData;
    let userId;

    if (usersSnapshot.empty) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      const newAdmin = {
        fullName: 'Admin',
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        accountName: 'Admin',
        username: process.env.ADMIN_USERNAME,
        createdAt: new Date().toISOString(),
        isActive: true
      };
      const docRef = await db.collection('users').add(newAdmin);
      userId = docRef.id;
      userData = newAdmin;
    } else {
      const doc = usersSnapshot.docs[0];
      userId = doc.id;
      userData = doc.data();
    }

    const token = jwt.sign(
      { 
        userId: userId, 
        email: userData.email, 
        role: 'admin',
        fullName: userData.fullName 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({ 
      token, 
      user: {
        id: userId,
        fullName: userData.fullName,
        email: userData.email,
        role: 'admin',
        accountName: userData.accountName || userData.fullName
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// 👤 USER AUTH ROUTES
// =============================================
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .get();

    if (!usersSnapshot.empty) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      fullName,
      email,
      password: hashedPassword,
      role: 'user',
      accountName: fullName,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    const docRef = await db.collection('users').add(userData);

    // Send welcome email with nice template
    await sendEmail(
      email,
      'مرحباً بك في صيدليتنا',
      `مرحباً بك في ${PHARMACY_NAME}`,
      `
        <p>نشكرك على ثقتك واختيارك <strong>${PHARMACY_NAME}</strong>.</p>
        <p>تم إنشاء حسابك بنجاح، ونحن في خدمتك دائماً.</p>
        <p>يمكنك الآن تصفح منتجاتنا وطلب ما تحتاجه بكل سهولة.</p>
        <p>💊 <strong>نتمنى لك دوام الصحة والعافية</strong></p>
      `,
      'تصفح المنتجات',
      'https://drmirnapharmacy.com'
    );

    await sendTelegram(`🆕 New User Registration\n\nName: ${fullName}\nEmail: ${email}\nRole: User`);

    await db.collection('auditLogs').add({
      adminName: 'System',
      action: 'User Registration',
      date: new Date().toISOString(),
      ip: req.ip,
      recordId: docRef.id
    });

    res.status(201).json({ 
      message: 'User created successfully',
      userId: docRef.id 
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .get();

    if (usersSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    if (!userData.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    const validPassword = await bcrypt.compare(password, userData.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        userId: userDoc.id, 
        email: userData.email, 
        role: userData.role,
        fullName: userData.fullName 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({ 
      token, 
      user: {
        id: userDoc.id,
        fullName: userData.fullName,
        email: userData.email,
        role: userData.role,
        accountName: userData.accountName || userData.fullName
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .get();

    if (usersSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = usersSnapshot.docs[0];
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await db.collection('resetTokens').add({
      userId: userDoc.id,
      email: email,
      otp: otp,
      expiresAt: expiresAt.toISOString(),
      used: false
    });

    await sendEmail(
      email,
      '🔐 إعادة تعيين كلمة المرور',
      `إعادة تعيين كلمة المرور - ${PHARMACY_NAME}`,
      `
        <p>لقد طلبت إعادة تعيين كلمة المرور لحسابك في <strong>${PHARMACY_NAME}</strong>.</p>
        <p>🔑 <strong>رمز التحقق الخاص بك هو:</strong></p>
      `,
      'نسخ الرمز',
      '#',
      `
        <div style="font-size: 32px; text-align: center; font-weight: 700; color: #667eea; letter-spacing: 5px; padding: 10px 0;">
          ${otp}
        </div>
        <p style="text-align: center; font-size: 13px; color: #8888aa;">⏳ هذا الرمز صالح لمدة 2 دقيقة</p>
        <p style="text-align: center; font-size: 13px; color: #8888aa;">إذا لم تطلب إعادة التعيين، يرجى تجاهل هذه الرسالة</p>
      `
    );

    res.json({ message: 'OTP sent to your email' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const tokensSnapshot = await db.collection('resetTokens')
      .where('email', '==', email)
      .where('otp', '==', otp)
      .where('used', '==', false)
      .get();

    if (tokensSnapshot.empty) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const tokenDoc = tokensSnapshot.docs[0];
    const tokenData = tokenDoc.data();

    if (new Date(tokenData.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .get();

    if (usersSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = usersSnapshot.docs[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userDoc.ref.update({
      password: hashedPassword,
      updatedAt: new Date().toISOString()
    });

    await tokenDoc.ref.update({ used: true });

    // Send confirmation email
    await sendEmail(
      email,
      '✅ تم إعادة تعيين كلمة المرور',
      `تم إعادة تعيين كلمة المرور - ${PHARMACY_NAME}`,
      `
        <p>تم إعادة تعيين كلمة المرور لحسابك في <strong>${PHARMACY_NAME}</strong> بنجاح.</p>
        <p>🔐 إذا لم تقم بهذا الإجراء، يرجى التواصل معنا فوراً.</p>
        <p>💚 نتمنى لك تجربة طيبة معنا.</p>
      `
    );

    await db.collection('auditLogs').add({
      adminName: userDoc.data().fullName,
      action: 'Password Reset',
      date: new Date().toISOString(),
      ip: req.ip,
      recordId: userDoc.id
    });

    res.json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// 👤 USER PROFILE
// =============================================
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    res.json({
      id: userDoc.id,
      fullName: userData.fullName,
      email: userData.email,
      role: userData.role,
      accountName: userData.accountName || userData.fullName
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// 💊 MEDICINE ROUTES
// =============================================
app.post('/api/medicines', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, category, price, stock, description, image } = req.body;

    if (!name || !price || !stock) {
      return res.status(400).json({ error: 'Name, price, and stock are required' });
    }

    let imageUrl = null;
    if (image) {
      const uploadResult = await cloudinary.uploader.upload(image, {
        folder: 'pharmacy/medicines'
      });
      imageUrl = uploadResult.secure_url;
    }

    const medicineData = {
      name,
      category: category || 'General',
      price: parseFloat(price),
      stock: parseInt(stock),
      description: description || '',
      imageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('medicines').add(medicineData);

    await db.collection('auditLogs').add({
      adminName: req.user.fullName,
      action: 'Medicine Added',
      date: new Date().toISOString(),
      ip: req.ip,
      recordId: docRef.id
    });

    res.status(201).json({ 
      message: 'Medicine added successfully',
      id: docRef.id,
      ...medicineData
    });

  } catch (error) {
    console.error('Add medicine error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/medicines', authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection('medicines')
      .orderBy('createdAt', 'desc')
      .get();

    const medicines = [];
    snapshot.forEach(doc => {
      medicines.push({ id: doc.id, ...doc.data() });
    });

    res.json(medicines);

  } catch (error) {
    console.error('Get medicines error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/medicines/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, stock, description, image } = req.body;

    const medicineRef = db.collection('medicines').doc(id);
    const doc = await medicineRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    let updateData = {
      name: name || doc.data().name,
      category: category || doc.data().category,
      price: price ? parseFloat(price) : doc.data().price,
      stock: stock ? parseInt(stock) : doc.data().stock,
      description: description || doc.data().description,
      updatedAt: new Date().toISOString()
    };

    if (image) {
      const uploadResult = await cloudinary.uploader.upload(image, {
        folder: 'pharmacy/medicines'
      });
      updateData.imageUrl = uploadResult.secure_url;
    }

    await medicineRef.update(updateData);

    await db.collection('auditLogs').add({
      adminName: req.user.fullName,
      action: 'Medicine Updated',
      date: new Date().toISOString(),
      ip: req.ip,
      recordId: id
    });

    res.json({ message: 'Medicine updated successfully' });

  } catch (error) {
    console.error('Update medicine error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/medicines/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const medicineRef = db.collection('medicines').doc(id);
    const doc = await medicineRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    await medicineRef.delete();

    await db.collection('auditLogs').add({
      adminName: req.user.fullName,
      action: 'Medicine Deleted',
      date: new Date().toISOString(),
      ip: req.ip,
      recordId: id
    });

    res.json({ message: 'Medicine deleted successfully' });

  } catch (error) {
    console.error('Delete medicine error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// 📦 ORDERS ROUTES
// =============================================
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { 
      orderType, 
      items, 
      totalAmount, 
      paymentMethod, 
      transactionId,
      customerName,
      customerEmail,
      customerPhone,
      deliveryAddress,
      specialInstructions
    } = req.body;

    const orderData = {
      userId: req.user.userId,
      userEmail: req.user.email,
      userAccountName: req.user.fullName,
      orderType: orderType || 'medicine',
      items: items || [],
      totalAmount: parseFloat(totalAmount) || 0,
      paymentMethod: paymentMethod || 'pending',
      transactionId: transactionId || '',
      status: 'pending',
      customerName: customerName || req.user.fullName,
      customerEmail: customerEmail || req.user.email,
      customerPhone: customerPhone || '',
      deliveryAddress: deliveryAddress || '',
      specialInstructions: specialInstructions || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('orders').add(orderData);

    const isMatch = transactionId === (process.env.PAYMENT_REFERENCE_NUMBER || '');
    const aiResult = {
      status: isMatch ? 'AI Passed' : 'AI Failed',
      message: isMatch ? 'Payment verified automatically' : 'Payment verification failed'
    };

    await docRef.update({
      aiVerification: aiResult,
      aiVerifiedAt: new Date().toISOString()
    });

    // Send order confirmation email
    await sendEmail(
      orderData.customerEmail,
      '📋 تأكيد الطلب',
      `تأكيد الطلب #${docRef.id.substring(0, 8)}`,
      `
        <p>شكراً لك على طلبك من <strong>${PHARMACY_NAME}</strong>.</p>
        <p>📦 <strong>تفاصيل الطلب:</strong></p>
        <div class="info-box">
          ${items.map(item => `
            <div class="info-item">
              <span class="label">${item.name}</span>
              <span class="value">${item.quantity} × ${item.price} جنيه = ${item.quantity * item.price} جنيه</span>
            </div>
          `).join('')}
          <div class="info-item" style="border-top: 2px solid #667eea; margin-top: 8px; padding-top: 8px;">
            <span class="label"><strong>الإجمالي</strong></span>
            <span class="value"><strong>${orderData.totalAmount} جنيه</strong></span>
          </div>
        </div>
        <p>📌 حالة الطلب: <strong>قيد المراجعة</strong></p>
        <p>سنقوم بإعلامك عند الموافقة على الطلب.</p>
      `,
      'متابعة الطلب',
      'https://drmirnapharmacy.com/orders'
    );

    await sendTelegram(
      `🛒 New Order Created\n\n` +
      `Order ID: ${docRef.id}\n` +
      `Type: ${orderType}\n` +
      `Customer: ${req.user.fullName}\n` +
      `Total: ${orderData.totalAmount} جنيه\n` +
      `AI Status: ${aiResult.status}\n` +
      `Status: Pending`
    );

    res.status(201).json({ 
      message: 'Order created successfully',
      orderId: docRef.id,
      aiVerification: aiResult,
      ...orderData
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    let query = db.collection('orders').orderBy('createdAt', 'desc');
    
    if (req.user.role !== 'admin') {
      query = query.where('userId', '==', req.user.userId);
    }

    const snapshot = await query.get();
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    res.json(orders);

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/orders/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { orderType, items, totalAmount, customerName, specialInstructions } = req.body;

    const orderRef = db.collection('orders').doc(id);
    const doc = await orderRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updateData = {
      orderType: orderType || doc.data().orderType,
      items: items || doc.data().items,
      totalAmount: totalAmount || doc.data().totalAmount,
      customerName: customerName || doc.data().customerName,
      specialInstructions: specialInstructions || doc.data().specialInstructions,
      updatedAt: new Date().toISOString()
    };

    await orderRef.update(updateData);

    await db.collection('auditLogs').add({
      adminName: req.user.fullName,
      action: 'Order Updated',
      date: new Date().toISOString(),
      ip: req.ip,
      recordId: id
    });

    res.json({ message: 'Order updated successfully' });

  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/orders/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const orderRef = db.collection('orders').doc(id);
    const doc = await orderRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await orderRef.delete();

    await db.collection('auditLogs').add({
      adminName: req.user.fullName,
      action: 'Order Deleted',
      date: new Date().toISOString(),
      ip: req.ip,
      recordId: id
    });

    res.json({ message: 'Order deleted successfully' });

  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/orders/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const orderRef = db.collection('orders').doc(id);
    const doc = await orderRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = doc.data();
    const updateData = {
      status: status,
      updatedAt: new Date().toISOString()
    };

    if (status === 'rejected') {
      updateData.rejectionReason = rejectionReason || 'No reason provided';
    }

    await orderRef.update(updateData);

    if (status === 'approved') {
      await db.collection('sales').add({
        orderId: id,
        productName: orderData.orderType || 'Order',
        productType: orderData.orderType || 'general',
        quantity: orderData.items?.length || 1,
        unitPrice: orderData.totalAmount / (orderData.items?.length || 1),
        totalPrice: orderData.totalAmount,
        customerAccountName: orderData.userAccountName || orderData.customerName,
        notes: `Approved order ${id}`,
        saleDate: new Date().toISOString(),
        userId: orderData.userId,
        userEmail: orderData.userEmail,
        createdAt: new Date().toISOString()
      });

      const analyticsRef = db.collection('analytics').doc('summary');
      const analyticsDoc = await analyticsRef.get();
      if (analyticsDoc.exists) {
        const data = analyticsDoc.data();
        await analyticsRef.update({
          totalSales: (data.totalSales || 0) + 1,
          totalRevenue: (data.totalRevenue || 0) + orderData.totalAmount,
          approvedOrders: (data.approvedOrders || 0) + 1
        });
      } else {
        await analyticsRef.set({
          totalSales: 1,
          totalRevenue: orderData.totalAmount,
          totalOrders: 1,
          pendingOrders: 0,
          approvedOrders: 1,
          rejectedOrders: 0,
          medicineSales: 0,
          offerSales: 0,
          packageSales: 0,
          updatedAt: new Date().toISOString()
        });
      }
    }

    const userEmail = orderData.userEmail || orderData.customerEmail;
    const userName = orderData.userAccountName || orderData.customerName;

    if (status === 'approved') {
      await sendEmail(
        userEmail,
        '✅ تم قبول طلبك',
        `✅ تم قبول طلبك #${id.substring(0, 8)}`,
        `
          <p>عزيزي <strong>${userName}</strong>،</p>
          <p>يسعدنا إبلاغك بأن طلبك رقم <strong>#${id.substring(0, 8)}</strong> قد تم <strong>قبوله</strong>.</p>
          <div class="info-box">
            <div class="info-item">
              <span class="label">📦 قيمة الطلب</span>
              <span class="value">${orderData.totalAmount} جنيه</span>
            </div>
            <div class="info-item">
              <span class="label">📅 تاريخ الطلب</span>
              <span class="value">${new Date(orderData.createdAt).toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
          <p>شكراً لك على ثقتك بنا. ❤️</p>
        `,
        'متابعة الطلب',
        'https://drmirnapharmacy.com/orders'
      );

      await sendTelegram(
        `✅ Order Approved\n\n` +
        `Order ID: ${id}\n` +
        `Customer: ${userName}\n` +
        `Amount: ${orderData.totalAmount} جنيه\n` +
        `Approved by: ${req.user.fullName}`
      );
    } else if (status === 'rejected') {
      await sendEmail(
        userEmail,
        '❌ تم رفض طلبك',
        `❌ تم رفض طلبك #${id.substring(0, 8)}`,
        `
          <p>عزيزي <strong>${userName}</strong>،</p>
          <p>نأسف لإبلاغك بأن طلبك رقم <strong>#${id.substring(0, 8)}</strong> قد تم <strong>رفضه</strong>.</p>
          <div class="info-box">
            <div class="info-item">
              <span class="label">📝 سبب الرفض</span>
              <span class="value">${updateData.rejectionReason}</span>
            </div>
          </div>
          <p>إذا كان لديك أي استفسار، يرجى التواصل معنا. 📞</p>
        `,
        'تواصل معنا',
        `https://drmirnapharmacy.com/contact`
      );

      await sendTelegram(
        `❌ Order Rejected\n\n` +
        `Order ID: ${id}\n` +
        `Customer: ${userName}\n` +
        `Reason: ${updateData.rejectionReason}\n` +
        `Rejected by: ${req.user.fullName}`
      );
    }

    await db.collection('auditLogs').add({
      adminName: req.user.fullName,
      action: `Order ${status}`,
      date: new Date().toISOString(),
      ip: req.ip,
      recordId: id
    });

    res.json({ message: `Order ${status} successfully` });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// 📊 ANALYTICS ROUTES
// =============================================
app.get('/api/analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const analyticsRef = db.collection('analytics').doc('summary');
    const doc = await analyticsRef.get();

    if (!doc.exists) {
      return res.json({
        totalSales: 0,
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        approvedOrders: 0,
        rejectedOrders: 0,
        medicineSales: 0,
        offerSales: 0,
        packageSales: 0
      });
    }

    res.json(doc.data());

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// 🤖 AI CHAT
// =============================================
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    const medicinesSnapshot = await db.collection('medicines')
      .where('name', '>=', message)
      .where('name', '<=', message + '\uf8ff')
      .limit(1)
      .get();

    if (!medicinesSnapshot.empty) {
      const medicine = medicinesSnapshot.docs[0].data();
      res.json({
        response: `✅ <strong>${medicine.name}</strong> متوفر حالياً.\n💊 السعر: <strong>${medicine.price} جنيه</strong>\n📦 المخزون: <strong>${medicine.stock} وحدة</strong>\n📂 الفئة: ${medicine.category}\n📝 ${medicine.description || ''}`
      });
    } else {
      res.json({
        response: `❌ عذراً، الدواء "<strong>${message}</strong>" غير متوفر حالياً.\n📞 يمكنك التواصل معنا على ${PHARMACY_PHONE} للاستفسار.`
      });
    }

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// 📧 SMTP SEND ROUTE (IMPROVED)
// =============================================
app.post('/api/smtp/send', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const success = await sendEmail(
      to,
      subject,
      `📧 ${subject}`,
      `
        <p>${message.replace(/\n/g, '<br>')}</p>
        <br>
        <div style="background: #f8f9ff; border-radius: 12px; padding: 15px; border-right: 4px solid #667eea;">
          <p style="margin: 0; color: #8888aa; font-size: 13px;">
            ✉️ تم إرسال هذه الرسالة من لوحة تحكم <strong>${PHARMACY_NAME}</strong>
          </p>
          <p style="margin: 5px 0 0 0; color: #8888aa; font-size: 13px;">
            📅 ${new Date().toLocaleString('ar-EG')}
          </p>
        </div>
      `,
      null,
      null,
      null
    );

    if (!success) {
      return res.status(500).json({ error: 'Failed to send email' });
    }

    await db.collection('auditLogs').add({
      adminName: req.user.fullName,
      action: 'SMTP Email Sent',
      date: new Date().toISOString(),
      ip: req.ip,
      recordId: `email-${Date.now()}`
    });

    res.json({ 
      message: '✅ تم إرسال البريد الإلكتروني بنجاح',
      to: to,
      subject: subject
    });

  } catch (error) {
    console.error('SMTP send error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// 💰 EXPENSES ROUTES
// =============================================
app.post('/api/expenses', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, amount, notes } = req.body;

    if (!name || !amount) {
      return res.status(400).json({ error: 'Name and amount are required' });
    }

    const expenseData = {
      name,
      amount: parseFloat(amount),
      notes: notes || '',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('expenses').add(expenseData);

    res.status(201).json({
      message: 'Expense added successfully',
      id: docRef.id,
      ...expenseData
    });

  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/expenses', authenticateToken, isAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('expenses')
      .orderBy('date', 'desc')
      .get();

    const expenses = [];
    snapshot.forEach(doc => {
      expenses.push({ id: doc.id, ...doc.data() });
    });

    res.json(expenses);

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// 📋 AUDIT LOGS ROUTES
// =============================================
app.get('/api/audit-logs', authenticateToken, isAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('auditLogs')
      .orderBy('date', 'desc')
      .limit(100)
      .get();

    const logs = [];
    snapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    res.json(logs);

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// 📱 TELEGRAM NOTIFICATION ROUTE
// =============================================
app.post('/api/telegram/notify', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    await sendTelegram(message);
    res.json({ success: true });
  } catch (error) {
    console.error('Telegram notify error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// 🖥️ SERVE HTML FILES - WITHOUT .html EXTENSION
// =============================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login-dashboard.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

app.get('/pay', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pay.html'));
});

app.get('/offer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'offer.html'));
});

app.get('/package', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'package.html'));
});

app.get('/pay-offer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pay-offer.html'));
});

app.get('/pay-package', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pay-package.html'));
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

// =============================================
// 🚀 START SERVER
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email: ${process.env.SMTP_USER}`);
  console.log(`🖼️ Logo: ${LOGO_URL}`);
});
