# MongoDB Setup Guide for Satyam Holidays

## Option 1: MongoDB Atlas (Recommended - Cloud Database)

### Step 1: Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/atlas
2. Click "Try Free" and create an account
3. Choose "Shared" cluster (free tier)

### Step 2: Create Database

1. Click "Build a Database"
2. Choose "FREE" tier (M0)
3. Select your preferred cloud provider (AWS/Google Cloud/Azure)
4. Choose a region close to you
5. Click "Create"

### Step 3: Set Up Database Access

1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Username: `satyamholidays`
4. Password: Create a strong password (save it!)
5. Role: "Read and write to any database"
6. Click "Add User"

### Step 4: Set Up Network Access

1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
4. Click "Confirm"

### Step 5: Get Connection String

1. Go to "Database" in the left sidebar
2. Click "Connect"
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password
6. Replace `<dbname>` with `satyam-holidays`

### Step 6: Update Environment Variables

Update your `.env` file with the MongoDB Atlas connection string:

```env
MONGODB_URI=mongodb+srv://satyamholidays:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/satyam-holidays?retryWrites=true&w=majority
```

## Option 2: Local MongoDB Installation

### For Windows:

1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Run the installer
3. Choose "Complete" installation
4. Install MongoDB Compass (GUI tool) when prompted
5. Start MongoDB service

### For macOS:

```bash
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

### For Linux (Ubuntu):

```bash
sudo apt update
sudo apt install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

## Testing the Connection

After setting up either option, test your connection:

```bash
cd satyam-holidays-backend
npm start
```

You should see: "Connected to MongoDB" in the console.

## Email Configuration

### Gmail Setup:

1. Go to your Gmail account settings
2. Enable 2-Factor Authentication
3. Generate an "App Password":
   - Go to Security settings
   - Find "App passwords"
   - Generate a new app password for "Mail"
4. Update your `.env` file:

```env
EMAIL_USER=satyamholidays19@gmail.com
EMAIL_PASS=your-16-character-app-password
```

### Alternative: Use a different email service

You can also use services like:

- SendGrid
- Mailgun
- AWS SES

Just update the email configuration in `utils/email.js` accordingly.
