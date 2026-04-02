const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const path = require("path");
const compression = require("compression");
const morgan = require("morgan");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const { randomUUID } = require("crypto");
const client = require("prom-client");
require("dotenv").config();

const logger = require("./utils/logger");
const socketManager = require("./utils/socketManager");

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

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Import routes
const enquiryRoutes = require("./routes/enquiries");
const packageRoutes = require("./routes/packages");
const reviewRoutes = require("./routes/reviews");
const authRoutes = require("./routes/auth");
const settingsRoutes = require("./routes/settings");

// Security middleware
app.use(helmet());
app.set("trust proxy", 1);
app.use(hpp());
app.use(mongoSanitize());
app.use(compression());
if (NODE_ENV !== "test") {
  app.use(morgan(NODE_ENV === "production" ? "combined" : "dev", { stream: logger.stream }));
}

// Per-route CSP for API (APIs generally set a restrictive CSP)
const apiCsp = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'none'"],
  },
});
app.use("/api", apiCsp);

// Request ID middleware and morgan token
app.use((req, _res, next) => {
  req.id = req.headers["x-request-id"] || randomUUID();
  next();
});
morgan.token("id", (req) => req.id);

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

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// Rate limiting — skip public read-only routes so the homepage always loads
const limiter = rateLimit({
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
  windowMs: 15 * 60 * 1000,
  max: 20, // at most 20 submissions per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      const envList = (process.env.CORS_ORIGIN || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const allowed = new Set(
        [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:5173",
          process.env.FRONTEND_ORIGIN,
          ...envList,
        ].filter(Boolean)
      );
      if (!origin || allowed.has(origin)) return callback(null, true);
      callback(new Error(`CORS blocked for origin: ${origin}`));
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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/enquiries", (req, res, next) => {
  if (req.method === "POST") return postEnquiryLimiter(req, res, next);
  return next();
});
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/settings", settingsRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  const isHealthy = dbState === 1;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "OK" : "DEGRADED",
    message: "Satyam Holidays API is running",
    timestamp: new Date().toISOString(),
    database: dbStatus[dbState] || "unknown",
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Satyam Holidays API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      enquiries: "/api/enquiries",
      packages: "/api/packages",
      reviews: "/api/reviews",
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
    })
    .catch((err) => logger.error("Database initialization failed", { error: err.message }));
}

// Export the Express app directly for supertest compatibility, and attach redisClient
module.exports = app;
module.exports.redisClient = redisClient;
