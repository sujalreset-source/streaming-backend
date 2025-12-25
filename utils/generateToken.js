import jwt from "jsonwebtoken";

const generateToken = (user, res) => {
  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
      artistId: user.artistId || null,
    },
    process.env.jwt_secret,
    { expiresIn: "15d" }
  );

  res.cookie("token", token, {
    maxAge: 15 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
  });

  return token;
};

export default generateToken;
