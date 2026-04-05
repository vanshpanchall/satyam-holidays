# Production Deployment Checklist

Use this checklist to confirm production readiness and release sign-off.
For step-by-step execution details, use OPERATIONS_RUNBOOK.md.

## 1. Release Controls

- [ ] Pull request is approved and CI is green in .github/workflows/ci.yml
- [ ] Vercel Preview deployment is validated for release scope
- [ ] Release owner and rollback owner are assigned

## 2. Security and Secret Hygiene

- [ ] Generate and rotate app secrets:

```bash
npm --prefix satyam-holidays-backend run security:generate-secrets
```

- [ ] Rotate provider credentials if required by policy (Cloudinary, CAPTCHA provider, SMTP provider, Sentry)
- [ ] Confirm secret files are excluded from git (`.env*` except examples)
- [ ] Confirm CAPTCHA is enforced for production (`CAPTCHA_ENFORCE=true`)
- [ ] Confirm CORS allowlist includes only intended production origins

## 3. Environment Configuration

### 3.1 Backend Variables

```bash
NODE_ENV=production
MONGODB_URI=<production-mongodb-uri>
JWT_SECRET=<64-char-random-string>
CORS_ORIGIN=https://yourdomain.com
FRONTEND_ORIGIN=https://yourdomain.com
CAPTCHA_ENFORCE=true
```

### 3.2 Frontend Variables

```bash
REACT_APP_API_BASE=https://api.yourdomain.com
REACT_APP_CAPTCHA_PROVIDER=recaptcha_v2
REACT_APP_RECAPTCHA_SITE_KEY=<your-key>
```

### 3.3 Configuration Validation

- [ ] Backend starts with no critical production configuration errors
- [ ] Frontend build reads the correct API base URL

## 4. Infrastructure Readiness

- [ ] MongoDB Atlas URI uses `mongodb+srv://` and allowlist is correct
- [ ] REDIS_URL is configured and REDIS_REQUIRED policy is set correctly
- [ ] Frontend cache headers are active in vercel.json
- [ ] Monitoring path is confirmed for hosted runtime (Vercel + Sentry + uptime checks)
- [ ] monitoring/alerts.yml coverage is confirmed for self-hosted stack

## 5. Deployment

- [ ] Merge to main only after CI and Preview checks pass
- [ ] Backend deployment status is successful in Vercel
- [ ] Frontend deployment status is successful in Vercel
- [ ] Release notes include deployment IDs and timestamp

## 6. Post-Deploy Verification

- [ ] Run post-deploy verification:

```bash
npm --prefix satyam-holidays-backend run ops:verify-production
```

- [ ] Health endpoint check passes at GET /api/v1/health
- [ ] Admin login and token verification pass
- [ ] HTTP to HTTPS redirect check passes
- [ ] CAPTCHA is enforced in enquiry flow
- [ ] SMTP verification and test email pass
- [ ] Cloudinary connectivity check passes
- [ ] Rate limiting behavior is confirmed under burst traffic

## 7. Security Header Validation

- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Strict-Transport-Security: max-age=31536000
- [ ] Content-Security-Policy is present and appropriate

## 8. Performance Validation

- [ ] Run Lighthouse gate:

```bash
npm --prefix satyam-holidays-react run perf:lighthouse
```

- [ ] FCP < 2s
- [ ] TTI < 4s
- [ ] TBT < 300ms
- [ ] CLS < 0.1
- [ ] LCP < 2.5s

## 9. Backup and Rollback Readiness

- [ ] Backup run completed successfully
- [ ] Restore procedure verified in a non-production environment
- [ ] Rollback script is available with a recent backup artifact

## 10. Monitoring and Alerting

- [ ] Sentry receives post-deploy events
- [ ] Uptime checks are active for frontend and backend health endpoints
- [ ] Error-rate and resource-usage alerts are active
- [ ] On-call notification channel is tested

## 11. Final Sign-Off

- [ ] Engineering release owner approval
- [ ] Operations and on-call acknowledgement
- [ ] Product or stakeholder release approval
