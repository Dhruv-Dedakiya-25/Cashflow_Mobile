/** The crop frame on a photo, in the photo's own pixels. */
export type Box = { x: number; y: number; w: number; h: number };
export type Grip = 'tl' | 'tr' | 'bl' | 'br' | 'move';

export const fullBox = (width: number, height: number): Box => ({ x: 0, y: 0, w: width, h: height });

export const isFull = (b: Box, width: number, height: number) => b.x <= 0 && b.y <= 0 && b.w >= width && b.h >= height;

export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** The frame after a drag of (dx, dy) photo pixels by a corner, or by its middle to move it. */
export function dragBox(start: Box, grip: Grip, dx: number, dy: number, width: number, height: number): Box {
  // The smallest frame still worth reading: a tenth of the photo's shorter side.
  const min = Math.min(width, height) / 10;
  if (grip === 'move') return { ...start, x: clamp(start.x + dx, 0, width - start.w), y: clamp(start.y + dy, 0, height - start.h) };

  const right = start.x + start.w;
  const bottom = start.y + start.h;
  const left = grip === 'tl' || grip === 'bl' ? clamp(start.x + dx, 0, right - min) : start.x;
  const top = grip === 'tl' || grip === 'tr' ? clamp(start.y + dy, 0, bottom - min) : start.y;
  const r = grip === 'tr' || grip === 'br' ? clamp(right + dx, start.x + min, width) : right;
  const b = grip === 'bl' || grip === 'br' ? clamp(bottom + dy, start.y + min, height) : bottom;
  return { x: left, y: top, w: r - left, h: b - top };
}

/** The same frame on the photo turned a quarter: 90 clockwise, -90 the other way. */
export function rotateBox(b: Box, width: number, height: number, degrees: 90 | -90): Box {
  return degrees === 90
    ? { x: height - (b.y + b.h), y: b.x, w: b.h, h: b.w }
    : { x: b.y, y: width - (b.x + b.w), w: b.h, h: b.w };
}

/** Whole pixels inside the photo, for the crop itself. */
export function pixelBox(b: Box, width: number, height: number) {
  const originX = clamp(Math.round(b.x), 0, width - 1);
  const originY = clamp(Math.round(b.y), 0, height - 1);
  return { originX, originY, width: clamp(Math.round(b.w), 1, width - originX), height: clamp(Math.round(b.h), 1, height - originY) };
}

/**
 * The largest frame of the photo's own shape inside it once tilted by `degrees`, centred on the
 * turned canvas (canvasW x canvasH), so a straightened receipt has no blank corners.
 */
export function innerBox(canvasW: number, canvasH: number, w: number, h: number, degrees: number): Box {
  const a = (Math.abs(degrees) * Math.PI) / 180;
  const k = Math.min(w / (w * Math.cos(a) + h * Math.sin(a)), h / (w * Math.sin(a) + h * Math.cos(a)));
  return { x: (canvasW - k * w) / 2, y: (canvasH - k * h) / 2, w: k * w, h: k * h };
}

/** How far in, and which photo pixel is in the middle of the screen. */
export type View = { zoom: number; cx: number; cy: number };

/**
 * Where the photo sits in an area of the screen: its scale, and the photo pixel at the area's
 * top-left. A photo smaller than the area is centred; a larger one never shows past its edges.
 */
export function viewport(areaW: number, areaH: number, imgW: number, imgH: number, view: View) {
  const s = Math.min(areaW / imgW, areaH / imgH) * view.zoom;
  const place = (c: number, area: number, size: number) => {
    const span = area / s;
    return size <= span ? (size - span) / 2 : clamp(c - span / 2, 0, size - span);
  };
  return { s, left: place(view.cx, areaW, imgW), top: place(view.cy, areaH, imgH) };
}
