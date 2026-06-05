/**
 * Validates that a File is a real XLSX (Office Open XML Spreadsheet).
 *
 * Strategy (defence-in-depth):
 *   1. Extension check  → `.xlsx` only.
 *   2. MIME check       → expected MIME, or empty (some browsers/OS report empty MIME for XLSX).
 *   3. Magic-byte check → first 4 bytes must be `PK\x03\x04` (ZIP signature; XLSX is a zipped OOXML archive).
 *
 * Returning a plain object (not throwing) keeps the API ergonomic for use in
 * UI flows where we want to surface a friendly error message to the user.
 */

export type XlsxValidationResult =
  | { valid: true }
  | { valid: false; error: string };

const XLSX_EXTENSION = '.xlsx';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
// ZIP local file header: 50 4B 03 04
const ZIP_MAGIC_BYTES = [0x50, 0x4b, 0x03, 0x04] as const;

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB safety cap

const hasZipSignature = (buffer: ArrayBuffer): boolean => {
  if (buffer.byteLength < ZIP_MAGIC_BYTES.length) return false;
  const view = new Uint8Array(buffer, 0, ZIP_MAGIC_BYTES.length);
  return ZIP_MAGIC_BYTES.every((byte, i) => view[i] === byte);
};

export async function validateXlsxFile(file: File): Promise<XlsxValidationResult> {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File too large (max 25 MB).' };
  }

  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(XLSX_EXTENSION)) {
    return {
      valid: false,
      error: `Only XLSX files are accepted. Got "${file.name}".`,
    };
  }

  // MIME type may be empty on some platforms — treat empty as inconclusive,
  // but reject if browser reports a clearly different MIME (e.g. text/csv).
  if (file.type && file.type !== XLSX_MIME) {
    return {
      valid: false,
      error: `Invalid file type "${file.type}". Only XLSX files are accepted.`,
    };
  }

  // Magic bytes — XLSX must be a ZIP archive.
  const headerSlice = await file.slice(0, ZIP_MAGIC_BYTES.length).arrayBuffer();
  if (!hasZipSignature(headerSlice)) {
    return {
      valid: false,
      error: 'File is not a valid XLSX (corrupt or wrong format).',
    };
  }

  return { valid: true };
}
