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
      // Apply simulation only in simple mode
      printCanvas = createPrintReadyCanvas(options.canvas, dpi, cmykConversion && cmykMode === 'simple')
    }

    // Use the imported jsPDF class directly
    // A4 size in mm: 210 x 297
    const pdf = new jsPDF({ // Instantiate directly
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: false, // Disable compression for better quality
    })

    let imageData: string;
    let imageFormat: "JPEG" | "PNG";

    if (cmykConversion && cmykMode === 'simple') {
      // Simple Mode: Use JPEG (RGB simulation)
      // The simulation was already applied in renderHighQualityCards or createPrintReadyCanvas
      imageData = printCanvas.toDataURL("image/jpeg", 1.0);
      imageFormat = "JPEG";
    } else {
      // Accurate Mode or CMYK Disabled: Use PNG (RGB) for lossless quality
      // Canvas should contain RGB data here
      imageData = printCanvas.toDataURL("image/png", 1.0);
      imageFormat = "PNG";
    }

     // Add the image to the PDF
     pdf.addImage({
       imageData,
       format: imageFormat,
       x: 0,
       y: 0,
       width: 210, // A4 width in mm
       height: 297, // A4 height in mm
       compression: "NONE", // Use lossless compression if possible (especially for PNG)
       alias: "card-layout",
     })

    // Set PDF properties (remains the same)
    pdf.setProperties({
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
