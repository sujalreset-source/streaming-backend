export const uploadToS3 = jest.fn(async () => {
  return {
    Location: "https://mock-s3/resolved/file.mp3",
    Key: "songs/mock-file.mp3",
    Bucket: "test-bucket"
  };
});
