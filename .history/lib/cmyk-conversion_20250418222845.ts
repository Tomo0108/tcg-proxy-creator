// Enhanced RGB to CMYK conversion and canvas processing with improved image quality

// RGB to CMYK conversion
export function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  // Normalize RGB values
  const normalizedR = r / 255
  const normalizedG = g / 255
  const normalizedB = b / 255

  // Calculate K (black)
  const k = 1 - Math.max(normalizedR, normalizedG, normalizedB)

  // Handle pure black
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 1 }
  }

  // Calculate C, M, Y
  const c = (1 - normalizedR - k) / (1 - k)
  const m = (1 - normalizedG - k) / (1 - k)
  const y = (1 - normalizedB - k) / (1 - k)

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  }
}

// Apply CMYK conversion to canvas with improved quality
export function applyRgbToCmykToCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true })
  if (!ctx) return canvas

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // Convert to CMYK
    const cmyk = rgbToCmyk(r, g, b)

    // Convert back to RGB for display
    // This is a simplified conversion that simulates CMYK appearance
    // In a real implementation, we would use a color profile
    const k = cmyk.k / 100
    data[i] = Math.round(r * (1 - cmyk.c / 100) * (1 - k))
    data[i + 1] = Math.round(g * (1 - cmyk.m / 100) * (1 - k))
    data[i + 2] = Math.round(b * (1 - cmyk.y / 100) * (1 - k))
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

// Create a high-resolution print-ready canvas with improved quality
export function createPrintReadyCanvas(
  sourceCanvas: HTMLCanvasElement,
  dpi = 350,
  applyCmyk = true,
): HTMLCanvasElement {
  // Create a new canvas with the correct DPI
  const printCanvas = document.createElement("canvas")

  // Calculate dimensions based on DPI
  // A4 size in inches: 8.27 x 11.69
  // 1 inch = 25.4 mm
  const a4WidthInches = 210 / 25.4
  const a4HeightInches = 297 / 25.4

  // Set canvas dimensions based on DPI
  printCanvas.width = Math.round(a4WidthInches * dpi)
  printCanvas.height = Math.round(a4HeightInches * dpi)

  const ctx = printCanvas.getContext("2d", { alpha: false })
  if (!ctx) return printCanvas

  // Set image smoothing for better quality
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  // Fill with white background
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, printCanvas.width, printCanvas.height)

  // Draw the original canvas onto the high-resolution canvas
  ctx.drawImage(
    sourceCanvas,
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
    0,
    0,
    printCanvas.width,
    printCanvas.height,
  )

  // Apply CMYK conversion if needed
  if (applyCmyk) {
    return applyRgbToCmykToCanvas(printCanvas)
  }

  return printCanvas
}

// Helper function to calculate DPI based on physical size
export function calculateDPI(canvas: HTMLCanvasElement, widthInMm: number, heightInMm: number): number {
  // Convert mm to inches
  const widthInInches = widthInMm / 25.4
  const heightInInches = heightInMm / 25.4

  // Calculate DPI
  const widthDPI = canvas.width / widthInInches
  const heightDPI = canvas.height / heightInInches

  // Return the average DPI
  return Math.round((widthDPI + heightDPI) / 2)
}

// New function to render high-quality cards directly with fixed image scaling
export async function renderHighQualityCards(
  cards: any[],
  dimensions: {
    a4Width: number
    a4Height: number
    cardWidth: number
    cardHeight: number
    marginX: number
    marginY: number
    cardsPerRow: number
    cardsPerColumn: number
    spacing: number
  },
  dpi = 350,
  applyCmyk = true,
): Promise<HTMLCanvasElement> {
  // Create a new high-resolution canvas
  const canvas = document.createElement("canvas")

  // Convert mm to pixels at the specified DPI
  const mmToPixels = (mm: number) => Math.round(mm * (dpi / 25.4))

  // Set canvas dimensions
  canvas.width = mmToPixels(dimensions.a4Width)
  canvas.height = mmToPixels(dimensions.a4Height)

  // Get context with quality settings
  const ctx = canvas.getContext("2d", { alpha: false })
  if (!ctx) return canvas

  // Set high quality rendering
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  // Fill with white background
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Calculate the scale factor between preview and high-res output
  // This is crucial for maintaining correct image sizes
  const previewDpi = 96 // Standard screen DPI
  const scaleFactor = dpi / previewDpi

  // Draw each card at high resolution
  const drawPromises = cards.map((card, index) => {
    if (!card) return Promise.resolve()

    const row = Math.floor(index / dimensions.cardsPerRow)
    const col = index % dimensions.cardsPerRow

    const x = mmToPixels(dimensions.marginX + col * (dimensions.cardWidth + dimensions.spacing))
    const y = mmToPixels(dimensions.marginY + row * (dimensions.cardHeight + dimensions.spacing))
    const cardWidth = mmToPixels(dimensions.cardWidth)
    const cardHeight = mmToPixels(dimensions.cardHeight)

    // Draw card background
    ctx.fillStyle = "#f0f0f0"
    ctx.fillRect(x, y, cardWidth, cardHeight)

    // Draw card image if available
    if (card.image) {
      return new Promise<void>((resolve) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          // Calculate position and scale
          // The center of the card
          const cardCenterX = x + cardWidth / 2
          const cardCenterY = y + cardHeight / 2

          // Apply the position offset (scaled by card dimensions)
          const offsetX = (cardWidth * card.position.x) / 100
          const offsetY = (cardHeight * card.position.y) / 100

          // Final position with offset
          const imgX = cardCenterX + offsetX
          const imgY = cardCenterY + offsetY

          // Calculate the correct scale for high-res output
          // We need to scale the image proportionally to the card size
          const imageScale = card.scale * (cardWidth / (dimensions.cardWidth * (previewDpi / 25.4)))

          // Draw the image with high quality
          ctx.save()
          ctx.translate(imgX, imgY)
          ctx.scale(imageScale, imageScale)
          ctx.translate(-img.width / 2, -img.height / 2)

          // Use better quality rendering
          ctx.drawImage(img, 0, 0)
          ctx.restore()
          resolve()
        }
        img.onerror = () => {
          console.error("Failed to load image:", card.image)
          resolve()
        }
        img.src = card.image
      })
    }
    return Promise.resolve()
  })

  // Wait for all images to be drawn
  await Promise.all(drawPromises)

  // Apply CMYK conversion if needed
  if (applyCmyk) {
    return applyRgbToCmykToCanvas(canvas)
  }

  return canvas
}
