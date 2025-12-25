// Accepted plan cycles (extend easily)
const ALLOWED_CYCLES = ["1m", "3m", "6m", "12m"];

// Supported base currencies (expand later)
const SUPPORTED_BILLING_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "AUD"];

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * validateSetupBody
 *
 * Ensures:
 * - baseCurrency supported
 * - plans array is valid
 * - amounts in smallest unit (e.g., paise)
 */
export function validateSetupBody(body) {
  if (!body || typeof body !== "object") {
    const err = new Error("Invalid request body");
    err.status = 400;
    throw err;
  }

  // ---- Validate baseCurrency ----
  const baseCurrency = (body.baseCurrency || "").trim().toUpperCase();
  if (!SUPPORTED_BILLING_CURRENCIES.includes(baseCurrency)) {
    const err = new Error(`Unsupported baseCurrency '${body.baseCurrency}'. Supported: ${SUPPORTED_BILLING_CURRENCIES.join(", ")}`);
    err.status = 400;
    throw err;
  }

  // ---- Validate plans ----
  if (!Array.isArray(body.plans) || body.plans.length === 0) {
    const err = new Error("plans[] is required and must not be empty");
    err.status = 400;
    throw err;
  }

  const plans = body.plans.map(plan => {
    if (!plan.cycle || !ALLOWED_CYCLES.includes(plan.cycle)) {
      const err = new Error(`Invalid plan cycle '${plan.cycle}'. Allowed cycles: ${ALLOWED_CYCLES.join(", ")}`);
      err.status = 400;
      throw err;
    }

    if (typeof plan.amount !== "number" || plan.amount <= 0) {
      const err = new Error("Plan amount must be a positive number (in smallest currency unit)");
      err.status = 400;
      throw err;
    }

    // Additional rule: must be integer (paise, cents, etc)
    if (!Number.isInteger(plan.amount)) {
      const err = new Error("Plan amount must be an integer representing smallest currency unit (e.g. paise/cents)");
      err.status = 400;
      throw err;
    }

    return {
      cycle: plan.cycle,
      amount: plan.amount
    };
  });

  // ---- Validate optional idempotencyKey ----
  let idempotencyKey = undefined;
  if (body.idempotencyKey) {
    if (!isUUID(body.idempotencyKey)) {
      const err = new Error("idempotencyKey must be a valid UUID");
      err.status = 400;
      throw err;
    }
    idempotencyKey = body.idempotencyKey;
  }

  return {
    baseCurrency,
    plans,
    idempotencyKey
  };
}
