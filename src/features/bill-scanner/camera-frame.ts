/** Size of a complete camera image inside a viewfinder (object-fit: contain). */
export function cameraImageSize(width: number, height: number, maxWidth: number, maxHeight: number) {
  if (width <= 0 || height <= 0 || maxWidth <= 0 || maxHeight <= 0) return { width: 0, height: 0 };
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return { width: Math.min(maxWidth, width * scale), height: Math.min(maxHeight, height * scale) };
}
