export const shapeUserResponse = (user) => {
  if (!user) return null;

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    dob: user.dob,
    role: user.role,
    profileImage: user.profileImage,
    preferredGenres: user.preferredGenres || [],
    likedsong: user.likedsong || [],
    purchasedSongs: user.purchasedSongs || [],
    purchasedAlbums: user.purchasedAlbums || [],
    playlist: (user.playlist || []).map((p) => ({
      id: p._id,
      title: p.title,
      description: p.description,
      songs: p.songs,
    })),
    // Optional: Include only if needed
    purchaseHistory: (user.purchaseHistory || []).map((ph) => ({
      itemType: ph.itemType,
      itemId: ph.itemId,
      price: ph.price,
      paymentId: ph.paymentId,
      purchasedAt: ph.purchasedAt,
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};
