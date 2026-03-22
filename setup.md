# Quick Setup Guide - Satyam Holidays

## 🚀 Quick Start

### 1. Frontend Setup (React.js)

```bash
# Navigate to frontend directory
cd satyam-holidays-react

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will run on: http://localhost:3000

### 2. Backend Setup (Node.js)

```bash
# Navigate to backend directory
cd satyam-holidays-backend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env file with your settings
# (Update email and database settings)

# Start development server
npm run dev
```

The backend will run on: http://localhost:5000

### 3. Database Setup

#### Option A: MongoDB Local
1. Install MongoDB Community Edition
2. Start MongoDB service
3. Database will be created automatically

#### Option B: MongoDB Atlas (Cloud)
1. Create free account at MongoDB Atlas
2. Create cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

### 4. Email Setup

1. Enable 2-factor authentication on Gmail
2. Generate App Password
3. Update `.env` file:
   ```env
   EMAIL_USER=satyamholidays19@gmail.com
   EMAIL_PASS=your-app-password
   ```

## 📁 Project Structure

```
satyam-holidays/
├── satyam-holidays-react/     # Frontend (React)
├── satyam-holidays-backend/   # Backend (Node.js)
└── README.md                  # Full documentation
```

## 🎯 Features Ready to Use

✅ **Frontend**
- Modern animated UI
- Responsive design
- Package showcase
- Enquiry form
- Contact information

✅ **Backend**
- RESTful API
- Email notifications
- Excel export
- Database management
- Security features

## 🔧 Configuration

### Frontend Customization
- Update colors in `tailwind.config.js`
- Modify content in components
- Update contact details

### Backend Configuration
- Database connection in `.env`
- Email settings in `.env`
- API endpoints in `server.js`

## 📧 Testing Email

1. Fill out the enquiry form on the website
2. Check your email (satyamholidays19@gmail.com)
3. Customer will receive confirmation email
4. Excel export available at `/api/enquiries/export/excel`

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
cd satyam-holidays-react
npm run build
# Deploy build folder
```

### Backend (Heroku/Railway)
```bash
cd satyam-holidays-backend
# Set environment variables
# Deploy to platform
```

## 📞 Support

- **Email**: satyamholidays19@gmail.com
- **Phone**: +91 98765 43210

---

**Your Satyam Holidays website is ready! 🎉**
