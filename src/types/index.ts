export interface Point {
  x: number;
  y: number;
}

export interface RectCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AspectRatioType = 'free' | 'a4' | '1:1' | '4:3' | 'original';

export type FilterType = 'original' | 'bw' | 'sharpen' | 'magic' | 'noshadow' | 'grayscale';
export type DocumentCategory = 'All' | 'Receipts' | 'IDs' | 'Contracts' | 'Notes' | 'General';

export interface WatermarkOptions {
  text: string;
  opacity: number; // 0.1 to 0.7
  color: string;
  fontSize: number;
  rotation: number; // angle in degrees e.g. -30
  tile: boolean; // repeat across page
}

export interface RedactionArea {
  x: number;
  y: number;
  width: number;
  height: number;
  style: 'whiteout' | 'blackout';
}

export interface ScannedPage {
  id: string;
  originalImageUrl: string;
  processedImageUrl: string;
  thumbnailUrl: string;
  corners?: [Point, Point, Point, Point]; // TL, TR, BR, BL
  cropBox?: RectCrop;
  rotation: number; // 0, 90, 180, 270
  filter: FilterType;
  ocrText?: string;
  width: number;
  height: number;
}

export interface ScannedDocument {
  id: string;
  title: string;
  category: Exclude<DocumentCategory, 'All'>;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  pages: ScannedPage[];
  starred?: boolean;
}

export type ViewMode = 'library' | 'scanner' | 'editor' | 'detail';

export type CaptureMode = 'single' | 'batch' | 'id_card';

export interface SignatureOverlayData {
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface ScanBatchItem {
  id: string;
  rawImage: string;
  timestamp: number;
  detectedCorners?: [Point, Point, Point, Point];
}

export interface PDFExportOptions {
  pageSize: 'a4' | 'letter' | 'auto';
  orientation: 'portrait' | 'landscape' | 'auto';
  quality: 'high' | 'medium' | 'low';
  margin: number;
}
