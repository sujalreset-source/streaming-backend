import CustomAPIError from "./custom-api.js";

class UnauthorizedError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.name = "UnauthorizedError";
    this.statusCode = 401;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default UnauthorizedError;