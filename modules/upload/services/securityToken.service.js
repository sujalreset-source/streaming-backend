// securityToken.service.js
import jwt from "jsonwebtoken";

export const createUploadToken = ({ sessionUuid, artistId, songId }) => {
  return jwt.sign(
    {
      sessionUuid,
      artistId,
      songId,
      type: "uploadToken",
    },
    process.env.UPLOAD_TOKEN_SECRET,
    { expiresIn: "65m" }
  );
};
