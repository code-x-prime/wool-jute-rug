import app from "./app.js";
import dotenv from "dotenv";
import { prisma } from "./config/db.js";
import { initStorageConfig } from "./utils/storageService.js";

dotenv.config({ path: ".env" });

const PORT = process.env.PORT || 4001;

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Application should continue running despite unhandled promises
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Give server time to handle ongoing requests before shutting down
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("Shutting down gracefully...");
  try {
    await prisma.$disconnect();
    console.log("Database disconnected successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Connect to the database and start the server
prisma
  .$connect()
  .then(async () => {
    try {
      await initStorageConfig();
    } catch (e) {
      console.warn("Storage config init:", e.message);
    }
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} 🚀`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to the database:", error);
    process.exit(1);
  });
