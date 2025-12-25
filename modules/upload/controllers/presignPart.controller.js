// presignPart.controller.js
import { presignPartService } from "../services/presignPart.service.js";

export const presignPartController = async (req, res, next) => {
  try {
    const { sessionUuid, partNumber } = req.query;

    const response = await presignPartService({
      artistId: req.user._id, // From auth or uploadToken
      sessionUuid,
      partNumber: Number(partNumber),
    });

    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
