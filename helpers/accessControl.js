import { Song } from "../models/Song.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { Album } from "../models/Album.js";
import { isAdmin } from "../utils/authHelper.js";

export const canStreamSong = async (userId, songId) => {
  
  console.log(`Checking stream access for user ${userId} on song ${songId}`);
  const user = await User.findById(userId).lean();
  console.log("User data:", user);
 if(isAdmin(user)) return true; // Admins can access everything

 
  
  const song = await Song.findById(songId).lean();
  if (!song) return false;
 

  if (song.accessType === "free") return true;
 

  if (song.accessType === "subscription") {
    const subscription = await Subscription.findOne({
      userId,
      artistId: song.artist?._id || song.artist, // 🔥 fix here
      status: { $in: ["active", "cancelled"] }, // ✅ Allow cancelled too
      validUntil: { $gt: new Date() }, // ✅ Still within access period
    });

    if (subscription) return true;
  }
  
  

  if (song.accessType === "purchase-only") {
    if(song.albumOnly){
      const album = await Album.findOne({ songs: song._id }).populate("artist");
    
      
      if (!album) return false;

      // Check if user has purchased the album
      const user = await User.findById(userId).lean();
      if (!user) return false;
      if (user.purchasedAlbums?.some(id => id.toString() === album._id.toString())) {
        return true;
      }

      // // If not purchased, check subscription
      // const subscription = await Subscription.findOne({
      //   userId,
      //   artistId: album.artist._id,
      //   status: { $in: ["active", "cancelled"] },
      //   validUntil: { $gt: new Date() },
      // });

      // return !!subscription;
    }
    else{
    const user = await User.findById(userId).lean();
    if (!user) return false;
    if (user.purchasedSongs?.some(id => id.toString() === song._id.toString())) {
      return true;
    }
  }
}

  return false;
};



// helpers/accessControl.js



export const canStreamAlbum = async (userId, albumId) => {
  const album = await Album.findById(albumId).populate("artist");
  if (!album) return false;

  // Free access
  if (album.accessType === "free") return true;

  const user = await User.findById(userId);
  if (!user) return false;
  if(user.isAdmin) return true; // Admins can access everything
  if (album.accessType === "subscription") {
    const sub = await Subscription.findOne({
      userId,
      artistId: album.artist._id,
      status: "active",
      validUntil: { $gte: new Date() },
    });

    return !!sub;
  }

  if (album.accessType === "purchase-only") {
    return user.purchasedAlbums.includes(album._id);
  }

  return false;
};

