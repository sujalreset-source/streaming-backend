import { artistApplicationService } from "../services/artist-application.service.js";
import { artistApplicationAdminDTO } from "../dto/artist-application-admin.dto.js";
import { artistDTO } from "../dto/artist.dto.js"; // we will generate this DTO later
import { adminActionLogService } from "../services/admin-action-log.service.js";

/**
 * GET /api/v2/admin/artist-applications/:id
 * Fetch a single artist application by ID for admin review.
 */
export const getArtistApplicationForAdminController = async (req, res, next) => {
  try {
    const applicationId = req.params.id;

    const application = await artistApplicationService.getApplicationById(applicationId);



    return res.status(200).json({
      success: true,
      application: artistApplicationAdminDTO(application),
    });
  } catch (err) {
    next(err);
  }
};



/**
 * POST /api/v2/admin/artist-applications/:id/approve
 * Approve the application and create a new Artist account.
 */

export const approveArtistApplicationController = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const adminUserId = req.user._id;

    const notes = req.body.adminNotes || null;

    const overrides = {
      name: req.body.name,
      bio: req.body.bio,
      slug: req.body.slug,
      image: req.body.image,
      adminNotes: notes,
    };

    // 1️⃣ Fetch current application
    const application = await artistApplicationService.getApplicationById(applicationId);
    const oldStatus = application.status;


  

    // 2️⃣ Approve + create artist
    const { artist, updatedApplication } =
      await artistApplicationService.approveApplication(
        application,
        adminUserId,
        overrides
      );

    // 3️⃣ Log admin action
    await adminActionLogService.log({
      adminId: adminUserId,
      applicationId,
      action: "application_approved",
      oldStatus,
      newStatus: "approved",
      notes,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // 4️⃣ Trigger notification
    // await notificationProducer.enqueueApplicationNotification({
    //   type: "application_approved",
    //   userId: application.userId,
    //   applicationId,
    //   notes,
    // });

    // 5️⃣ Return correct updated application + new artist
    return res.status(200).json({
      success: true,
      message: "Artist application approved successfully.",
      artist: artistDTO(artist),
      application: artistApplicationAdminDTO(updatedApplication),
    });
  } catch (err) {
    next(err);
  }
};




/**
 * POST /api/v2/admin/artist-applications/:id/reject
 * Body: { notes: string } (optional)
 *
 * Admin rejects an application. This:
 *  - marks application.status = 'rejected'
 *  - sets adminReviewer, reviewedAt, adminNotes, increments attemptCount
 *  - returns updated admin-safe application DTO
 *
 * Access: Admin (isAuthenticated + isAdmin middleware on route)
 */
export const rejectArtistApplicationController = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const adminUserId = req.user._id;
    const notes = req.body.notes || null;

    // 1️⃣ Get updated application + old status
    const { updatedApplication, oldStatus } =
      await artistApplicationService.rejectApplication(
        applicationId,
        adminUserId,
        notes
      );

    // 2️⃣ Log admin action
    await adminActionLogService.log({
      adminId: adminUserId,
      applicationId,
      action: "application_rejected",
      oldStatus,
      newStatus: "rejected",
      notes,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // 3️⃣ Send email notification
    // await notificationProducer.enqueueApplicationNotification({
    //   type: "application_rejected",
    //   userId: updatedApplication.userId,
    //   applicationId,
    //   notes,
    // });

    return res.status(200).json({
      success: true,
      message: "Artist application rejected.",
      application: artistApplicationAdminDTO(updatedApplication),
    });
  } catch (err) {
    next(err);
  }
};




/**
 * POST /api/v2/admin/artist-applications/:id/request-more-info
 * Body: { notes: string }
 *
 * Admin flags the application requiring more documents/information.
 * Sets:
 *   - status = "needs_info"
 *   - adminNotes
 *   - adminReviewer
 *   - reviewedAt
 */
export const requestMoreInfoArtistApplicationController = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const adminUserId = req.user._id;
    const notes = req.body.notes || null;

    if (!notes) {
      return res.status(400).json({
        success: false,
        message: "Notes are required when requesting more information.",
      });
    }

    // 1️⃣ Perform service logic
    const { updatedApplication, oldStatus } =
      await artistApplicationService.requestMoreInfo(
        applicationId,
        adminUserId,
        notes
      );

    // 2️⃣ Log admin action
    await adminActionLogService.log({
      adminId: adminUserId,
      applicationId,
      action: "application_needs_info",
      oldStatus,
      newStatus: "needs_info",
      notes,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // 3️⃣ Enqueue notification
    // await notificationProducer.enqueueApplicationNotification({
    //   type: "application_needs_info",
    //   userId: updatedApplication.userId,
    //   applicationId,
    //   notes,
    // });

    return res.status(200).json({
      success: true,
      message: "Requested more information from the artist.",
      application: artistApplicationAdminDTO(updatedApplication),
    });
  } catch (err) {
    next(err);
  }
};




