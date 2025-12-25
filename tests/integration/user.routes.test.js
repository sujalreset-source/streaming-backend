import request from "supertest";
import { app } from "../../app.js"; // or server.js if you export app

describe("User Routes", () => {
  it("should register a new user", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({
        name: "John Doe",
        email: "john@test.com",
        password: "123456",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("user");
  });

  it("should not register with existing email", async () => {
    await request(app)
      .post("/api/users/register")
      .send({
        name: "Jane",
        email: "john@test.com",
        password: "123456",
      });

    const res = await request(app)
      .post("/api/users/register")
      .send({
        name: "Duplicate",
        email: "john@test.com",
        password: "123456",
      });

    expect(res.statusCode).toBe(400);
  });
});
