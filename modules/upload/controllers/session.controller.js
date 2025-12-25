// session.controller.js
import { getUploadSessionService } from "../services/session.service.js";

export const getUploadSessionController = async (req, res, next) => {
  try {
    const { sessionUuid } = req.params;
    const artistId = req.user._id;

    const response = await getUploadSessionService({ sessionUuid, artistId });

    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
