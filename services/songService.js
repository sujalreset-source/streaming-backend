import { Song } from "../models/Song.js";
import { Album } from "../models/Album.js";
import mongoose from "mongoose";
// import { songDeletionQueue } from "../queue/songDeletionQueue.js";

export const calculatePrice = ({ accessType, basePrice, albumOnly }) => {
  console.log("Calculating price for:", { accessType, basePrice, albumOnly });
  if (accessType === "purchase-only") return albumOnly ? 0 : basePrice;
  return 0;
};

export const createSongService = async ({
  data,
  audioUrl,
  coverImageUrl,
  audioKey // 👈 pass explicitly
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Defensive domain invariants
    if (!data.artist || !audioUrl) {
      throw new Error("Invalid song payload");
    }

    const finalPrice = calculatePrice(data);

    const [song] = await Song.create(
      [
        {
          title: data.title,
          artist: data.artist,
          album: data.album || null,
          genre: data.genre,
          duration: data.duration,
          accessType: data.accessType || "subscription",
          basePrice: finalPrice,
          releaseDate: data.releaseDate,
          coverImage: coverImageUrl,
          albumOnly: data.albumOnly || false,
          isrc: data.isrc || null,
          audioUrl,
          audioKey,
          convertedPrices: data.convertedPrices || []
        }
      ],
      { session }
    );

    if (data.album) {
      await Album.findByIdAndUpdate(
        data.album,
        { $push: { songs: song._id } },
        { session }
      );
    }

    await session.commitTransaction();
    return song;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};


export const updateSong = async ({ songId, data, coverImageUrl, audioUrl }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const song = await Song.findById(songId).session(session);
    if (!song) throw new Error("Song not found");

    const oldAlbumId = song.album?.toString();
    const newAlbumId = data.album || null;

    // Update song fields
    song.title = data.title ?? song.title;
    song.artist = data.artist ?? song.artist;
    song.genre = data.genre ?? song.genre;
    song.duration = data.duration ?? song.duration;
    song.price = data.price ?? song.price;
    song.accessType = data.accessType ?? song.accessType;
    song.releaseDate = data.releaseDate ?? song.releaseDate;
    song.album = newAlbumId;

    if (coverImageUrl) song.coverImage = coverImageUrl;
    if (audioUrl) {
      song.audioUrl = audioUrl;
      song.audioKey = audioUrl.split("/").pop().replace(/\.[^/.]+$/, "");
    }

    await song.save({ session });

    // Update album references if changed
    if (oldAlbumId && oldAlbumId !== newAlbumId) {
      await Album.findByIdAndUpdate(oldAlbumId, { $pull: { songs: song._id } }, { session });
    }

    if (newAlbumId && oldAlbumId !== newAlbumId) {
      await Album.findByIdAndUpdate(newAlbumId, { $addToSet: { songs: song._id } }, { session });
    }

    await session.commitTransaction();
    session.endSession();

    return song;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// export const deleteSong = async (songId) => {
//   if (!mongoose.Types.ObjectId.isValid(songId)) {
//     throw new Error("Invalid song ID");
//   }

//   const song = await Song.findById(songId);
//   if (!song) throw new Error("Song not found");

//   // Remove song from album if applicable
//   if (song.album) {
//     await Album.findByIdAndUpdate(song.album, { $pull: { songs: song._id } });
//   }

//   // Enqueue S3 deletion
//   await songDeletionQueue.add("deleteSongFiles", {
//     audioUrl: song.audioUrl,
//     coverImage: song.coverImage,
//   });

//   // Delete song from DB
//   await song.deleteOne();

//   return { message: "Song deleted successfully" };
// };