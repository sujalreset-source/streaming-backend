// init.controller.js
import { initUploadService } from "../services/init.service.js";

export const initUploadController = async (req, res, next) => {
  try {
    const artistId = req.user._id; // From auth middleware/session
    const { filename, contentType, size, clientUploadUuid } = req.body;

    const response = await initUploadService({
      artistId,
      filename,
      contentType,
      size,
      clientUploadUuid,
    });

    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
