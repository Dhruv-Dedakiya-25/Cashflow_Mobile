import { describe, expect, it } from '@jest/globals';

import { dragBox, fullBox, innerBox, pixelBox, rotateBox, viewport } from './crop';

describe('crop frame', () => {
  const W = 1000;
  const H = 2000;

  it('moves only the dragged corner, and never past the photo or below the smallest frame', () => {
    expect(dragBox(fullBox(W, H), 'tl', 100, 200, W, H)).toEqual({ x: 100, y: 200, w: 900, h: 1800 });
    expect(dragBox(fullBox(W, H), 'br', 500, 500, W, H)).toEqual(fullBox(W, H));
    // A tenth of the shorter side (100) is as small as it gets.
    expect(dragBox(fullBox(W, H), 'tr', -5000, 0, W, H)).toEqual({ x: 0, y: 0, w: 100, h: H });
  });

  it('moves the whole frame inside the photo', () => {
    const box = { x: 100, y: 100, w: 400, h: 400 };
    expect(dragBox(box, 'move', 50, -500, W, H)).toEqual({ x: 150, y: 0, w: 400, h: 400 });
    expect(dragBox(box, 'move', 5000, 0, W, H)).toEqual({ x: 600, y: 100, w: 400, h: 400 });
  });

  it('keeps the frame on the same part of the photo when it turns', () => {
    const box = { x: 100, y: 200, w: 300, h: 400 };
    const turned = rotateBox(box, W, H, 90);
    // Turned clockwise the photo is H wide and W high; the frame's top-left came from its bottom-left.
    expect(turned).toEqual({ x: 1400, y: 100, w: 400, h: 300 });
    expect(rotateBox(turned, H, W, -90)).toEqual(box);
  });

  it('crops whole pixels inside the photo', () => {
    expect(pixelBox({ x: 10.4, y: -3, w: 2000, h: 99.6 }, W, H)).toEqual({ originX: 10, originY: 0, width: 990, height: 100 });
  });
});

describe('straighten and zoom', () => {
  it('fits the largest clean frame inside a tilted photo', () => {
    expect(innerBox(100, 100, 100, 100, 0)).toEqual({ x: 0, y: 0, w: 100, h: 100 });
    // A square turned 45 degrees: the clean square is 1/sqrt(2) of it, centred on the bigger canvas.
    const b = innerBox(141.42, 141.42, 100, 100, -45);
    expect(b.w).toBeCloseTo(70.71, 1);
    expect(b.x).toBeCloseTo((141.42 - 70.71) / 2, 1);
  });

  it('centres a photo at no zoom and keeps a zoomed one inside its edges', () => {
    expect(viewport(400, 400, 1000, 2000, { zoom: 1, cx: 500, cy: 1000 })).toEqual({ s: 0.2, left: -500, top: 0 });
    const zoomed = viewport(400, 400, 1000, 2000, { zoom: 4, cx: 50, cy: 1000 });
    expect(zoomed.s).toBeCloseTo(0.8);
    expect(zoomed.left).toBe(0);
    expect(zoomed.top).toBeCloseTo(750);
  });
});
