// Singleton to share Socket.io & Pusher instances across the app
let io = null;
let pusher = null;
const logger = require("./logger");

const hasPusherConfig =
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.PUSHER_CLUSTER;

if (hasPusherConfig) {
  try {
    const Pusher = require("pusher");
    pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    });
    logger.info("[realtime] Pusher initialized successfully");
  } catch (error) {
    logger.error("[realtime] Failed to initialize Pusher, falling back to Socket.io only:", error);
  }
} else {
  logger.info("[realtime] Pusher credentials missing; running in local Socket.io-only mode");
}

module.exports = {
  init(server) {
    const { Server } = require("socket.io");
    io = new Server(server, {
      cors: {
        origin: (process.env.CORS_ORIGIN || "http://localhost:3000")
          .split(",")
          .map((s) => s.trim()),
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      logger.info("Socket.io client connected", { socketId: socket.id });

      socket.on("disconnect", () => {
        logger.debug("Socket.io client disconnected", { socketId: socket.id });
      });
    });

    return io;
  },

  getIO() {
    return io;
  },

  getPusher() {
    return pusher;
  },

  // Convenience: emit to all connected admin clients
  emitNewEnquiry(enquiry) {
    const payload = {
      _id: enquiry._id,
      name: enquiry.name,
      destination: enquiry.destination,
      phone: enquiry.phone,
      status: enquiry.status,
      createdAt: enquiry.createdAt,
      leadScore: enquiry.leadScore,
      slaStatus: enquiry.slaStatus,
    };

    if (io) {
      io.emit("new-enquiry", payload);
    }

    if (pusher) {
      pusher.trigger("admin-enquiries", "new-enquiry", payload).catch((err) => {
        logger.error("[realtime] Pusher trigger failed for new-enquiry:", err);
      });
    }
  },

  emitEnquiryUpdate(enquiry) {
    const payload = {
      _id: enquiry._id,
      status: enquiry.status,
      slaStatus: enquiry.slaStatus,
      respondedAt: enquiry.respondedAt,
    };

    if (io) {
      io.emit("enquiry-updated", payload);
    }

    if (pusher) {
      pusher.trigger("admin-enquiries", "enquiry-updated", payload).catch((err) => {
        logger.error("[realtime] Pusher trigger failed for enquiry-updated:", err);
      });
    }
  },
};
