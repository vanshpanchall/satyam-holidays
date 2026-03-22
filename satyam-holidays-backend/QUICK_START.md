# Quick Start Guide - Satyam Holidays

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (Atlas recommended for beginners)

## Setup Steps

### 1. Backend Setup

```bash
cd satyam-holidays-backend
npm install
```

### 2. Configure Environment Variables

Edit the `.env` file with your settings:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (Replace with your MongoDB connection string)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/satyam-holidays

# Email Configuration (Replace with your Gmail app password)
EMAIL_USER=satyamholidays19@gmail.com
EMAIL_PASS=your-app-password

# JWT Secret
JWT_SECRET=satyam-holidays-super-secret-key-2024

# CORS Origins
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### 3. Frontend Setup

```bash
cd satyam-holidays-react
npm install
```

### 4. Start the Application

**Terminal 1 - Backend:**

```bash
cd satyam-holidays-backend
npm start
```

**Terminal 2 - Frontend:**

```bash
cd satyam-holidays-react
npm start
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Health Check: http://localhost:5000/api/health

## Features Available

- ✅ Modern responsive UI with animations
- ✅ Domestic and International packages
- ✅ Enquiry form with email notifications
- ✅ Contact form
- ✅ Excel export for enquiries
- ✅ MongoDB database integration
- ✅ Email notifications
- ✅ RESTful API endpoints

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/enquiries` - Submit enquiry
- `GET /api/enquiries` - Get all enquiries (admin)
- `GET /api/enquiries/export/excel` - Export enquiries to Excel
- `GET /api/enquiries/stats/overview` - Get enquiry statistics

## Troubleshooting

### MongoDB Connection Issues

- Ensure your MongoDB connection string is correct
- Check if your IP is whitelisted (for Atlas)
- Verify username and password

### Email Issues

- Ensure 2FA is enabled on Gmail
- Use App Password, not regular password
- Check if less secure apps are blocked

### Port Issues

- Change PORT in .env if 5000 is occupied
- Update CORS_ORIGIN if using different frontend port
