import mongoose from "mongoose";

// Helper to generate slug from name
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const GenreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Genre name is required"],
      trim: true,
      minlength: [2, "Genre name must be at least 2 characters"],
      maxlength: [50, "Genre name must be at most 50 characters"],
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, "Slug must be lowercase and URL-friendly"],
    },
    description: {
      type: String,
      maxlength: [500, "Description must be at most 500 characters"],
      default: "",
      trim: true,
    },
    image: {
      type: String, // URL or path to the genre image
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Pre-save middleware to auto-generate slug from name if not provided
GenreSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
  next();
});

// Index for faster search by name or slug
GenreSchema.index({ name: 1 });
GenreSchema.index({ slug: 1 });

const Genre = mongoose.models.Genre || mongoose.model("Genre", GenreSchema);
export default Genre;