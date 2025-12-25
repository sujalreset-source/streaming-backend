import { artistApplicationService } from "../services/artist-application.service.js";
import { artistApplicationDTO } from "../dto/artist-application.dto.js";
import { artistApplicationPublicDTO } from "../dto/artist-application.dto.js"; // // optional

/**
 * POST /api/v2/artist/apply
 * User submits artist application
 */
export const submitArtistApplicationController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const payload = {
      stageName: req.body.stageName,
      legalName: req.body.legalName,
      bio: req.body.bio,
      contact: req.body.contact,
      socials: req.body.socials,
      documents: [],
      samples: req.body.samples,
      country: req.body.country,
    

    
    };
    payload.documents.push({url:req.files.documents[0].location, filename:req.files.documents[0].key, docType:"gov_id"})

    // Business logic handled in service
    const application = await artistApplicationService.submit(userId, payload);

    return res.status(201).json({
      success: true,
      message: "Artist application submitted successfully.",
      application: artistApplicationDTO(application),
    });
  } catch (err) {
    next(err);
  }
};


/**
 * GET /api/v2/artist/application/me
 * Retrieve the logged-in user's artist application
 */
export const getMyArtistApplicationController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const application = await artistApplicationService.getMyApplication(userId);

    return res.status(200).json({
      success: true,
      application: artistApplicationDTO(application),
    });
  } catch (err) {
    next(err);
  }
};





export const updateMyArtistApplicationController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updates = {
      stageName: req.body.stageName,
      legalName: req.body.legalName,
      bio: req.body.bio,
      contact: req.body.contact,
      socials: req.body.socials,
      documents: req.body.documents,
      samples: req.body.samples,
      requestedUploadQuotaBytes: req.body.requestedUploadQuotaBytes,
    };

    // remove undefined keys
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { updatedApplication } = await artistApplicationService.updateApplicationByUser(
      userId,
      updates
    );

    return res.status(200).json({
      success: true,
      message: "Application updated and resubmitted for review.",
      application: artistApplicationPublicDTO(updatedApplication),
    });
  } catch (err) {
    next(err);
  }
};
