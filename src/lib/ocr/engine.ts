import { recognize } from 'tesseract.js';

export interface OCRProgress {
  status: string;
  progress: number;
}

export type OCRProgressCallback = (p: OCRProgress) => void;

/**
 * Extracts OCR text from an image dataUrl or Blob using client-side Tesseract.js
 */
export async function extractTextFromImage(
  imageSource: string | Blob,
  onProgress?: OCRProgressCallback,
  language = 'eng'
): Promise<string> {
  try {
    const result = await recognize(imageSource, language, {
      logger: (m) => {
        if (onProgress && m.status) {
          onProgress({
            status: m.status,
            progress: typeof m.progress === 'number' ? m.progress : 0,
          });
        }
      },
    });

    const cleanText = result.data.text ? result.data.text.trim() : '';
    return cleanText;
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
