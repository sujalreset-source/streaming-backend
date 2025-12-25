// verifyUploadToken.middleware.js
import jwt from "jsonwebtoken";

export const verifyUploadToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // No Authorization header → skip (fallback to requireAuth)
    if (!authHeader) return next();

    const token = authHeader.split(" ")[1];

    // Try verifying uploadToken
    const decoded = jwt.verify(token, process.env.UPLOAD_TOKEN_SECRET);

    // Only process upload tokens
    if (decoded.type !== "uploadToken") {
      return next(); // fallback to normal auth
    }

    // Inject into req.user as a scoped user context
    req.user = {
      _id: decoded.artistId,
      artistId: decoded.artistId,
      songId: decoded.songId,
      sessionUuid: decoded.sessionUuid,
      isUploadToken: true,
    };

    return next();
  } catch (err) {
    // If token invalid → fallback to normal auth
    return next();
  }
};
