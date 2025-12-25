// upload.routes.js
import express from "express";
import { initUploadController } from "../controllers/init.controller.js";
import { authenticateUser } from "../../../middleware/authenticate.js";
import { presignPartController } from "../controllers/presignPart.controller.js";
import { verifyUploadToken } from "../middleware/verifyUploadToken.middleware.js";
import { completeUploadController } from "../controllers/complete.controller.js";
import { getUploadSessionController } from "../controllers/session.controller.js";
import { abortUploadController } from "../controllers/abort.controller.js";


const router = express.Router();

router.post("/init", authenticateUser, initUploadController);

router.get("/presign-part",
  verifyUploadToken,
  authenticateUser, 
  presignPartController
);

router.post(
  "/complete",
  verifyUploadToken,
  authenticateUser,
  completeUploadController
);


router.get(
  "/session/:sessionUuid",
  verifyUploadToken,
  authenticateUser,
  getUploadSessionController
);



router.post(
  "/abort",
  verifyUploadToken,
  authenticateUser,
  abortUploadController
);

export default router;
