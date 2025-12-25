// partsCalculation.service.js
export const calculateParts = (fileSize) => {
  const MIN_PART_SIZE = 8 * 1024 * 1024; // 8MB
  const partSize = MIN_PART_SIZE;
  const partsExpected = Math.ceil(fileSize / partSize);

  return { partSize, partsExpected };
};
