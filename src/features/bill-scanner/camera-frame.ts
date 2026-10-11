/** Size of a complete camera image inside a viewfinder (object-fit: contain). */
export function cameraImageSize(width: number, height: number, maxWidth: number, maxHeight: number) {
  if (width <= 0 || height <= 0 || maxWidth <= 0 || maxHeight <= 0) return { width: 0, height: 0 };
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return { width: Math.min(maxWidth, width * scale), height: Math.min(maxHeight, height * scale) };
}

/** Map the visible guide into native video pixels, accounting for contain letterboxing. */
export function cameraGuideCrop(width: number, height: number, viewWidth: number, viewHeight: number, guide: { left: number; top: number; width: number; height: number }) {
  if (![width,height,viewWidth,viewHeight,guide.left,guide.top,guide.width,guide.height].every(Number.isFinite) || guide.width <= 0 || guide.height <= 0) return null;
  const image = cameraImageSize(width,height,viewWidth,viewHeight);
  if (!image.width || !image.height) return null;
  const left = (viewWidth-image.width)/2, top = (viewHeight-image.height)/2;
  if (guide.left < left-1 || guide.top < top-1 || guide.left+guide.width > left+image.width+1 || guide.top+guide.height > top+image.height+1) return null;
  const scale = width/image.width;
  const x = Math.max(0,Math.floor((guide.left-left)*scale)), y = Math.max(0,Math.floor((guide.top-top)*scale));
  const right = Math.min(width,Math.ceil((guide.left+guide.width-left)*scale)), bottom = Math.min(height,Math.ceil((guide.top+guide.height-top)*scale));
  return right > x && bottom > y ? {x,y,width:right-x,height:bottom-y} : null;
}
