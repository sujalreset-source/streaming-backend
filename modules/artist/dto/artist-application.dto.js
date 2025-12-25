/**
 * Artist Application DTO (User-facing)
 * -------------------------------------------------------
 * This DTO intentionally strips out sensitive fields:
 *  - taxInfo (PAN, GST, etc)
 *  - adminNotes (for admin only)
 *  - adminReviewer
 *  - reviewedAt
 *  - internal metadata
 *
 * Keep response lean, safe, and consistent.
 */
export const artistApplicationDTO = (app) => {
  if (!app) return null;

  return {
    id: app._id,
    stageName: app.stageName,
    legalName: app.legalName || null,
    slug: app.slug,
    bio: app.bio || "",
    adminNotes:app.adminNotes || null,
    contact: app.contact || {},
    country: app.country || null,
    socials: Array.isArray(app.socials)
      ? app.socials.map((s) => ({
          provider: s.provider,
          url: s.url,
        }))
      : [],

    documents: Array.isArray(app.documents)
      ? app.documents.map((d) => ({
          url: d.url,
          filename: d.filename,
          docType: d.docType,
        }))
      : [],

    samples: Array.isArray(app.samples)
      ? app.samples.map((s) => ({
          title: s.title,
          url: s.url,
          duration: s.durationSeconds || null,
        }))
      : [],

    status: app.status,
    attemptCount: app.attemptCount,
    isDocsComplete: app.isDocsComplete,

    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
};

export const artistApplicationPublicDTO = (doc) => {
  if (!doc) return null;
  return {
    _id: doc._id,
    stageName: doc.stageName,
    legalName: doc.legalName,
    slug: doc.slug,
    bio: doc.bio,
    contact: doc.contact,
    socials: doc.socials,
    documents: doc.documents,
    adminNotes: doc.adminNotes,
    samples: doc.samples,
    status: doc.status,
    attemptCount: doc.attemptCount,
    isKycPassed: !!doc.isKycPassed,
    isDocsComplete: !!doc.isDocsComplete,
    requestedUploadQuotaBytes: doc.requestedUploadQuotaBytes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};
