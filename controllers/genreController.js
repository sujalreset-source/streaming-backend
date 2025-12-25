import Genre from "../models/Genre.js";
import mongoose from "mongoose";
import { StatusCodes } from 'http-status-codes';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../errors/index.js';
import { isAdmin } from "../utils/authHelper.js";


// ===================================================================
// @desc    Create a new genre
// @route   POST /api/genres
// @access  Admin
// ===================================================================
export const createGenre = async (req, res) => {
  
  
  // Authorization check
  if (!isAdmin(req.user)) {
    throw new UnauthorizedError('Access denied. Admins only.');
  }

  const { name, description, image } = req.body;

  // Input validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new BadRequestError('Genre name must be at least 2 characters.');
  }

  // Generate slug from name
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-');

  // Check for duplicates
  const existing = await Genre.findOne({ $or: [{ name }, { slug }] });
  if (existing) {
    throw new BadRequestError('Genre with this name or slug already exists.');
  }

  // Create and save genre
  const genre = await Genre.create({
    name: name.trim(),
    description: description?.trim() || '',
    image: image || '',
    slug,
  });

  res.status(StatusCodes.CREATED).json({ success: true, genre });
};


// ===================================================================
// @desc    Get all genres with optional pagination
// @route   GET /api/genres
// @access  Public
// ===================================================================
export const getGenres = async (req, res) => {

  

    // Extract and validate query parameters
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    // Fetch genres and total count concurrently
    const [genres, total] = await Promise.all([
      Genre.find().skip(skip).limit(limit).sort({ name: 1 }),
      Genre.countDocuments()
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      genres,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  }


// ===================================================================
// @desc    Get a single genre by ID or slug
// @route   GET /api/genres/:idOrSlug
// @access  Public
// ================================================================
export const getGenreByIdOrSlug = async (req, res) => {
  const { idOrSlug } = req.params;

  const query = mongoose.Types.ObjectId.isValid(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };

  const genre = await Genre.findOne(query);

  if (!genre) {
    throw new NotFoundError('Genre not found');
  }

  res.status(StatusCodes.OK).json({
    success: true,
    genre
  });
};


// ===================================================================
// @desc    Update a genre by ID or slug (Admin only)
// @route   PATCH /api/genres/:idOrSlug
// @access  Admin
// ===================================================================
export const updateGenre = async (req, res) => {
  // Admin check
  if (!isAdmin(req.user)) {
    throw new UnauthorizedError('Access denied. Admins only.');
  }

  const { idOrSlug } = req.params;
  const { name, description, image } = req.body;

  // Build update object
  const update = {};
  if (name) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      throw new BadRequestError('Genre name must be at least 2 characters.');
    }
    update.name = name.trim();
  }
  if (description) update.description = description.trim();
  if (image) update.image = image;

  // Determine filter condition
  const filter = mongoose.Types.ObjectId.isValid(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };

  // Check for duplicate name/slug
  if (name) {
    const existing = await Genre.findOne({ name: name.trim(), ...{ _id: { $ne: filter._id } } });
    if (existing) {
      throw new BadRequestError('Another genre with this name already exists.');
    }
  }

  // Update genre
  const genre = await Genre.findOneAndUpdate(filter, update, {
    new: true,
    runValidators: true,
  });

  if (!genre) {
    throw new NotFoundError('Genre not found.');
  }

  res.status(StatusCodes.OK).json({ success: true, genre });
};


// ===================================================================
// @desc    Delete a genre by ID or slug (Admin only)
// @route   DELETE /api/genres/:idOrSlug
// @access  Admin
// ===================================================================
export const deleteGenre = async (req, res) => {
  // Admin authorization check
  if (!isAdmin(req.user)) {
    throw new UnauthorizedError('Access denied. Admins only.');
  }

  const { idOrSlug } = req.params;

  // Determine query type: ObjectId or slug
  const filter = mongoose.Types.ObjectId.isValid(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };

  // Attempt deletion
  const genre = await Genre.findOneAndDelete(filter);

  if (!genre) {
    throw new NotFoundError('Genre not found.');
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Genre deleted successfully',
  });
};
