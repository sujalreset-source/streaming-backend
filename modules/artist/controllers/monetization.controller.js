import { validateSetupBody } from "../validators/monetetization.validators.js";
import * as enqueueService from "../services/monetization.enqueue.service.js";

/**
 * POST /api/v2/artist/:artistId/monetize
 *
 * Responsibilities:
 * - Validate request payload
 * - Enforce ownership/auth (req.user)
 * - Trigger enqueue service to start async monetization setup
 * - Return operationId + auditId (202 Accepted)
 */
export async function setupMonetizationController(req, res, next) {
  try {
    const userId = req.user._id;
    const artistId = req.params.artistId || req.user.artistId;

    // Step 1: validation
    const { baseCurrency, plans, idempotencyKey } = validateSetupBody(req.body);

    // Step 2: enqueue async job
    const { operationId, auditId } = await enqueueService.enqueueMonetizationSetup({
      artistId,
      userId,
      baseCurrency,
      plans,
      clientIdempotencyKey: idempotencyKey
    });

    // Step 3: respond accepted (async)
    return res.status(202).json({
      success: true,
      message: "Monetization setup accepted and queued for processing.",
      operationId,
      auditId
    });
  } catch (err) {
    return next(err);
  }
}
