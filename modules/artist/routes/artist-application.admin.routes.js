import { Router } from "express";

import {
  getArtistApplicationForAdminController,
  approveArtistApplicationController,
  rejectArtistApplicationController,
  requestMoreInfoArtistApplicationController,
} from "../controllers/artist-approval.controller.js";

import {
  listArtistApplicationsForAdminController,
} from "../controllers/artist-application.admin.controller.js";  


import {
  listArtistApplicationsValidator,
  applicationIdValidator,
  approveArtistApplicationValidator,
  rejectArtistApplicationValidator,
  requestMoreInfoValidator,
} from "../validators/artist-application.admin.validators.js";

// import { validateRequest } from "../../../middleware/validateRequest.js";
// import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import { isAdmin } from "../../../middleware/isAdmin.js";
import { authenticateUser } from "../../../middleware/authenticate.js";

const router = Router();

// ------------------------------------------------------
// GET /admin/artist-applications
// ------------------------------------------------------
router.get(
  "/artist-applications",
  authenticateUser ,
  isAdmin,
  listArtistApplicationsValidator,
  
  listArtistApplicationsForAdminController
);

// ------------------------------------------------------
// GET /admin/artist-applications/:id
// ------------------------------------------------------
router.get(
  "/artist-applications/:id",
  authenticateUser ,
  isAdmin,
  applicationIdValidator,

  getArtistApplicationForAdminController
);

// ------------------------------------------------------
// POST /admin/artist-applications/:id/approve
// ------------------------------------------------------
router.post(
  "/artist-applications/:id/approve",
  authenticateUser ,
  isAdmin,
  approveArtistApplicationValidator,
  
  approveArtistApplicationController
);

// ------------------------------------------------------
// POST /admin/artist-applications/:id/reject
// ------------------------------------------------------
router.post(
  "/artist-applications/:id/reject",
  authenticateUser ,
  isAdmin,
  rejectArtistApplicationValidator,
  
  rejectArtistApplicationController
);

// ------------------------------------------------------
// POST /admin/artist-applications/:id/request-more-info
// ------------------------------------------------------
router.post(
  "/artist-applications/:id/request-more-info",
  authenticateUser ,
  isAdmin,
  requestMoreInfoValidator,
  
  requestMoreInfoArtistApplicationController
);

export default router;
