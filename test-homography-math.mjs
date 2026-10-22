import { getPerspectiveMatrix, calculateRectifiedDimensions } from './src/lib/cv/homography.ts';
import { distance } from './src/lib/cv/geometry.ts';

console.log('📐 Testing Homography Perspective Transformation Math...\n');

// 1. Define an angled trapezoidal document (e.g. skewed phone camera shot of a document)
const srcCorners = [
  { x: 120, y: 150 }, // Top-Left
  { x: 520, y: 110 }, // Top-Right (angled up)
  { x: 580, y: 780 }, // Bottom-Right (angled out)
  { x: 80,  y: 810 }, // Bottom-Left (angled out)
];

const dims = calculateRectifiedDimensions(srcCorners);
console.log(`✓ Calculated Rectified Dimensions: Width = ${dims.width}px, Height = ${dims.height}px`);

const dstCorners = [
  { x: 0, y: 0 },
  { x: dims.width, y: 0 },
  { x: dims.width, y: dims.height },
  { x: 0, y: dims.height },
];

// 2. Solve 3x3 Homography Matrix
const H = getPerspectiveMatrix(dstCorners, srcCorners);
if (!H) {
  console.error('❌ FAILED: getPerspectiveMatrix returned null');
  process.exit(1);
}

console.log('✓ Successfully solved 3x3 Homography Matrix H:');
console.log(`  [${H.slice(0, 3).map((v) => v.toFixed(5)).join(', ')}]`);
console.log(`  [${H.slice(3, 6).map((v) => v.toFixed(5)).join(', ')}]`);
console.log(`  [${H.slice(6, 9).map((v) => v.toFixed(5)).join(', ')}]`);

// 3. Verify Backward Mapping on all 4 corners
let maxError = 0;
const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = H;

for (let i = 0; i < 4; i++) {
  const u = dstCorners[i].x;
  const v = dstCorners[i].y;

  const w = h6 * u + h7 * v + h8;
  const x = (h0 * u + h1 * v + h2) / w;
  const y = (h3 * u + h4 * v + h5) / w;

  const expectedX = srcCorners[i].x;
  const expectedY = srcCorners[i].y;

  const errX = Math.abs(x - expectedX);
  const errY = Math.abs(y - expectedY);
  const totalErr = Math.hypot(errX, errY);
  maxError = Math.max(maxError, totalErr);

  console.log(
    `  Corner ${i} (u=${u}, v=${v}) -> mapped to (x=${x.toFixed(4)}, y=${y.toFixed(4)}) | expected: (${expectedX}, ${expectedY}) | err: ${totalErr.toExponential(3)}`
  );
}

console.log(`\n✓ Maximum Corner Coordinate Mapping Error: ${maxError.toExponential(3)} pixels`);
if (maxError < 1e-4) {
  console.log('🎉 HOMOGRAPHY MATH VERIFICATION PASSED (Error < 0.0001px)!');
} else {
  console.error('❌ Homography error too large');
  process.exit(1);
}
