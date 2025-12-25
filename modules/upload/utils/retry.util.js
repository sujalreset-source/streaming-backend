// retry.util.js

/**
 * retryPromise:
 * A generic retry wrapper for async functions.
 *
 * @param {Function} fn - async function that returns a promise
 * @param {Object} options
 * @param {number} options.retries - number of retries
 * @param {number} options.backoff - base delay in ms
 * @param {boolean} options.jitter - random jitter addition
 *
 * @returns {Promise<any>}
 */
export async function retryPromise(fn, {
  retries = 3,
  backoff = 200,
  jitter = true,
} = {}) {

  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn(); // SUCCESS
    } catch (err) {
      lastError = err;

      // If last attempt → throw immediately
      if (attempt === retries) {
        throw err;
      }

      // Calculate delay
      const wait = backoff * Math.pow(2, attempt - 1); // 200 → 400 → 800ms
      const jitterVal = jitter ? Math.floor(Math.random() * 50) : 0;
      const delay = wait + jitterVal;

      console.warn(
        `[Retry] Attempt ${attempt} failed. Retrying in ${delay}ms…`,
        err.message
      );

      // Wait before next retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError; // fallback
}
