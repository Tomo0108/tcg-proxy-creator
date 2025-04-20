// Enhanced RGB to CMYK conversion and canvas processing with improved image quality

// RGB to CMYK conversion (Simple Simulation)
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

// Apply CMYK simulation to canvas (Simple Mode)
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

    // Convert back to RGB for display (Simplified simulation)
    const k = cmyk.k / 100
    data[i] = Math.round(r * (1 - cmyk.c / 100) * (1 - k))
    data[i + 1] = Math.round(g * (1 - cmyk.m / 100) * (1 - k))
    data[i + 2] = Math.round(b * (1 - cmyk.y / 100) * (1 - k))
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

// Create a high-resolution print-ready canvas (Fallback for PNG if dimensions missing)
export function createPrintReadyCanvas(
  sourceCanvas: HTMLCanvasElement,
  dpi = 350,
  applyCmykSimulation = true, // Renamed for clarity
): HTMLCanvasElement {
  // Create a new canvas with the correct DPI
  const printCanvas = document.createElement("canvas")

  // Calculate dimensions based on DPI (Assuming A4 for fallback)
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

  // Apply CMYK simulation if needed
  if (applyCmykSimulation) {
    return applyRgbToCmykToCanvas(printCanvas)
  }

  return printCanvas
}

// Helper function to calculate DPI based on physical size (Not currently used, but kept)
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

// Render high-quality cards directly onto a canvas (Used for PNG and potentially PDF pre-rendering)
export async function renderHighQualityCards(
  cards: any[], // Should be CardData[] ideally, but any[] for flexibility if structure varies
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
   applyCmyk = true, // This now controls whether CMYK simulation is applied in 'simple' mode
   cmykMode: "simple" | "accurate" = "simple",
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

  // Draw each card at high resolution
  const drawPromises = cards.map((card, index) => {
    if (!card) return Promise.resolve() // Skip null/empty slots

    const row = Math.floor(index / dimensions.cardsPerRow)
    const col = index % dimensions.cardsPerRow

    // Calculate card position in pixels
    const x = mmToPixels(dimensions.marginX + col * (dimensions.cardWidth + dimensions.spacing))
    const y = mmToPixels(dimensions.marginY + row * (dimensions.cardHeight + dimensions.spacing))
    const cardWidthPx = mmToPixels(dimensions.cardWidth)
    const cardHeightPx = mmToPixels(dimensions.cardHeight)

    // Draw card background/placeholder (optional, good for debugging)
    // ctx.fillStyle = "#f0f0f0";
    // ctx.fillRect(x, y, cardWidthPx, cardHeightPx);

    // Draw card image if available
    if (card.image) {
      return new Promise<void>((resolve, reject) => { // Added reject
        const img = new Image()
        img.crossOrigin = "anonymous"; // Important for loading data URLs or external images
        img.onload = () => {
          try { // Added try...catch for drawing errors
            ctx.save();
            // Clip drawing to the card boundaries
            ctx.beginPath();
            ctx.rect(x, y, cardWidthPx, cardHeightPx);
            ctx.clip();

            // Calculate image draw size and position based on card.scale and card.position
            const originalImgWidth = card.originalSize?.width || img.width;
            const originalImgHeight = card.originalSize?.height || img.height;
            const imgAspectRatio = originalImgWidth / originalImgHeight;
            const cardAspectRatio = cardWidthPx / cardHeightPx;
            const cardScale = card.scale || 1;
            const cardPosition = card.position || { x: 0, y: 0 };

            let baseWidth, baseHeight;
            if (imgAspectRatio > cardAspectRatio) {
              baseHeight = cardHeightPx;
              baseWidth = baseHeight * imgAspectRatio;
            } else {
              baseWidth = cardWidthPx;
              baseHeight = baseWidth / imgAspectRatio;
            }

            const targetWidth = baseWidth * cardScale;
            const targetHeight = baseHeight * cardScale;

            // Calculate offset including cardPosition adjustment
            const offsetX = x + (cardWidthPx - targetWidth) / 2 + cardPosition.x * Math.abs(cardWidthPx - targetWidth) / 2;
            const offsetY = y + (cardHeightPx - targetHeight) / 2 + cardPosition.y * Math.abs(cardHeightPx - targetHeight) / 2;

            // Draw the image
            ctx.drawImage(img, offsetX, offsetY, targetWidth, targetHeight);

            ctx.restore(); // Restore context to remove clipping
            resolve();
          } catch (drawError) {
            console.error(`Error drawing image for card ${index}:`, drawError);
            reject(drawError); // Reject promise on drawing error
          }
        };
        img.onerror = (errorEvent) => {
          console.error(`Failed to load image for card ${index}:`, card.image.substring(0,100)+"...", errorEvent);
          // Resolve anyway to not block Promise.all, but log the error
          // Alternatively, reject(errorEvent) if loading failure should stop the process
          resolve();
        }
        img.src = card.image
      })
    }
    return Promise.resolve() // Resolve immediately for empty slots
  })

  // Wait for all images to be drawn or load errors handled
   try {
     await Promise.all(drawPromises);
   } catch (error) {
     console.error("Error occurred during card drawing:", error);
     // Decide how to handle: maybe return a partially drawn canvas or throw
     // For now, continue to potentially apply CMYK simulation
   }

   // Apply CMYK simulation only if mode is 'simple' and CMYK is enabled
   if (applyCmyk && cmykMode === 'simple') {
     console.log("Applying simple CMYK simulation to rendered canvas.");
     return applyRgbToCmykToCanvas(canvas);
   }
   // Otherwise (CMYK disabled or mode is 'accurate'), return the RGB canvas
   console.log("Returning RGB canvas (CMYK disabled or mode is 'accurate').");
   return canvas;
}


// --- Accurate CMYK Profile Handling ---

let cachedCmykProfile: ArrayBuffer | null = null;

// Helper function to load CMYK profile (cached)
// Ensure this runs client-side
export async function loadCmykProfile(): Promise<ArrayBuffer> {
  if (typeof window === 'undefined') {
    throw new Error("loadCmykProfile can only be called client-side.");
  }
  if (cachedCmykProfile) {
    console.log("Using cached CMYK profile.");
    return cachedCmykProfile;
  }

  try {
    console.log("Fetching CMYK profile...");
    // Assuming the profile is in the public folder
    const response = await fetch('/profiles/ISOcoated_v2_eci.icc'); // Adjust path as needed
    if (!response.ok) {
      throw new Error(`Failed to fetch CMYK profile: ${response.statusText}`);
    }
    cachedCmykProfile = await response.arrayBuffer();
    console.log("CMYK profile loaded and cached.");
    return cachedCmykProfile;
  } catch (error) {
    console.error("Error loading CMYK profile:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Function to apply CMYK profile using a hypothetical library or native module
// This remains a placeholder as client-side ICC profile application is complex.
export async function applyCmykProfile(imageDataUrl: string, profile: ArrayBuffer): Promise<ArrayBuffer> {
  console.warn("Accurate CMYK profile application (applyCmykProfile) is not implemented in the browser. Returning placeholder data.");
  // Placeholder: In a real application, this would involve:
  // 1. Decoding the imageDataUrl (likely PNG or JPEG) into raw pixel data (e.g., RGBA).
  // 2. Using a color management library (like LittleCMS compiled to WebAssembly)
  //    to perform the color transformation from sRGB (assumed) to the target CMYK profile.
  // 3. Encoding the resulting CMYK pixel data into a suitable format (like a TIFF or JPEG with CMYK color space).
  // 4. Returning the ArrayBuffer of the CMYK image file.

  // For now, we return a dummy ArrayBuffer to satisfy the type signature.
  // In generatePDF, this ArrayBuffer will be wrapped in Uint8Array and passed to jsPDF.
  // jsPDF's handling of raw CMYK ArrayBuffer might be limited; it expects specific formats.
  // Returning the profile itself as a dummy buffer:
  // return profile;
  // Returning an empty buffer as a clearer placeholder:
  return new ArrayBuffer(0); // Return empty buffer to indicate failure/placeholder
}
