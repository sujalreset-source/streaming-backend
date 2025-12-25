import { artistApplicationRepository } from "../repositories/artist-application.repository.js";
import { Artist } from "../models/artist.model.js";
import { User } from "../../../models/User.js";

/**
 * Artist Application Service (Business Logic)
 * ---------------------------------------------------------
 * All business rules related to:
 *  - Creating application
 *  - Updating/reapplying
 *  - Fetching user application
 *  - Validation checks
 *
 * No DB calls directly — only via repository.
 * No Express-specific code. Pure logic.
 */
class ArtistApplicationService {
  /**
   * Submit or re-submit an artist application
   */
  async submit(userId, payload) {
    const {
      stageName,
      legalName,
      bio,
      contact,
      socials,
      documents,
      samples,
      taxInfo,
      country,
    } = payload;

    // -----------------------------------
    // 1. Cannot apply if already an artist
    // -----------------------------------
    const existingArtist = await Artist.findOne({ createdBy: userId })
      .select("_id")
      .lean();

    if (existingArtist) {
      throw new Error("You are already an approved artist.");
    }

    // -----------------------------------
    // 2. Check for existing application
    // -----------------------------------
    const existingApp = await artistApplicationRepository.findByUserId(userId);

    // ----- Case A: user already has pending app -----
    if (existingApp && existingApp.status === "pending") {
      throw new Error("You already have a pending artist application.");
    }

    // ----- Case B: needs info -----
    if (existingApp && existingApp.status === "needs_info") {
      throw new Error(
        "Your application requires more information. Please update it rather than creating a new one."
      );
    }

    // ----- Case C: rejected (user allowed to reapply up to 5 times) -----
    if (existingApp && existingApp.status === "rejected") {
      if (existingApp.attemptCount >= 50) {
        throw new Error(
          "You have reached the maximum number of re-application attempts. Please contact support."
        );
      }


     

      // Re-apply logic
      const updatedApp = await artistApplicationRepository.reapply(
        existingApp._id,
        {
          stageName,
          legalName,
          bio,
          contact,
          socials,
          documents,
          samples,
          taxInfo,
          country
        }
      );

      return updatedApp;
    }

    // -----------------------------------
    // 3. No previous app → create new one
    // -----------------------------------
    const newApp = await artistApplicationRepository.createApplication({
      userId,
      stageName,
      legalName,
      bio,
      contact,
      socials,
      documents,
      samples,
      taxInfo,
      status: "pending",
      country,
      attemptCount: 1,
    });

     // Update user role to artist-pending if not already

      const updatedUser = await User.findByIdAndUpdate(userId, { role: "artist-pending" });
      console.log("Updated user role to artist-pending:", updatedUser);
   console.log("newApp", newApp);
    return newApp;
  }

  /**
   * Fetch logged-in user's application
   */
  async getMyApplication(userId) {
    const app = await artistApplicationRepository.findByUserId(userId);
    if (!app) {
      throw new Error("No artist application found.");
    }
    return app;
  }


   async  updateApplicationByUser(userId, updates = {}) {
  // Find the user's active application
  const application = await artistApplicationRepository.findByUserId(userId);

  if (!application) {
    const err = new Error("Artist application not found for user.");
    err.statusCode = 404;
    throw err;
  }

  // Only allow updates when application was asked for more info
  if (application.status !== "needs_info") {
    const err = new Error("Cannot update application in its current state.");
    err.statusCode = 409;
    throw err;
  }

  // Apply changes and bump attemptCount, set status -> pending
  const updatePayload = {
    ...updates,
    status: "pending",
    attemptCount: (application.attemptCount || 1) + 1,
    // Clear admin reviewer info since it's resubmitted
    adminReviewer: null,
    adminNotes: null,
    reviewedAt: null,
  };

  const updatedApplication = await artistApplicationRepository.updateById(
    application._id,
    updatePayload
  );

  // Optionally: enqueue admin notification that the app was resubmitted.
  // await notificationProducer.enqueueApplicationNotification({
  //   type: "application_resubmitted",
  //   userId: application.userId,
  //   applicationId: updatedApplication._id,
  //   notes: null
  // });

  return { updatedApplication, oldStatus: application.status };
}
  /**
   * Admin: list applications with pagination, filters, search
   */
  async listApplicationsForAdmin(queryParams) {
    const {
      status = null,
      search = "",
      page = 1,
      limit = 20,
    } = queryParams;

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      artistApplicationRepository.findForAdmin({
        status,
        search,
        limit,
        skip,
      }),
      artistApplicationRepository.countForAdmin({ status, search }),
    ]);

    return {
      applications,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: fetch single application with details
   */
  async getApplicationById(id) {
    const app = await artistApplicationRepository.findByIdDoc(id);
    if (!app) {
      throw new Error("Artist application not found.");
    }
    return app;
  }

  /**
   * Admin: approve application (business logic only)
   * Controller will call ArtistApplication.approveAndCreateArtist
   */
 async approveApplication(application, adminUserId, overrides = {}) {
  // Run atomic approval logic located inside Application model
  // approveAndCreateArtist MUST return: { artist, updatedApplication }

    // Idempotency + state rules
  if (application.status === "approved") {
    const err = new Error("Application is already approved.");
    err.statusCode = 409;
    throw err;
  }

  if (application.status === "rejected") {
    const err = new Error("Cannot approve a rejected application.");
    err.statusCode = 409;
    throw err;
  }

  const { artist, updatedApplication } = 
    await application.approveAndCreateArtist(adminUserId, overrides);

  return { artist, updatedApplication };
}

  /**
   * Admin: reject application
   */
 async rejectApplication(applicationId, adminUserId, notes) {
  const application = await artistApplicationRepository.findByIdDoc(applicationId);

  if (!application) {
    const err = new Error("Artist application not found.");
    err.statusCode = 404;
    throw err;
  }

  // Idempotency rules
  if (application.status === "rejected") {
    const err = new Error("Application is already rejected.");
    err.statusCode = 409;
    throw err;
  }

  if (application.status === "approved") {
    const err = new Error("Cannot reject an approved application.");
    err.statusCode = 409;
    throw err;
  }

  const oldStatus = application.status;

  // Model-level rejection logic (atomic update)
  const updatedApplication = await application.markRejected(adminUserId, notes);

  // Return pair for controller convenience
  return { updatedApplication, oldStatus };
}

  /**
   * Admin: mark as needs more info
   */
  async requestMoreInfo(applicationId, adminUserId, notes) {
  const application = await artistApplicationRepository.findById(applicationId);

  if (!application) {
    throw new Error("Artist application not found.");
  }

   // Idempotency & invalid transitions
  if (application.status === "approved") {
    const err = new Error("Cannot request more info for an approved application.");
    err.statusCode = 409;
    throw err;
  }

  if (application.status === "rejected") {
    const err = new Error("Cannot request more info for a rejected application.");
    err.statusCode = 409;
    throw err;
  }

  if (application.status === "needs_info") {
    const err = new Error("Application already requires more information.");
    err.statusCode = 409;
    throw err;
  }

  const oldStatus = application.status;

  const updatedApplication =
    await artistApplicationRepository.updateStatus(applicationId, {
      status: "needs_info",
      adminReviewer: adminUserId,
      adminNotes: notes || null,
      reviewedAt: new Date(),
    });

  return { updatedApplication, oldStatus };
}
}

export const artistApplicationService = new ArtistApplicationService();
