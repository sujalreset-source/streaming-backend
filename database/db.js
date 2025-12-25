// utils/connectDb.js
import mongoose from "mongoose";

mongoose.set("strictQuery", true); // Recommended for Mongoose v7+

const connectDb = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URL, {
        dbName: process.env.MONGO_DB_NAME || undefined, // optional
      });

      console.log(process.env.MONGO_URL);
      console.log(`✅ MongoDB connected: ${conn.connection.host} / DB: ${conn.connection.name}`);

      // Gracefully close on process termination
      process.on("SIGINT", async () => {
        await mongoose.connection.close();
        console.log("🔌 MongoDB disconnected through app termination");
        process.exit(0);
      });

      return; // success
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${retries + 1} failed:`, error.message);
      retries++;
      if (retries >= maxRetries) {
        console.error("💥 Maximum retries reached. Exiting...");
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, 3000)); // wait 3s before retry
    }
  }
};

export default connectDb;

