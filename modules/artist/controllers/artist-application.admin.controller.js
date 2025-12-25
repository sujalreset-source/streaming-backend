import { artistApplicationService } from "../services/artist-application.service.js";
import { artistApplicationAdminDTO } from "../dto/artist-application-admin.dto.js"; // we will create this DTO next

/**
 * GET /api/v2/admin/artist-applications
 * Query params:
 *   - status (pending|approved|rejected|needs_info)
 *   - search (stageName or user email)
 *   - page (default 1)
 *   - limit (default 20)
 *
 * Access: Admin only (apply isAdmin middleware on the route)
 */
export const listArtistApplicationsForAdminController = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));

    const result = await artistApplicationService.listApplicationsForAdmin({
      status,
      search,
      page,
      limit,
    });

    // Map using admin DTO (allows exposing admin-only fields like adminNotes, documents, taxInfo)
    const applications = Array.isArray(result.applications)
      ? result.applications.map((app) => artistApplicationAdminDTO(app))
      : [];

    return res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: result.pagination,
      },
    });
  } catch (err) {
    next(err);
  }
};
