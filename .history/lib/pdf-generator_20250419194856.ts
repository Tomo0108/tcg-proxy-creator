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
     // The setTextColor line below was just a placeholder and doesn't affect images.
     // if (cmykConversion && cmykMode === 'accurate') {
     //   // pdf.setOutputIntentV2(...) // Ideal but likely not available/reliable
     // }

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
