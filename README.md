# PapaScan by Novan 📱📄

**PapaScan** is a production-grade, privacy-first Document Scanner Progressive Web App (PWA) built with Next.js (App Router), TypeScript, and Tailwind CSS. It functions seamlessly both as a desktop web utility and an installable offline-capable mobile app on iOS and Android.

---

## 🌟 Key Features

### 1. 📐 True 8-DOF Homography Perspective Warp
- Mathematical 4-point quadrilateral homography solver ($3 \times 3$ transform matrix via Gaussian elimination with partial pivoting).
- Sub-pixel bilinear backward texture mapping flattening angled, distorted captures into crisp, rectangular documents.
- Real-time Loupe Magnifier (3.2x zoomed reticle) attached above the user's touch point/cursor for pixel-precise corner positioning.

### 2. 🪪 ID Card Dual-Page Mode
- Guided camera viewfinder formatted to ISO/IEC 7810 ID-1 proportions ($85.6 \times 53.98\text{ mm}$).
- Step 1: Front side capture $\rightarrow$ Step 2: Back side capture.
- Automatic A4 layout synthesis: composites both sides vertically centered on a standardized A4 page ($1240 \times 1754\text{ px}$ at 150 DPI) with registration marks and divider line.

### 3. ✍️ Digital Signature & Background Removal Tool
- High-precision vector signature pad supporting smooth touch/mouse ink drawing.
- **Luminance Histogram Filter**: isolates pen ink from paper grain and background lighting, converting paper to 100% alpha transparency with anti-aliasing.
- Interactive positioning & scaling overlay with direct canvas burning.

### 4. 📲 Real-Time Desktop-to-Phone Handoff
- "Scan with Phone" button on desktop viewport generates a dynamic QR code.
- Lightweight Server-Sent Events (SSE) bridge: scanning the QR code connects the phone camera directly to the desktop session.
- Snapped photos transmit in real time, auto-opening the desktop Crop & Enhancement Editor without third-party cloud services.

### 5. 🔍 Client-Side OCR & Local IndexedDB Storage
- Embedded Tesseract.js client worker extracting text directly on device.
- Full-text search querying both document titles and extracted OCR body text.
- 100% offline storage powered by `idb` (IndexedDB) with zero server data tracking.

### 6. 🖨️ Multi-Page PDF & Image Export
- Native jsPDF compilation with compression quality options (High, Medium, Low).
- Web Share API integration (`navigator.share`) for direct sharing to WhatsApp, AirDrop, Email, etc.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling & UI**: Tailwind CSS v4, Lucide React, Framer Motion
- **Computer Vision & Canvas**: HTML5 Canvas API, custom 8-DOF Homography & Adaptive Binarization
- **OCR Engine**: Tesseract.js
- **Document Generation**: jsPDF
- **Persistence**: IndexedDB (`idb`)
- **PWA**: Web App Manifest (`manifest.json`), Service Worker (`sw.js`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js 22)
- npm or pnpm

### Installation
```bash
git clone https://github.com/novanmartejares/PapaScan.git
cd PapaScan
npm install
```

### Running Locally
```bash
npm run dev
# or build and run production:
npm run build
npm run start
```
Open [http://localhost:3000](http://localhost:3000) to start scanning.

---

## 🧪 Verification & Automated Testing

PapaScan includes a suite of headless Puppeteer and mathematical test scripts:
```bash
# Verify 8-DOF perspective warp matrix math
node test-homography-math.mjs

# Verify Loupe Magnifier touch dragging & portal rendering
node test-loupe-drag.mjs

# Verify Signature Pad and ID Dual-Card A4 Compositor
node test-pro-features.mjs

# Verify Desktop "Scan with Phone" QR & Real-Time SSE Handoff
node test-mobile-sync.mjs

# End-to-end multi-viewport test (Desktop 1280x800 & Mobile 390x844)
node test-e2e.mjs
```

---

## 📄 License
MIT License. Created by Novan Martejares.
