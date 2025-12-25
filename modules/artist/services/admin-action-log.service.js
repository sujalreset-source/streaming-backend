import { AdminActionLog } from "../models/admin-action-log.model.js";

class AdminActionLogService {
  /**
   * Create a new admin action log entry.
   *
   * @param {Object} params
   * @param {ObjectId} params.adminId - Admin performing the action
   * @param {ObjectId} params.applicationId - Artist Application ID affected
   * @param {string} params.action - "application_approved" | "application_rejected" | "application_needs_info"
   * @param {string} params.oldStatus - previous application status
   * @param {string} params.newStatus - updated application status
   * @param {string|null} params.notes - admin provided notes
   * @param {string|null} params.ipAddress - IP address of the admin
   * @param {string|null} params.userAgent - agent string for security audits
   */
  async log({
    adminId,
    applicationId,
    action,
    oldStatus,
    newStatus,
    notes = null,
    ipAddress = null,
    userAgent = null,
  }) {
    return await AdminActionLog.create({
      adminId,
      applicationId,
      action,
      oldStatus,
      newStatus,
      notes,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Fetch logs for a specific application.
   * Useful for admin dashboards (“Review History” section).
   */
  async getLogsForApplication(applicationId) {
    return await AdminActionLog.find({ applicationId })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Fetch logs performed by a specific admin.
   * Useful for internal admin activity monitoring.
   */
  async getLogsByAdmin(adminId) {
    return await AdminActionLog.find({ adminId })
      .sort({ createdAt: -1 })
      .lean();
  }
}

export const adminActionLogService = new AdminActionLogService();
