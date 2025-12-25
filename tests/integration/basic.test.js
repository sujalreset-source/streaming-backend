// File: tests/integraton/basic.test.js
import request from "supertest";
import mongoose from "mongoose";
import redisClient from "../../utils/redisClient.js";
import app from "../../app.js";


describe('Basic App Test', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/random-endpoint');
    expect(res.statusCode).toBe(404);
  });
});

