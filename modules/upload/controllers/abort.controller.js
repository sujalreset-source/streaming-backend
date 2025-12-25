// abort.controller.js
import { abortUploadService } from "../services/abort.service.js";

export const abortUploadController = async (req, res, next) => {
  try {
    const { sessionUuid } = req.body;
    const artistId = req.user._id;

    const result = await abortUploadService({ sessionUuid, artistId });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
