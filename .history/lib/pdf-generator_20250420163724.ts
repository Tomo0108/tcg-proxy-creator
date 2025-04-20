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

      title: "TCG Proxy Cards",
      subject: "Trading Card Game Proxy Cards",
      creator: "TCG Proxy Creator",
      keywords: "tcg, proxy, cards",
    })

    // Note: Setting output intent reliably in jsPDF is complex/limited.
    // The best approach for 'accurate' mode is embedding high-quality RGB (PNG)
    // and letting the PDF viewer/printer handle the conversion using its profiles.
    // Removed the old placeholder: pdf.setTextColor(...)

    // Generate PDF blob with high quality settings
    const pdfBlob = pdf.output("blob")
    return pdfBlob
  } catch (error) {
    console.error("PDF generation error:", error)
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

 export async function generatePNG(options: PrintLayoutOptions): Promise<Blob> {
   try {
     const { cards, cmykConversion, cmykMode, dpi, dimensions, spacing, cardType } = options // Add cmykMode here

     let printCanvas

    // Use the new high-quality rendering if dimensions are provided
    if (dimensions) {
      printCanvas = await renderHighQualityCards(
        cards,
        {
          ...dimensions,
          spacing,
         },
         dpi,
         cmykConversion,
         cmykMode, // Pass cmykMode here
       )
     } else {
      // Fallback to the old method
      // Apply simulation only in simple mode for PNG export as well
      printCanvas = createPrintReadyCanvas(options.canvas, dpi, cmykConversion && cmykMode === 'simple')
    }

    // Convert canvas to PNG blob with maximum quality
    return new Promise((resolve, reject) => {
      printCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to create PNG blob"))
          }
        },
        "image/png",
        1.0, // Maximum quality
      )
    })
  } catch (error) {
    console.error("PNG generation error:", error)
    throw new Error(`Failed to generate PNG: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
