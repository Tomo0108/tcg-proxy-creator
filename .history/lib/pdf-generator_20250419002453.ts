// PDF and PNG generation implementation with improved quality
import { jsPDF } from "jspdf"; // Import jsPDF directly
import { createPrintReadyCanvas, renderHighQualityCards } from "./cmyk-conversion"

export interface CardData {
  image: string
  position: { x: number; y: number }
  scale: number
  type: string
  originalSize?: { width: number; height: number }
}

export interface PrintLayoutOptions {
  cards: CardData[]
  spacing: number
  cardType: string
  cmykConversion: boolean
  dpi: number
  canvas: HTMLCanvasElement
  dimensions?: {
    a4Width: number
    a4Height: number
    cardWidth: number
    cardHeight: number
    marginX: number
    marginY: number
    cardsPerRow: number
    cardsPerColumn: number
  }
}

// Removed the dynamic loadJsPDF function

export async function generatePDF(options: PrintLayoutOptions): Promise<Blob> {
  try {
    const { cards, cmykConversion, dpi, dimensions, spacing, cardType } = options

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
      )
    } else {
      // Fallback to the old method
      printCanvas = createPrintReadyCanvas(options.canvas, dpi, cmykConversion)
    }

    // Use the imported jsPDF class directly
    // A4 size in mm: 210 x 297
    const pdf = new jsPDF({ // Instantiate directly
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: false, // Disable compression for better quality
    })

    // Convert canvas to image data URL with maximum quality
    const imageData = printCanvas.toDataURL("image/jpeg", 1.0)

    // Add the image to the PDF with high quality settings
    pdf.addImage({
      imageData,
      format: "JPEG",
      x: 0,
      y: 0,
      width: 210,
      height: 297,
      compression: "NONE",
      alias: "card-layout",
    })

    // Set PDF properties
    pdf.setProperties({
      title: "TCG Proxy Cards",
      subject: "Trading Card Game Proxy Cards",
      creator: "TCG Proxy Creator",
      keywords: "tcg, proxy, cards",
    })

    // Set output intent for CMYK if enabled
    if (cmykConversion) {
      // In a real implementation, we would set the output intent to CMYK
      // This is a simplified version
      pdf.setTextColor(0, 0, 0, 100) // CMYK black
    }

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
    const { cards, cmykConversion, dpi, dimensions, spacing, cardType } = options

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
      )
    } else {
      // Fallback to the old method
      printCanvas = createPrintReadyCanvas(options.canvas, dpi, cmykConversion)
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
