import request from "supertest";
import { app } from "../app.js"; // or "../server.js" if you export { app }

export const createUser = async (data = {}) => {
  const defaultUser = {
    name: "Test User",
    email: "test@example.com",
    password: "123456",
  };

  const res = await request(app)
    .post("/api/users/register")
    .send({ ...defaultUser, ...data });

  return res.body;
};
