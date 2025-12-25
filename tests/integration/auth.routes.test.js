import { api } from "../setupTests.js";

describe("Auth API - Extended", () => {
  const userData = {
    name: "John Test",
    email: "john@test.com",
    password: "Password123!",
    dob: "1995-06-15",
  };

  beforeAll(async () => {
    await api.post("/api/users/register").send(userData);
  });

  it("should login successfully with correct credentials", async () => {
    const res = await api.post("/api/users/login").send({
      email: userData.email,
      password: userData.password,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(userData.email);
  });

  it("should reject login with invalid password", async () => {
    const res = await api.post("/api/users/login").send({
      email: userData.email,
      password: "wrongpass",
    });
    expect(res.statusCode).toBe(401);
  });

  it("should reject registration with missing fields", async () => {
    const res = await api.post("/api/users/register").send({
      email: "missing@field.com",
    });
    expect(res.statusCode).toBe(400);
  });

  it("should block access to a protected route without token", async () => {
    const res = await api.get("/api/user/dashboard/purchases");
    expect(res.statusCode).toBe(401);
  });
});
