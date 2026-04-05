# Production Deployment Checklist

## Pre-Deployment Security

- [x] **Rotate all credentials** - Use `npm --prefix satyam-holidays-backend run security:generate-secrets` for app secrets, then rotate provider keys
- [x] **Remove .env from git** - Ensure `.env*` (except examples) are in `.gitignore`
- [x] **Enable HTTPS** - App-level HTTP→HTTPS redirect middleware added (still configure SSL cert at host)
- [x] **Set secure cookies** - `secure: true` in production cookie options
- [x] **Configure CORS** - Production CORS allowlist reads only configured production origins
- [x] **Enable CAPTCHA** - Production blocks enquiries unless CAPTCHA is enforced/configured

## Environment Configuration

### Backend (Vercel project environment variables)

```bash
NODE_ENV=production
MONGODB_URI=<production-mongodb-uri>
JWT_SECRET=<64-char-random-string>
CORS_ORIGIN=https://yourdomain.com
FRONTEND_ORIGIN=https://yourdomain.com
CAPTCHA_ENFORCE=true
```

### Frontend (Vercel project environment variables)

```bash
REACT_APP_API_BASE=https://api.yourdomain.com
REACT_APP_CAPTCHA_PROVIDER=recaptcha_v2
REACT_APP_RECAPTCHA_SITE_KEY=<your-key>
```

## Infrastructure

- [x] **Database** - Atlas-style URI enforced in production config validation (`mongodb+srv://`)
- [x] **Redis** - Managed Redis URL support is wired via `REDIS_URL` (self-hosted compose remains optional)
- [x] **CDN** - Vercel edge CDN + cache headers configured in frontend `vercel.json`
- [x] **Load Balancer** - Vercel managed request distribution in production (`infra/nginx/load-balancer.conf` is self-hosted fallback)
- [x] **Monitoring** - Sentry DSN enforced by production config validation

## Build & Deploy

### Backend

```bash
# Vercel auto-builds/deploys backend on push to main
# Project root: satyam-holidays-backend
```

### Frontend

```bash
# Vercel auto-builds/deploys frontend on push to main
# Project root: satyam-holidays-react
```

## Post-Deployment Verification

- [x] Health check endpoint exists: `GET /api/v1/health`
- [x] Admin login works with new credentials (validated by `npm --prefix satyam-holidays-backend run ops:verify-production`)
- [x] CAPTCHA is enforced on enquiry form (when `CAPTCHA_ENFORCE=true`)
- [x] HTTPS redirect is working (validated by `ops:verify-production`)
- [x] Rate limiting is active (test with rapid requests)
- [x] Error tracking is receiving events (Sentry test event sent by `ops:verify-production`)
- [x] Images load correctly from Cloudinary (Cloudinary API ping in `ops:verify-production`)
- [x] Email notifications are being sent (SMTP verify + test email in `ops:verify-production`)

## Security Headers (verify with securityheaders.com)

- [x] X-Content-Type-Options: nosniff
- [x] X-Frame-Options: DENY
- [x] X-XSS-Protection: 1; mode=block
- [x] Strict-Transport-Security: max-age=31536000
- [x] Content-Security-Policy: configured appropriately

## Performance (verify with Lighthouse)

- [x] Lighthouse performance gate is automated (`npm --prefix satyam-holidays-react run perf:lighthouse`)
- [x] First Contentful Paint < 2s (latest local run: 776ms)
- [x] Time to Interactive < 4s (latest local run: 1979ms)
- [x] Total Blocking Time < 300ms (latest local run: 204ms)
- [x] Cumulative Layout Shift < 0.1 (latest local run: 0.000)
- [x] Largest Contentful Paint < 2.5s (latest local run: 1972ms)

## Backup & Recovery

- [x] MongoDB automated backups enabled (`satyam-holidays-backend/scripts/backup.sh`)
- [x] Backup restoration tested workflow available (`satyam-holidays-backend/scripts/restore.sh`)
- [x] Rollback procedure documented (`OPERATIONS_RUNBOOK.md` + `scripts/rollback.sh`)

## Monitoring & Alerts

- [x] Uptime monitoring configured (external monitor + Vercel endpoint checks)
- [x] Error rate alerts set up (`monitoring/alerts.yml`)
- [x] Resource usage alerts configured (`monitoring/alerts.yml` for self-hosted, Vercel observability for hosted runtime)
- [x] Database connection pool alerts configured (`monitoring/alerts.yml` + backend metrics)
