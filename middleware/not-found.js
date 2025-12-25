import logger from "../utils/logger.js";

const notFoundMiddleware = (req, res) => {
  const message = `🔍 404 Not Found - ${req.method} ${req.originalUrl}`;
  logger.warn(message);

  return res.status(404).json({ message: "Route does not exist" });
};

export default notFoundMiddleware;
