# Satyam Holidays – Production Notes

Quick steps to run in development and deploy safely.

## Development

- Root: npm run dev (starts backend on 5000 and frontend on 3000)
- Backend env (.env):
  - PORT=5000
  - MONGODB_URI=your-mongodb-uri
  - EMAIL_USER=...
  - EMAIL_PASS=...
  - FRONTEND_ORIGIN=http://localhost:3000

## Frontend config

- Set REACT_APP_API_BASE to your backend URL in production (e.g. https://api.example.com).
- Branding lives in satyam-holidays-react/src/config/siteConfig.js (name, tagline, addresses, phones, social).
- Logo file is public/satyam-logo.svg; update siteConfig.company.logo if you swap it.

## Production

- Build frontend: npm --prefix satyam-holidays-react run build
- Serve frontend via your hosting and point API requests to your backend URL.
- Backend env in prod must include FRONTEND_ORIGIN set to the deployed site origin for CORS.
- Run post-deploy checks: npm --prefix satyam-holidays-backend run ops:verify-production
- Full ops steps (monitoring, backup/restore, rollback, Lighthouse): see OPERATIONS_RUNBOOK.md

## Security

- Helmet and rate limit are enabled.
- No sensitive credentials in repo; use environment variables.

# Satyam Holidays - Tourism & Travel Website

A modern, responsive tourism website built with React.js, Node.js, and MongoDB. Features include animated UI, enquiry management, email notifications, and Excel export functionality.

## 🚀 Features

### Frontend (React.js)

- **Modern UI/UX**: Glassmorphic design with smooth animations
- **Responsive Design**: Works perfectly on all devices
- **Interactive Components**: Animated cards, smooth scrolling, hover effects
- **Package Showcase**: Domestic and international travel packages
- **Enquiry Form**: User-friendly form with validation
- **Contact Information**: Complete business details and social media links

### Backend (Node.js + Express)

- **RESTful API**: Complete CRUD operations for enquiries
- **Email Integration**: Automated email notifications
- **Excel Export**: Generate detailed Excel reports
- **Database Management**: MongoDB with Mongoose ODM
- **Security**: Rate limiting, input validation, CORS protection

### Key Sections

1. **Hero Section**: Animated landing with call-to-action
2. **Services**: Flight bookings, hotels, transportation, visa services
3. **About Us**: Company information and values
4. **Domestic Packages**: Chardham, South India, North India, Kashmir, West Bengal
5. **International Packages**: Dubai, Singapore, Vietnam, Thailand, Nepal, Andaman
6. **Enquiry Form**: Contact form with email integration
7. **Contact**: Address, phone, email, social media links

## 🛠️ Technology Stack

### Frontend

- **React.js 18** - UI framework
- **Tailwind CSS** - Styling and animations
- **Framer Motion** - Advanced animations
- **React Icons** - Icon library
- **React Hook Form** - Form handling
- **AOS** - Scroll animations

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Nodemailer** - Email functionality
- **ExcelJS** - Excel file generation
- **Joi** - Input validation
- **Helmet** - Security middleware

## 📦 Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Frontend Setup

1. **Navigate to frontend directory:**

   ```bash
   cd satyam-holidays-react
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start development server:**

   ```bash
   npm start
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

### Backend Setup

1. **Navigate to backend directory:**

   ```bash
   cd satyam-holidays-backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Configuration:**

   ```bash
   cp env.example .env
   ```

   Edit `.env` file with your configuration:

   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/satyam-holidays
   EMAIL_USER=satyamholidays19@gmail.com
   EMAIL_PASS=your-app-password
   ```

4. **Start development server:**

   ```bash
   npm run dev
   ```

5. **Start production server:**
   ```bash
   npm start
   ```

## 🗄️ Database Setup

### MongoDB Local Setup

1. Install MongoDB Community Edition
2. Start MongoDB service
3. Create database: `satyam-holidays`

### MongoDB Atlas (Cloud)

1. Create MongoDB Atlas account
2. Create new cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

## 📧 Email Configuration

### Gmail Setup

1. Enable 2-factor authentication
2. Generate App Password
3. Update `.env` with credentials:
   ```env
   EMAIL_USER=satyamholidays19@gmail.com
   EMAIL_PASS=your-app-password
   ```

## 🚀 Deployment

### Vercel Deployment (Frontend + Backend)

This monorepo uses two Vercel projects:

1. Frontend project root: `satyam-holidays-react`
2. Backend project root: `satyam-holidays-backend`

Recommended setup:

1. Connect both projects to this GitHub repository in Vercel.
2. Set Production/Preview environment variables in each project.
3. Keep GitHub branch protection enabled so CI in `.github/workflows/ci.yml` passes before merge.
4. Use Vercel Preview deployments for pull requests.
5. Merge to `main` for automatic Production deployment.

Local preflight checks before merge:

```bash
npm run lint
npm --prefix satyam-holidays-backend test -- --runInBand
npm --prefix satyam-holidays-react run build
```

## 📁 Project Structure

```
satyam-holidays/
├── satyam-holidays-react/          # Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── Header.js
│   │   │   ├── Hero.js
│   │   │   ├── Services.js
│   │   │   ├── About.js
│   │   │   ├── DomesticPackages.js
│   │   │   ├── InternationalPackages.js
│   │   │   ├── Enquiry.js
│   │   │   ├── Contact.js
│   │   │   └── Footer.js
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
│
├── satyam-holidays-backend/        # Backend
│   ├── models/
│   │   └── Enquiry.js
│   ├── routes/
│   │   ├── enquiries.js
│   │   └── packages.js
│   ├── utils/
│   │   ├── email.js
│   │   └── excel.js
│   ├── server.js
│   └── package.json
│
└── README.md
```

## 🔧 API Endpoints

### Enquiries

- `POST /api/enquiries` - Create new enquiry
- `GET /api/enquiries` - Get all enquiries (with pagination)
- `GET /api/enquiries/:id` - Get enquiry by ID
- `PATCH /api/enquiries/:id/status` - Update enquiry status
- `GET /api/enquiries/export/excel` - Export to Excel
- `GET /api/enquiries/stats/overview` - Get statistics

### Packages

- `GET /api/packages` - Get all packages
- `GET /api/packages/:id` - Get package by ID
- `GET /api/packages/categories/list` - Get categories

### Health Check

- `GET /api/health` - API health status

## 🎨 Customization

### Colors

Update Tailwind config for brand colors:

```javascript
// tailwind.config.js
colors: {
  primary: {
    500: '#f59e0b', // Your brand color
  },
  navy: {
    900: '#0f172a',
  }
}
```

### Content

- Update package data in `routes/packages.js`
- Modify company information in components
- Update contact details and social media links

### Styling

- Modify `src/index.css` for global styles
- Update component-specific styles
- Customize animations in Tailwind config

## 📊 Features in Detail

### Enquiry Management

- **Form Validation**: Client and server-side validation
- **Email Notifications**: Automatic emails to admin and customer
- **Excel Export**: Detailed reports with statistics
- **Status Tracking**: Pending, contacted, confirmed, cancelled
- **Analytics**: Dashboard with charts and metrics

### Package Showcase

- **Filtering**: By category and destination
- **Search**: Package search functionality
- **Details**: Complete package information
- **Pricing**: Transparent pricing display
- **Reviews**: Customer ratings and feedback

### Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Tablet Support**: Responsive tablet layouts
- **Desktop Experience**: Enhanced desktop features
- **Touch Friendly**: Optimized for touch interactions

## 🔒 Security Features

- **Input Validation**: Joi schema validation
- **Rate Limiting**: Prevent abuse
- **CORS Protection**: Cross-origin security
- **Helmet**: Security headers
- **Data Sanitization**: Clean user inputs

## 📈 Performance Optimization

- **Code Splitting**: Lazy loading components
- **Image Optimization**: Compressed images
- **Caching**: Browser and server caching
- **Minification**: Production build optimization
- **CDN**: Static asset delivery

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## 📝 License

This project is licensed under the MIT License.

## 📞 Support

For support and queries:

- **Email**: satyamholidays19@gmail.com
- **Phone**: +91 98765 43210
- **Website**: [Satyam Holidays](https://satyamholidays.com)

## 🎯 Future Enhancements

- [ ] Admin dashboard
- [ ] Payment integration
- [ ] Booking system
- [ ] Customer reviews
- [ ] Blog section
- [ ] Multi-language support
- [ ] Mobile app
- [ ] Chat support
- [ ] Weather integration
- [ ] Travel insurance

---

**Built with ❤️ for Satyam Holidays - Journey With Joy!**
