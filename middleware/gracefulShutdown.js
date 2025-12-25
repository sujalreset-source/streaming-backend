// File: middleware/gracefulShutdown.js
const gracefulShutdown = (server, mongoose) => {
  const shutdown = async (signal) => {
    console.log(`\n🛑 ${signal} received. Closing server...`);
    if (server) {
      server.close(() => console.log("🧹 HTTP server closed."));
    }

    try {
      await mongoose.connection.close();
      console.log("📦 MongoDB connection closed.");
    } catch (err) {
      console.error("❌ Error closing MongoDB:", err.message);
    }

    process.exit(0);
  };

  ["SIGINT", "SIGTERM"].forEach(signal => {
    process.on(signal, () => shutdown(signal));
  });
};

export default gracefulShutdown;
