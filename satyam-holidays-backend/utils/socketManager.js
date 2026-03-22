// Singleton to share the Socket.io instance across the app
let io = null;

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
      const logger = require("./logger");
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

  // Convenience: emit to all connected admin clients
  emitNewEnquiry(enquiry) {
    if (io) {
      io.emit("new-enquiry", {
        _id: enquiry._id,
        name: enquiry.name,
        destination: enquiry.destination,
        phone: enquiry.phone,
        status: enquiry.status,
        createdAt: enquiry.createdAt,
      });
    }
  },

  emitEnquiryUpdate(enquiry) {
    if (io) {
      io.emit("enquiry-updated", {
        _id: enquiry._id,
        status: enquiry.status,
      });
    }
  },
};
