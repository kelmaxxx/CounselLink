// Client-side image compression. Phone cameras (e.g. an iPhone shooting HD)
// produce JPGs that are often several MB — far bigger than we need for a COR
// scan or a 2x2 photo. This downscales the image to a max edge length and
// re-encodes it as JPEG *in the browser* before it's uploaded, so the file that
// leaves the device is small. Non-image files (PDFs) pass through untouched,
// and the original is kept whenever re-encoding wouldn't actually save space.

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image file."));
    };
    img.src = url;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Shrink an oversized image file. Returns a new (smaller) File, or the original
 * file if it's not an image, can't be decoded, or is already small enough.
 *
 * @param {File} file
 * @param {{ maxDimension?: number, quality?: number }} [opts]
 *   maxDimension — longest edge in pixels the result is scaled down to.
 *   quality — JPEG quality from 0 to 1.
 */
export const compressImage = async (file, { maxDimension = 1600, quality = 0.8 } = {}) => {
  if (!file || !IMAGE_TYPES.includes(file.type)) return file;

  let img;
  try {
    img = await loadImage(file);
  } catch {
    return file; // fall back to the original if the browser can't decode it
  }

  const { width, height } = img;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  // White backdrop so transparent PNGs don't turn black when flattened to JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const blob = await canvasToBlob(canvas, "image/jpeg", quality);
  // Keep the original if re-encoding didn't actually make it smaller.
  if (!blob || blob.size >= file.size) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
};
