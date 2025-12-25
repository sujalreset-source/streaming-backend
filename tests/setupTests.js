import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import redisClient from "../utils/redisClient.js";
import request from "supertest";

let mongoServer;
let app;      // MUST BE let (not const)
let api;      // MUST BE let (not const)

beforeAll(async () => {
  // Start in-memory Mongo
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);

  // Connect Redis (only if not ready)
  if (!redisClient.status || redisClient.status !== "ready") {
    await redisClient.connect();
  }

  // Import Express app **AFTER DB is ready**
  const imported = await import("../app.js");
  app = imported.default;
  api = request(app);

  console.log("✅ In-Memory MongoDB + Redis Ready");
});

afterEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  } catch (err) {}
});

afterAll(async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  } catch (err) {}

  try {
    await mongoServer.stop();
  } catch (err) {}

  if (redisClient.status === "ready") {
    await redisClient.quit();
  }

  console.log("🧹 Test DB + Redis Closed");
});

export { api };

