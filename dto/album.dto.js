export const shapeAlbumResponse = (album) => ({
  _id: album._id,
  title: album.title,
  slug: album.slug,
  coverImage: album.coverImage,
  description: album.description,
  releaseDate: album.releaseDate,
  accessType: album.accessType,
  basePrice: album.basePrice,
  convertedPrices: album.convertedPrices || [],
  artist: album.artist
    ? {
        _id: album.artist._id,
        name: album.artist.name,
        slug: album.artist.slug,
      }
    : null,
  songs: (album.songs || []).map((song) => ({
    _id: song._id,
    title: song.title,
    duration: song.duration,
    coverImage: song.coverImage,
  })),
});
