const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const compression = require("compression");
const morgan = require("morgan");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const { randomUUID } = require("crypto");
const client = require("prom-client");
require("dotenv").config();

const logger = require("./utils/logger");
const socketManager = require("./utils/socketManager");
const { setCsrfToken, validateCsrf, getCsrfToken } = require("./middleware/csrf");
const jwt = require("jsonwebtoken");
const rateLimiterStore = require("./middleware/rateLimiterStore");

const isPublicStateChangingRoute = (req) => {
  const path = req.originalUrl.split("?")[0];
  const method = req.method;

  if (method === "POST") {
    // 1. AI generate
    if (/\/api\/(v1\/)?ai\/generate\/?$/i.test(path)) return true;
    // 2. Package calculate price
    if (/\/api\/(v1\/)?packages\/[a-f\d]{24}\/calculate-price\/?$/i.test(path)) return true;
    // 3. Submit enquiry
    if (/\/api\/(v1\/)?enquiries\/?$/i.test(path)) return true;
    // 4. Create review
    if (/\/api\/(v1\/)?reviews\/?$/i.test(path)) return true;
  }

  if (method === "PATCH") {
    // 5. Helpful review vote
    if (/\/api\/(v1\/)?reviews\/[a-f\d]{24}\/helpful\/?$/i.test(path)) return true;
  }

  return false;
};

// CSRF middleware that skips validation when a valid admin JWT is present in the Authorization header.
// Cookie auth sessions must always undergo CSRF checks.
const csrfUnlessAuthed = (req, res, next) => {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) return next();

  // Check for valid admin JWT in Authorization header — if present, skip CSRF
  const headerToken = req.header("Authorization")?.replace("Bearer ", "");

  if (headerToken && process.env.JWT_SECRET) {
    try {
      jwt.verify(headerToken, process.env.JWT_SECRET);
      return next(); // Valid Authorization header token — skip CSRF
    } catch {
      // Token invalid — fall through to CSRF check
    }
  }

  // Bypass CSRF checks for public/anonymous endpoints to support cross-domain third-party cookie restrictions
  if (isPublicStateChangingRoute(req)) {
    return next();
  }

  // Enforce CSRF for cookie auth or admin requests
  return validateCsrf(req, res, next);
};

// Sentry error tracking (optional — only if SENTRY_DSN is configured)
let Sentry = null;
if (process.env.SENTRY_DSN) {
  Sentry = require("@sentry/node");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  });
  logger.info("Sentry error tracking initialized");
}

// Redis setup for caching (optional)
let redisClient = null;
if (process.env.REDIS_URL && process.env.REDIS_URL.trim() && process.env.NODE_ENV !== "test") {
  try {
    const redis = require("redis");
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 60000,
        lazyConnect: true,
      },
    });

    redisClient.on("error", (err) => {
      logger.error("Redis connection error", { error: err.message });
    });

    redisClient.on("connect", () => {
      logger.info("Connected to Redis");
    });

    redisClient.connect().catch((err) => {
      logger.warn("Redis connection failed, continuing without Redis caching", {
        error: err.message,
      });
    });
  } catch (e) {
    logger.warn("Redis not available, continuing without Redis caching", { error: e.message });
    redisClient = null;
  }
} else {
  logger.info("Redis not configured (REDIS_URL missing). Skipping Redis initialization.");
}

// Initialize cache service with Redis client (avoids circular dependency)
const cacheService = require("./utils/cache");
cacheService.init(redisClient);
rateLimiterStore.init(redisClient);

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";
const ENFORCE_HTTPS = IS_PRODUCTION && process.env.ENFORCE_HTTPS !== "false";
const DEV_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
];

function parseOrigins(origins = "") {
  return String(origins)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function validateProductionConfig() {
  if (!IS_PRODUCTION) return;

  const errors = [];
  const warnings = [];
  const strictMode = process.env.STRICT_PRODUCTION_CONFIG === "true";

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push("JWT_SECRET must be set and at least 32 characters long.");
  }

  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
    errors.push("ADMIN_PASSWORD must be set and at least 12 characters long.");
  }

  const mongoUri = process.env.MONGODB_URI || "";
  if (!mongoUri) {
    errors.push("MONGODB_URI must be set in production.");
  } else if (!/^mongodb\+srv:\/\//i.test(mongoUri)) {
    if (process.env.ALLOW_NON_ATLAS_DB === "true") {
      warnings.push("Non-Atlas MongoDB URI is enabled via ALLOW_NON_ATLAS_DB=true.");
    } else {
      errors.push("MONGODB_URI must use mongodb+srv:// (MongoDB Atlas) in production.");
    }
  }

  const corsOrigins = new Set(parseOrigins(process.env.CORS_ORIGIN));
  if (process.env.FRONTEND_ORIGIN) {
    corsOrigins.add(process.env.FRONTEND_ORIGIN.trim());
  }

  if (corsOrigins.has("*")) {
    errors.push("CORS allowlist cannot contain '*' when credentials are enabled.");
  }

  if (corsOrigins.size === 0) {
    errors.push("CORS_ORIGIN or FRONTEND_ORIGIN must be configured in production.");
  }

  for (const origin of corsOrigins) {
    if (/localhost|127\.0\.0\.1/i.test(origin)) {
      warnings.push(`Localhost origin is configured in production CORS allowlist: ${origin}`);
    }
  }

  if (process.env.CAPTCHA_ENFORCE !== "true") {
    warnings.push("CAPTCHA_ENFORCE is not true in production.");
  }

  if (!process.env.SENTRY_DSN) {
    warnings.push("SENTRY_DSN is not configured. Error monitoring will be limited.");
  }

  const hasCloudinary =
    !!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET;
  if (!hasCloudinary) {
    warnings.push("Cloudinary credentials are not fully configured.");
  }

  const hasSmtpConfig =
    !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
  const hasGmailFallback = !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS;
  if (!hasSmtpConfig && !hasGmailFallback) {
    warnings.push("Email provider credentials are not configured.");
  }

  if (!process.env.REDIS_URL) {
    warnings.push("REDIS_URL is not configured. Caching and Redis alerts will be limited.");
  }

  const provider = (process.env.CAPTCHA_PROVIDER || "recaptcha_v2").toLowerCase();
  if (provider.startsWith("hcaptcha")) {
    if (!process.env.HCAPTCHA_SECRET) {
      warnings.push("HCAPTCHA_SECRET is missing while CAPTCHA_PROVIDER is hcaptcha.");
    }
  } else if (provider.startsWith("recaptcha")) {
    if (!process.env.RECAPTCHA_SECRET) {
      warnings.push("RECAPTCHA_SECRET is missing while CAPTCHA_PROVIDER uses recaptcha.");
    }
  } else {
    warnings.push(`Unsupported CAPTCHA_PROVIDER "${provider}".`);
  }

  if (errors.length > 0) {
    const message = `Invalid production configuration:\n- ${errors.join("\n- ")}`;
    if (strictMode) {
      throw new Error(message);
    }
    logger.error(
      `${message}\nProceeding in degraded mode (set STRICT_PRODUCTION_CONFIG=true to fail fast).`
    );
  }

  warnings.forEach((warning) => logger.warn(warning));
}

validateProductionConfig();

// Import routes
const enquiryRoutes = require("./routes/enquiries");
const packageRoutes = require("./routes/packages");
const reviewRoutes = require("./routes/reviews");
const authRoutes = require("./routes/auth");
const settingsRoutes = require("./routes/settings");
const crmRoutes = require("./routes/crm");
const aiRoutes = require("./routes/ai");

// Security middleware with production hardening
app.use(
  helmet({
    contentSecurityPolicy: IS_PRODUCTION,
    crossOriginEmbedderPolicy: IS_PRODUCTION,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// Explicit legacy XSS header for scanners and legacy user agents
app.use((_req, res, next) => {
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Attach a unique request ID for tracing and include in response headers
app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || randomUUID();
  res.setHeader("X-Request-ID", req.id);
  next();
});

// Trust proxy for rate limiting behind reverse proxy/load balancer
app.set("trust proxy", IS_PRODUCTION ? 1 : false);

// Security middleware
app.use(hpp()); // HTTP Parameter Pollution protection
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(compression()); // Gzip compression
app.use(cookieParser());

// Request logging
if (NODE_ENV !== "test") {
  if (NODE_ENV === "production") {
    app.use(
      morgan(
        (tokens, req, res) => {
          return JSON.stringify({
            requestId: req.id,
            method: tokens.method(req, res),
            url: tokens.url(req, res),
            status: Number(tokens.status(req, res)),
            responseTimeMs: Number(tokens["response-time"](req, res) || 0),
            contentLength: Number(tokens.res(req, res, "content-length") || 0),
            ip: tokens["remote-addr"](req, res),
            referrer: tokens.referrer(req, res),
            userAgent: tokens["user-agent"](req, res),
          });
        },
        { stream: logger.stream }
      )
    );
  } else {
    app.use(morgan("dev", { stream: logger.stream }));
  }
}

// Per-route CSP for API (APIs generally set a restrictive CSP)
const apiCsp = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'none'"],
  },
});
app.use("/api", apiCsp);

// morgan token for request ID (ID is set in the middleware above)
morgan.token("id", (req) => req.id);

// Redirect HTTP -> HTTPS in production (except local/dev hosts and health checks)
app.use((req, res, next) => {
  if (!ENFORCE_HTTPS) return next();
  if (req.path === "/api/health" || req.path === "/api/v1/health") return next();

  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const isSecure = req.secure || forwardedProto === "https";
  const host = String(req.headers.host || "");
  const isLocalHost = /^localhost(:\d+)?$/i.test(host) || /^127\.0\.0\.1(:\d+)?$/i.test(host);

  if (isSecure || isLocalHost || !host) return next();

  return res.redirect(301, `https://${host}${req.originalUrl}`);
});

// Prometheus metrics
client.collectDefaultMetrics();
const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});
const httpDurationHistogram = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
});
const dbConnectionStateGauge = new client.Gauge({
  name: "mongodb_connection_state",
  help: "MongoDB connection readyState (0=disconnected,1=connected,2=connecting,3=disconnecting)",
});
const dbConnectionsCurrentGauge = new client.Gauge({
  name: "mongodb_connections_current",
  help: "Current MongoDB server connections",
});
const dbConnectionsAvailableGauge = new client.Gauge({
  name: "mongodb_connections_available",
  help: "Available MongoDB server connections",
});
const redisConnectionUpGauge = new client.Gauge({
  name: "redis_connection_up",
  help: "Redis connection status (1=connected,0=disconnected)",
});
const redisConnectionExpectedGauge = new client.Gauge({
  name: "redis_connection_expected",
  help: "Whether Redis is expected (1 when REDIS_REQUIRED=true)",
});
const diskTotalBytesGauge = new client.Gauge({
  name: "system_disk_total_bytes",
  help: "Total bytes on the host filesystem for current working directory",
});
const diskFreeBytesGauge = new client.Gauge({
  name: "system_disk_free_bytes",
  help: "Free bytes on the host filesystem for current working directory",
});
const diskUsageRatioGauge = new client.Gauge({
  name: "system_disk_usage_ratio",
  help: "Filesystem disk usage ratio (0-1)",
});

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const route = req.route?.path || req.path || "unknown";
    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };
    httpRequestCounter.inc(labels);
    const diff = Number(process.hrtime.bigint() - start) / 1e9; // seconds
    httpDurationHistogram.observe(labels, diff);
  });
  next();
});

async function updateOperationalMetrics() {
  dbConnectionStateGauge.set(mongoose.connection.readyState);
  redisConnectionExpectedGauge.set(process.env.REDIS_REQUIRED === "true" ? 1 : 0);
  redisConnectionUpGauge.set(redisClient && redisClient.isOpen ? 1 : 0);

  try {
    const stat = await fs.promises.statfs(process.cwd());
    const total = Number(stat.blocks) * Number(stat.bsize);
    const free = Number(stat.bavail || stat.bfree) * Number(stat.bsize);
    if (Number.isFinite(total) && total > 0) {
      diskTotalBytesGauge.set(total);
      diskFreeBytesGauge.set(Math.max(0, free));
      diskUsageRatioGauge.set(Math.min(1, Math.max(0, (total - free) / total)));
    }
  } catch (error) {
    logger.debug("Disk metric collection skipped", { error: error.message });
  }

  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    try {
      const status = await mongoose.connection.db.admin().serverStatus();
      if (status?.connections) {
        dbConnectionsCurrentGauge.set(Number(status.connections.current || 0));
        dbConnectionsAvailableGauge.set(Number(status.connections.available || 0));
      }
    } catch (error) {
      logger.debug("MongoDB pool metrics unavailable", { error: error.message });
    }
  }
}

if (NODE_ENV !== "test") {
  updateOperationalMetrics().catch(() => {
    /* ignore initial scrape errors */
  });
  const metricsInterval = setInterval(() => {
    updateOperationalMetrics().catch((error) => {
      logger.debug("Operational metrics update failed", { error: error.message });
    });
  }, 30000);
  metricsInterval.unref();
}

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// Rate limiting — skip public read-only routes so the homepage always loads
const limiter = rateLimit({
  store: new rateLimiterStore.DistributedRateLimitStore("rl:api:"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === "production" ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't rate-limit public GET endpoints (packages, reviews, health)
    if (
      req.method === "GET" &&
      (req.path.startsWith("/api/packages") ||
        req.path.startsWith("/api/reviews") ||
        req.path.startsWith("/api/settings") ||
        req.path === "/api/health")
    )
      return true;
    return false;
  },
});
app.use(limiter);
// Stricter rate limit for enquiry submissions
const postEnquiryLimiter = rateLimit({
  store: new rateLimiterStore.DistributedRateLimitStore("rl:enquiry:"),
  windowMs: 15 * 60 * 1000,
  max: 20, // at most 20 submissions per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const allowedOrigins = new Set(
  [
    ...(IS_PRODUCTION ? [] : DEV_CORS_ORIGINS),
    process.env.FRONTEND_ORIGIN,
    ...parseOrigins(process.env.CORS_ORIGIN),
  ]
    .filter(Boolean)
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "*") // strictly disallow "*" when credentials: true
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      logger.warn("CORS blocked for origin", { origin });
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files (backward compat for old local uploads)
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

// Database connection (cached for serverless)
let cachedDb = null;
async function connectDatabase() {
  // Return cached connection if available (for serverless)
  if (cachedDb && mongoose.connection.readyState === 1) {
    return "mongodb (cached)";
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined in the environment variables.");

  try {
    await mongoose.connect(uri);
    cachedDb = mongoose.connection;
    return "mongodb (Atlas/Remote)";
  } catch (err) {
    throw new Error(`Failed to connect to database using URI. Details: ${err.message}`);
  }
}

// Ensure database connection for each request (serverless support)
app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    next();
  } catch (err) {
    logger.error("Database connection failed", { error: err.message });
    res.status(503).json({ success: false, message: "Database unavailable" });
  }
});

// CSRF token setup - set on initial requests, provide endpoint to get fresh token
app.use(setCsrfToken);
app.get("/api/csrf-token", getCsrfToken);
app.get("/api/v1/csrf-token", getCsrfToken); // v1 alias

// API v1 Routes - primary versioned endpoints
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/enquiries", (req, res, next) => {
  if (req.method === "POST") return postEnquiryLimiter(req, res, next);
  return next();
});
app.use("/api/v1/enquiries", csrfUnlessAuthed, enquiryRoutes);
app.use("/api/v1/packages", csrfUnlessAuthed, packageRoutes);
app.use("/api/v1/reviews", csrfUnlessAuthed, reviewRoutes);
app.use("/api/v1/settings", csrfUnlessAuthed, settingsRoutes);
app.use("/api/v1/crm", csrfUnlessAuthed, crmRoutes);
app.use("/api/v1/ai", csrfUnlessAuthed, aiRoutes);

// Legacy /api/* routes (backward compatibility - will be deprecated)
app.use("/api/auth", authRoutes);
app.use("/api/enquiries", (req, res, next) => {
  if (req.method === "POST") return postEnquiryLimiter(req, res, next);
  return next();
});
app.use("/api/enquiries", csrfUnlessAuthed, enquiryRoutes);
app.use("/api/packages", csrfUnlessAuthed, packageRoutes);
app.use("/api/reviews", csrfUnlessAuthed, reviewRoutes);
app.use("/api/settings", csrfUnlessAuthed, settingsRoutes);
app.use("/api/crm", csrfUnlessAuthed, crmRoutes);
app.use("/api/ai", csrfUnlessAuthed, aiRoutes);

// Health check endpoint (both versioned and non-versioned)
const healthHandler = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  const isHealthy = dbState === 1;
  const redisStatus = !process.env.REDIS_URL
    ? "not_configured"
    : redisClient && redisClient.isOpen
      ? "connected"
      : "disconnected";
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "OK" : "DEGRADED",
    message: "Satyam Holidays API is running",
    version: "1.0.0",
    apiVersion: "v1",
    timestamp: new Date().toISOString(),
    database: dbStatus[dbState] || "unknown",
    redis: redisStatus,
    integrations: {
      sentry: !!process.env.SENTRY_DSN,
      cloudinary:
        !!process.env.CLOUDINARY_CLOUD_NAME &&
        !!process.env.CLOUDINARY_API_KEY &&
        !!process.env.CLOUDINARY_API_SECRET,
      emailProvider:
        (!!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS) ||
        (!!process.env.EMAIL_USER && !!process.env.EMAIL_PASS),
    },
    uptime: process.uptime(),
  });
};
app.get("/api/health", healthHandler);
app.get("/api/v1/health", healthHandler);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Satyam Holidays API",
    version: "1.0.0",
    apiVersion: "v1",
    endpoints: {
      health: "/api/v1/health",
      enquiries: "/api/v1/enquiries",
      packages: "/api/v1/packages",
      reviews: "/api/v1/reviews",
      settings: "/api/v1/settings",
      auth: "/api/v1/auth",
    },
    deprecation: {
      message: "Non-versioned /api/* endpoints are deprecated. Please migrate to /api/v1/*",
    },
  });
});

// Global error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";
  let isOperational = err.isOperational || false;

  // Log error details
  const errorLog = {
    requestId: req.id,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  };

  // Handle specific error types
  if (err.name === "ValidationError") {
    // Mongoose validation error
    statusCode = 400;
    message = "Validation failed";
    isOperational = true;
  } else if (err.name === "CastError") {
    // Mongoose bad ObjectId
    statusCode = 400;
    message = "Invalid ID format";
    isOperational = true;
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 400;
    message = "Duplicate field value";
    isOperational = true;
  } else if (err.name === "JsonWebTokenError") {
    // JWT errors
    statusCode = 401;
    message = "Invalid token";
    isOperational = true;
  } else if (err.name === "TokenExpiredError") {
    // JWT expired
    statusCode = 401;
    message = "Token expired";
    isOperational = true;
  }

  // Log the error
  if (Sentry && statusCode >= 500) {
    Sentry.captureException(err);
  }

  if (statusCode >= 500) {
    logger.error("Server Error", { ...errorLog, statusCode, message });
  } else {
    logger.warn("Client Error", { ...errorLog, statusCode, message });
  }

  // Send response
  const response = {
    success: false,
    message,
    ...(NODE_ENV === "development" && {
      error: err.message,
      stack: err.stack,
      isOperational,
    }),
  };

  // Add request ID if available
  if (req.id) {
    response.requestId = req.id;
  }

  res.status(statusCode).json(response);
});

// 404 handler - must be after all routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Graceful shutdown
function gracefulShutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  const server = app._server;
  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed");
      try {
        await mongoose.connection.close();
        logger.info("MongoDB connection closed");
      } catch (_) {
        /* ignore */
      }
      if (redisClient) {
        try {
          await redisClient.quit();
        } catch (_) {
          /* ignore */
        }
      }
      process.exit(0);
    });
    // Force close after 10s
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Start server immediately; connect DB in background
// Skip server.listen for Vercel serverless (VERCEL env var is set automatically)
if (NODE_ENV !== "test" && !process.env.VERCEL) {
  const server = http.createServer(app);
  socketManager.init(server);

  server.listen(PORT, () => {
    logger.info(`🚀 Satyam Holidays API server running on port ${PORT}`);
    logger.info(`📧 Email: satyamholidays19@gmail.com`);
    logger.info(`🌐 Environment: ${NODE_ENV}`);
    logger.info(`🔌 Socket.io ready for real-time connections`);
  });
  app._server = server;

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Initial database connection and seeding (non-serverless only)
  connectDatabase()
    .then(async (kind) => {
      logger.info(`🗄️  Database ready: ${kind}`);

      // Start background worker queue processor
      try {
        const queueService = require("./utils/queue");
        queueService.startProcessing();
      } catch (queueErr) {
        logger.error("Failed to start queue processor", { error: queueErr.message });
      }

      try {
        const Package = require("./models/Package");
        const packageCount = await Package.countDocuments();
        if (packageCount === 0) {
          logger.info("No packages found in DB. Seeding initial data...");
          const seedData = require("./seedData");
          await Package.insertMany(seedData);
          logger.info("Successfully seeded packages!");
        }
      } catch (seedErr) {
        logger.error("Failed to seed packages", { error: seedErr.message });
      }

      // Seed initial administrator if none exist
      try {
        const User = require("./models/User");
        const userCount = await User.countDocuments();
        if (userCount === 0) {
          const email = process.env.ADMIN_EMAIL || "admin@satyamholidays.com";
          const password = process.env.ADMIN_PASSWORD || "admin12345678";
          logger.info(`No users found in DB. Seeding initial admin user: ${email}...`);

          const bcrypt = require("bcryptjs");
          const hashedPassword = await bcrypt.hash(password, 10);

          await User.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            name: "Initial Admin",
            role: "admin",
            mfaEnabled: false,
          });
          logger.info("Successfully seeded initial admin user!");
        }
      } catch (userErr) {
        logger.error("Failed to seed admin user", { error: userErr.message });
      }
    })
    .catch((err) => logger.error("Database initialization failed", { error: err.message }));
}

// Export the Express app directly for supertest compatibility, and attach redisClient
module.exports = app;
module.exports.redisClient = redisClient;
