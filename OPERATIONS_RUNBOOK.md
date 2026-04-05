# Operations Runbook

This runbook provides repeatable operations steps for Preview and Production releases.
Use it alongside PRODUCTION_CHECKLIST.md for release sign-off.

## 1. Deployment Model

- The repository is deployed as two Vercel projects:
  - frontend root: satyam-holidays-react
  - backend root: satyam-holidays-backend
- Pull requests create Preview deployments.
- Pushes to main create Production deployments.
- Branch protection should require CI pass from .github/workflows/ci.yml.

## 2. Release Preparation

### 2.1 Rotate and validate secrets

Generate strong app secrets:

```bash
npm --prefix satyam-holidays-backend run security:generate-secrets
```

Optional: write generated values to a target file:

```bash
npm --prefix satyam-holidays-backend run security:generate-secrets -- --env-file=.env.production
```

Rotate provider keys if required by policy:

- Cloudinary API key and secret
- reCAPTCHA or hCaptcha keys
- SMTP credentials
- Sentry DSN credentials

### 2.2 Validate environment configuration

Backend production variables should include:

- NODE_ENV=production
- MONGODB_URI
- JWT_SECRET
- CORS_ORIGIN and or FRONTEND_ORIGIN
- CAPTCHA_ENFORCE=true

Frontend production variables should include:

- REACT_APP_API_BASE
- REACT_APP_CAPTCHA_PROVIDER
- CAPTCHA site key for selected provider

## 3. Infrastructure Baseline

### 3.1 Database

- Use Atlas-style MongoDB URI: mongodb+srv://...
- Maintain Atlas network allowlist for runtime egress IPs
- Keep ALLOW_NON_ATLAS_DB=false in production unless intentionally overridden

### 3.2 Redis

- Use managed Redis for hosted production deployments
- Set REDIS_URL
- Set REDIS_REQUIRED=true if Redis outage must alert as critical

### 3.3 CDN and TLS

- Vercel provides TLS termination and edge delivery
- Keep immutable caching headers in frontend vercel.json
- If using Cloudflare in front of Vercel, avoid caching API responses unintentionally

### 3.4 Monitoring

Primary monitoring stack:

- Vercel logs and analytics
- Sentry error tracking
- external uptime checks for frontend and backend health endpoint

Optional local self-hosted monitoring stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

Endpoints:

- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Uptime Kuma: http://localhost:3002

## 4. Post-Deploy Verification

Set these variables before verification:

- API_BASE_URL
- ADMIN_EMAIL
- ADMIN_PASSWORD
- VERIFY_EMAIL_TO
- SENTRY_DSN
- Cloudinary credentials

Run verification:

```bash
npm --prefix satyam-holidays-backend run ops:verify-production
```

Verification includes:

- health endpoint check
- admin login and token flow
- HTTP to HTTPS redirect check
- Sentry test event
- Cloudinary connectivity
- SMTP verification and test email

Preview best practice:

- Run verification against Preview backend URL before merging high-risk changes

## 5. Performance Gate

Run deterministic Lighthouse gate:

```bash
npm --prefix satyam-holidays-react run perf:lighthouse
```

Legacy LHCI comparison run:

```bash
npm --prefix satyam-holidays-react run perf:lighthouse:lhci
```

Current gate thresholds:

- FCP < 2s
- TTI < 4s
- TBT < 300ms
- CLS < 0.1
- LCP < 2.5s

## 6. Backup and Recovery

Create backup:

```bash
npm --prefix satyam-holidays-backend run backup
```

Restore backup:

```bash
npm --prefix satyam-holidays-backend run restore -- ./backups/<backup-file>.tar.gz
```

Rollback using latest backup:

```bash
npm --prefix satyam-holidays-backend run rollback
```

Example daily cron schedule:

```cron
0 2 * * * /path/to/satyam-holidays-backend/scripts/backup.sh >> /var/log/satyam-backup.log 2>&1
```

## 7. Alert Coverage

Alert rules in monitoring/alerts.yml should cover:

- uptime checks
- backend error-rate spikes
- CPU, memory, and disk pressure
- MongoDB connectivity and pool health
- Redis disconnect events when REDIS_REQUIRED=true

Recalibrate thresholds after one week of production traffic.

## 8. CI and Release Flow

- CI validates lint, backend tests, frontend build, and both vercel.json files
- Vercel remains the deploy orchestrator
- GitHub Actions remains the merge quality gate

Recommended flow:

1. Open PR and review CI plus Vercel Preview.
2. Run ops:verify-production against Preview for high-risk changes.
3. Merge to main for Production deployment.
