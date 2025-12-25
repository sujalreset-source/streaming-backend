// etagValidation.service.js
export const validatePartsList = (parts, expectedCount) => {
  if (!Array.isArray(parts) || parts.length === 0) {
    const err = new Error("Parts list cannot be empty");
    err.status = 400;
    throw err;
  }

  if (parts.length !== expectedCount) {
    const err = new Error(
      `Expected ${expectedCount} parts, received ${parts.length}`
    );
    err.status = 400;
    throw err;
  }

  // Sort parts by PartNumber
  parts.sort((a, b) => a.PartNumber - b.PartNumber);

  // Check ordering and missing parts
  for (let i = 0; i < parts.length; i++) {
    const expectedPart = i + 1;
    if (parts[i].PartNumber !== expectedPart) {
      const err = new Error(`Invalid parts order. Expected PartNumber ${expectedPart}`);
      err.status = 400;
      throw err;
    }

    if (!parts[i].ETag || typeof parts[i].ETag !== "string") {
      const err = new Error(`Invalid ETag for part ${expectedPart}`);
      err.status = 400;
      throw err;
    }
  }
};
