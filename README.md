# 🏥 Pharmacy ERP System - Dr. Mirna Safwat

A complete Full Stack Pharmacy ERP System with modern features and production-ready architecture.

## ✨ Features

### 🔐 Authentication & Security
- JWT-based authentication
- Role-based access control (Admin/User)
- Secure password hashing with bcryptjs
- Rate limiting and Helmet security
- Session management

### 📱 User Features
- Signup with email verification
- Login with JWT generation
- Password reset with OTP (6 digits, 2 min expiry)
- Profile management
- View orders history

### 💊 Medicine Management
- Add/Edit/Delete medicines
- Medicine categories
- Stock management
- Image upload via Cloudinary
- Real-time availability check

### 🛒 Order System
- Place orders (Medicine/Offer/Package)
- Order status tracking (Pending/Approved/Rejected)
- Auto-approval system
- Rejection with reason

### 💰 Payment System
- AI-powered payment verification
- Payment reference matching
- Manual and automatic sales recording
- Transaction tracking

### 📊 Analytics & Reports
- Total Sales & Revenue
- Order analytics (Pending/Approved/Rejected)
- Daily/Weekly/Monthly charts
- Export reports (PDF/Excel/CSV)

### 📧 Communication
- SMTP email integration
- Email notifications for:
  - Welcome emails
  - Order updates
  - Password reset
- Manual email sender from dashboard

### 🤖 AI Integration
- Chat assistant for medicine search
- AI payment verification
- Automated responses

### 📱 Telegram Notifications
- User registration alerts
- Order creation alerts
- Payment notifications
- Status change alerts

### 📋 Administrative Features
- Dashboard overview
- User management
- Order management
- Sales management
- Expense tracking
- Audit logs

## 🏗️ Technology Stack

### Frontend
- HTML5, CSS3, JavaScript
- Bootstrap 5
- RTL Arabic Support
- Chart.js for analytics

### Backend
- Node.js
- Express.js
- Firebase Firestore
- JWT Authentication

### Services
- Cloudinary (Image Storage)
- Nodemailer (Email)
- OpenAI (AI Features)
- Telegram Bot API

## 🚀 Installation

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Firebase account
- Cloudinary account
- Telegram Bot

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/pharmacy-erp.git
cd pharmacy-erp