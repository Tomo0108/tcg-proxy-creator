// PDF and PNG generation implementation with improved quality
import { jsPDF } from "jspdf"; // Import jsPDF directly
// Import necessary functions from cmyk-conversion
import { createPrintReadyCanvas, renderHighQualityCards, applyCmykProfile, loadCmykProfile } from "./cmyk-conversion";

// --- Interfaces ---
interface Dimensions {
  a4Width: number;
  a4Height: number;
  cardWidth: number;
  cardHeight: number;
  marginX: number;
  marginY: number;
  cardsPerRow: number;
  cardsPerColumn: number;
}

// Interface for card data used internally and passed from the editor
export interface CardData {
  image: string;
  scale: number;
  type: string;
  originalSize: { width: number; height: number }; // Ensure this is always present if needed
  position: { x: number; y: number };
}

// Options specific to PDF export (multi-page)
interface PdfExportOptions {
  pages: (CardData | null)[][]; // Array of pages, each page is an array of CardData or null
  spacing: number;
  cardType: string;
  cmykConversion: boolean;
  // canvas: HTMLCanvasElement; // Canvas is removed for PDF generation
  dpi: number;
  dimensions: Dimensions;
  cmykMode: "simple" | "accurate";
}

// Options specific to PNG export (single-page)
interface PngExportOptions {
  cards: CardData[]; // Single array of cards for the current page
  spacing: number;
  cardType: string;
  cmykConversion: boolean;
  canvas: HTMLCanvasElement; // Canvas is needed for PNG generation from preview
  dpi: number;
  dimensions: Dimensions; // Keep dimensions for PNG as well
  cmykMode: "simple" | "accurate";
}

// --- Constants ---
const MM_TO_POINTS = 2.83465; // 1 mm = 2.83465 points

// --- PDF Generation (Multi-page support) ---
export async function generatePDF(
  options: PdfExportOptions // Use PdfExportOptions type
): Promise<Blob> {
  console.log("generatePDF called with options:", options);
  const { pages, spacing, cardType, cmykConversion, dpi, dimensions, cmykMode } = options;
  const { a4Width, a4Height, cardWidth, cardHeight, marginX, marginY, cardsPerRow, cardsPerColumn } = dimensions;

  // Constants for PDF generation
  const scaleFactor = dpi / 25.4; // pixels per mm

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [a4Width, a4Height], // Explicitly set format
    compress: false, // Disable compression initially for quality
  });

  // Load CMYK profile if needed for accurate mode
  let cmykProfile: ArrayBuffer | null = null;
  if (cmykConversion && cmykMode === 'accurate') {
    try {
      console.time("Load CMYK Profile (PDF)");
      cmykProfile = await loadCmykProfile();
      console.timeEnd("Load CMYK Profile (PDF)");
    } catch (err) {
      console.error("Failed to load CMYK profile for PDF, Accurate CMYK disabled:", err);
      cmykProfile = null; // Ensure it's null if loading fails
    }
  }

  // Loop through each page provided in the options
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const currentPageCards = pages[pageIndex];

    // Add a new page for subsequent pages (pageIndex > 0)
    if (pageIndex > 0) {
      pdf.addPage([a4Width, a4Height], "portrait");
    }

    // Filter out null cards for the current page
    const validCardsOnPage = currentPageCards.filter((card): card is CardData => card !== null);

    // Draw cards onto the current PDF page
    for (const card of validCardsOnPage) {
      // Find the original index on the grid for positioning
      const index = currentPageCards.findIndex(c => c === card);

      if (index === -1) {
        console.warn(`Card not found in original array on page ${pageIndex}, skipping drawing:`, card);
        continue; // Skip this card
      }

      // Calculate card position in mm
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const drawXMM = marginX + col * (cardWidth + spacing);
      const drawYMM = marginY + row * (cardHeight + spacing);
      const drawCardWidthMM = cardWidth;
      const drawCardHeightMM = cardHeight;

      try {
        let imageDataForPdf: string | ArrayBuffer | null = null; // Data to be added to PDF
        let imageFormatForPdf: "JPEG" | "PNG" | "UNKNOWN" = "UNKNOWN"; // Format for pdf.addImage

        // --- Image Loading ---
        const img = await loadImage(card.image); // Load image using helper

        // --- Create Temporary Canvas for High-Quality Drawing/Conversion ---
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error(`Failed to get 2D context for temp canvas for PDF (Page ${pageIndex}, Card ${index})`);

        // Calculate drawing parameters based on card scale and position (in pixels for temp canvas)
        const tempDrawCardWidthPx = cardWidth * scaleFactor;
        const tempDrawCardHeightPx = cardHeight * scaleFactor;
        tempCanvas.width = Math.round(tempDrawCardWidthPx);
        tempCanvas.height = Math.round(tempDrawCardHeightPx);

        // Ensure originalSize is available, provide default if missing (though it should be set by editor)
        const originalImgWidth = card.originalSize?.width || img.width;
        const originalImgHeight = card.originalSize?.height || img.height;

        const imgAspectRatio = originalImgWidth / originalImgHeight;
        const cardAspectRatio = tempDrawCardWidthPx / tempDrawCardHeightPx;
        const cardScale = card.scale || 1;
        let baseWidth, baseHeight;

        // Calculate base size to fill the card area while maintaining aspect ratio
        if (imgAspectRatio > cardAspectRatio) {
          baseHeight = tempDrawCardHeightPx;
          baseWidth = baseHeight * imgAspectRatio;
        } else {
          baseWidth = tempDrawCardWidthPx;
          baseHeight = baseWidth / imgAspectRatio;
        }

        const targetWidth = baseWidth * cardScale;
        const targetHeight = baseHeight * cardScale;
        const cardPosition = card.position || { x: 0, y: 0 };

        // Calculate offset to center the scaled image, applying position adjustment
        // Position x/y range from -1 to 1, mapping to half the difference between canvas and target size
        const offsetX = (tempDrawCardWidthPx - targetWidth) / 2 + cardPosition.x * Math.abs(tempDrawCardWidthPx - targetWidth) / 2;
        const offsetY = (tempDrawCardHeightPx - targetHeight) / 2 + cardPosition.y * Math.abs(tempDrawCardHeightPx - targetHeight) / 2;

        // Draw the high-quality image onto the temporary canvas
        tempCtx.fillStyle = 'white'; // Ensure background is white if image has transparency
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(img, offsetX, offsetY, targetWidth, targetHeight);

        // --- Prepare Image Data for PDF ---
        // Use PNG initially for lossless data before potential CMYK conversion
        const finalImageDataUrl = tempCanvas.toDataURL('image/png');

        if (cmykConversion && cmykMode === 'accurate' && cmykProfile) {
          // Accurate CMYK Conversion
          try {
            console.time(`CMYK Conversion (Accurate) PDF Card ${index}`);
            imageDataForPdf = await applyCmykProfile(finalImageDataUrl, cmykProfile);
            console.timeEnd(`CMYK Conversion (Accurate) PDF Card ${index}`);
            imageFormatForPdf = "JPEG"; // jsPDF uses JPEG format identifier for CMYK data
          } catch (conversionError) {
            console.error(`Accurate CMYK conversion failed for PDF card ${index} on page ${pageIndex}:`, conversionError);
            // Fallback to adding RGB PNG
            imageDataForPdf = finalImageDataUrl;
            imageFormatForPdf = "PNG";
          }
