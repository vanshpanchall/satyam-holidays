# Satyam Holidays Setup Guide

This document is the practical local setup companion to README.md.
Use this when you want to run the project quickly on a development machine.

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- MongoDB (local or Atlas)
- Optional: Docker Desktop for compose-based local stack

## Recommended Local Setup

### 1. Install Dependencies

From repository root:

```bash
npm ci
npm --prefix satyam-holidays-backend ci
npm --prefix satyam-holidays-react ci
```

### 2. Create Backend Environment File

Use the backend example file as a baseline.

```bash
# Linux/macOS
cp satyam-holidays-backend/env.example satyam-holidays-backend/.env

# Windows PowerShell
Copy-Item satyam-holidays-backend/env.example satyam-holidays-backend/.env
```

Minimum values to verify in .env:

- MONGODB_URI
- JWT_SECRET
- CORS_ORIGIN
- EMAIL_USER and EMAIL_PASS (or SMTP_HOST, SMTP_USER, SMTP_PASS)

For Atlas-specific setup, see satyam-holidays-backend/MONGODB_SETUP.md.

### 3. Start the Application

From repository root:

```bash
npm run dev
```

Default URLs with root dev command:

- Frontend: http://localhost:3001
- Backend API: http://localhost:5000
- Health endpoint: http://localhost:5000/api/v1/health

## Alternative: Start Apps Separately

Backend:

```bash
npm --prefix satyam-holidays-backend run dev
```

Frontend:

```bash
npm --prefix satyam-holidays-react run start
```

If the frontend is started directly with npm start, it runs on port 3000.

## Optional Docker Setup

App stack:

```bash
docker compose -f docker-compose.yml up -d
```

App plus monitoring stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

## Verification Checklist

- Frontend loads without console errors
- GET /api/v1/health returns healthy response
- Enquiry form creates a backend record
- Backend test suite passes:

```bash
npm --prefix satyam-holidays-backend test -- --runInBand
```

## Related Docs

- README.md
- OPERATIONS_RUNBOOK.md
- PRODUCTION_CHECKLIST.md
- satyam-holidays-backend/QUICK_START.md
