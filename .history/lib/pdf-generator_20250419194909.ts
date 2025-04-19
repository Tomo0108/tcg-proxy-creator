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
   cmykMode: "simple" | "accurate" // Add cmykMode
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
