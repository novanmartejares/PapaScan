import { Point } from '@/types';

export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Sorts 4 points into Top-Left, Top-Right, Bottom-Right, Bottom-Left order
 */
export function orderCornerPoints(pts: Point[]): [Point, Point, Point, Point] {
  if (pts.length !== 4) {
    throw new Error('Must provide exactly 4 points');
  }

  // Center of mass
  const cx = pts.reduce((sum, p) => sum + p.x, 0) / 4;
  const cy = pts.reduce((sum, p) => sum + p.y, 0) / 4;

  // Separate top vs bottom
  const sortedByY = [...pts].sort((a, b) => a.y - b.y);
  const topTwo = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottomTwo = sortedByY.slice(2, 4).sort((a, b) => a.x - b.x);

  const tl = topTwo[0];
  const tr = topTwo[1];
  const bl = bottomTwo[0];
  const br = bottomTwo[1];

  return [tl, tr, br, bl];
}

/**
 * Returns a default document quadrilateral inset slightly from image bounds
 */
export function getDefaultCorners(width: number, height: number, insetRatio = 0.08): [Point, Point, Point, Point] {
  const insetX = width * insetRatio;
  const insetY = height * insetRatio;

  return [
    { x: insetX, y: insetY },                    // Top-Left
    { x: width - insetX, y: insetY },            // Top-Right
    { x: width - insetX, y: height - insetY },    // Bottom-Right
    { x: insetX, y: height - insetY }             // Bottom-Left
  ];
}

/**
 * Rotate points 90 degrees clockwise around center of bounding box
 */
export function rotatePoints(
  points: [Point, Point, Point, Point],
  width: number,
  height: number,
  angle: 90 | 180 | 270
): [Point, Point, Point, Point] {
  return points.map(p => {
    if (angle === 90) {
      return { x: height - p.y, y: p.x };
    } else if (angle === 180) {
      return { x: width - p.x, y: height - p.y };
    } else if (angle === 270) {
      return { x: p.y, y: width - p.x };
    }
    return { ...p };
  }) as [Point, Point, Point, Point];
}
