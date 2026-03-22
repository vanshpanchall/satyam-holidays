const winston = require("winston");

const NODE_ENV = process.env.NODE_ENV || "development";

// Custom format for dev: colorized, human-readable
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// Production: structured JSON for log aggregation (Datadog, Logtail, CloudWatch)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: NODE_ENV === "production" ? "info" : "debug",
  format: NODE_ENV === "production" ? prodFormat : devFormat,
  defaultMeta: { service: "satyam-holidays-api" },
  transports: [new winston.transports.Console()],
});

// In production (non-serverless), also write to files.
// Skip on Vercel — its filesystem is read-only; logs are captured via console.
if (NODE_ENV === "production" && !process.env.VERCEL) {
  logger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({ filename: "logs/combined.log", maxsize: 5242880, maxFiles: 5 })
  );
}

// Morgan stream for HTTP request logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;
