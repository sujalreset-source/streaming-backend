import { body, param } from "express-validator";

export const createPlaylistValidator = [
  body("name").trim().notEmpty().withMessage("Playlist title is required"),
  body("description").optional().trim().escape(),
];

export const updatePlaylistValidator = [
 
  body("name").optional().trim(),
  body("description").optional().trim().escape(),
];

export const playlistIdValidator = [
  param("id").isMongoId().withMessage("Invalid playlist ID"),
];

export const addSongToPlaylistValidator = [
  param("playlistId").isMongoId().withMessage("Invalid playlist ID"),
  body("songId").isMongoId().withMessage("Invalid song ID"),
];

export const removeSongFromPlaylistValidator = [
  param("playlistId").isMongoId().withMessage("Invalid playlist ID"),
  param("songId").isMongoId().withMessage("Invalid song ID"),
];