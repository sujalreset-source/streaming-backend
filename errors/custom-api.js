class CustomAPIError extends Error {
  constructor(message) {
    super(message);
    this.name = "CustomAPIError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export default CustomAPIError;