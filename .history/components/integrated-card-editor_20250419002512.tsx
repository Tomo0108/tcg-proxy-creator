"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react" // useCallback をインポート
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Download, Printer, Trash2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { generatePDF, generatePNG } from "@/lib/pdf-generator"
import { toast } from "@/components/ui/use-toast"
import { useMobileDetect } from "@/hooks/use-mobile"

interface IntegratedCardEditorProps {
  cardType: string
  spacing: number
  cmykConversion: boolean
  cards: any[]
  onCardUpdate: (card: any, index: number) => void
  onCardRemove: (index: number) => void
}

export function IntegratedCardEditor({
  cardType,
  spacing,
  cmykConversion,
  cards,
  onCardUpdate,
  onCardRemove,
}: IntegratedCardEditorProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetect()
  const [selectedCardIndex, setSelectedCardIndex] = useState(0)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [imageScale, setImageScale] = useState(1)
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 })
  const [exportQuality, setExportQuality] = useState<"standard" | "high" | "ultra">("high")
  const [isExporting, setIsExporting] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false); // Add state for processing

  const previewContainerRef = useRef<HTMLDivElement>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Card dimensions in mm
  const cardDimensions = {
    pokemon: { width: 63, height: 88 },
    yugioh: { width: 59, height: 86 },
  }

  const { width, height } = cardDimensions[cardType as keyof typeof cardDimensions]

  // A4 size in mm: 210 x 297
  const a4Width = 210
  const a4Height = 297

  // Calculate how many cards can fit
  const cardsPerRow = Math.floor((a4Width + spacing) / (width + spacing))
  const cardsPerColumn = Math.floor((a4Height + spacing) / (height + spacing))
  const gridWidth = cardsPerRow * width + (cardsPerRow - 1) * spacing
  const gridHeight = cardsPerColumn * height + (cardsPerColumn - 1) * spacing
  const marginX = (a4Width - gridWidth) / 2
  const marginY = (a4Height - gridHeight) / 2

  // mmToPixels を useCallback でラップ
  const mmToPixels = useCallback((mm: number) => {
    // This calculation might need adjustment depending on the desired preview size vs actual A4 ratio
    // For the overlay grid, we need a scale relative to the printRef container size.
    if (!printRef.current) return 0; // Should not happen if called after ref is set
    const containerWidth = printRef.current.clientWidth;
    // Scale mm to pixels based on the container width representing A4 width
    const scale = containerWidth / a4Width;
    return mm * scale;
  }, [a4Width]); // a4Width is constant

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImage(file)
    }
  }

  // Process image
  const processImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        setOriginalImageSize({ width: img.width, height: img.height })
        setUploadedImage(img.src)
        // Don't reset scale here, let the preview useEffect handle fitting
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      processImage(files[0])
    }
  }

  // Save current card
  const handleSaveCard = () => {
    if (uploadedImage) {
      onCardUpdate(
        {
          image: uploadedImage,
          scale: imageScale, // Save the scale from the slider/input
          type: cardType,
          originalSize: originalImageSize,
        },
        selectedCardIndex,
      )
      toast({
        title: t("toast.cardSaved"),
        description: `${t("toast.cardSavedDesc")} ${selectedCardIndex + 1}`,
      })
    }
  }

  // renderCanvas を useCallback でラップ
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || !printRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Match canvas buffer size to its display size for clarity
    const displayWidth = printRef.current.clientWidth;
    const displayHeight = printRef.current.clientHeight;
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Calculate scale factor based on canvas width and A4 width in mm
    // This scaleFactor converts mm units in the layout logic to pixels on the canvas
    const scaleFactor = canvas.width / a4Width; // pixels per mm
    const drawOffsetX = 0; // Draw from top-left of the canvas
    const drawOffsetY = 0;

    console.log(`Canvas size set to: ${canvas.width}x${canvas.height}`);
    console.log(`Scale factor (canvas px / a4 mm): ${scaleFactor}`);

    // Clear canvas
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const loadImages = cards.map((card, index) => {
      // Draw background for the card slot regardless of image
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const drawXBg = drawOffsetX + (marginX + col * (width + spacing)) * scaleFactor;
      const drawYBg = drawOffsetY + (marginY + row * (height + spacing)) * scaleFactor;
      const drawCardWidthBg = width * scaleFactor;
      const drawCardHeightBg = height * scaleFactor;
      ctx.fillStyle = "#f0f0f0"; // Light grey background for card area
      ctx.fillRect(drawXBg, drawYBg, drawCardWidthBg, drawCardHeightBg);


      if (!card || !card.image) return Promise.resolve(); // Skip image drawing if no card or no image

      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // Recalculate position and size in CANVAS PIXELS using scaleFactor (redundant but safe)
          const drawX = drawOffsetX + (marginX + col * (width + spacing)) * scaleFactor;
          const drawY = drawOffsetY + (marginY + row * (height + spacing)) * scaleFactor;
          const drawCardWidth = width * scaleFactor;
          const drawCardHeight = height * scaleFactor;

          ctx.save();
          ctx.beginPath();
          ctx.rect(drawX, drawY, drawCardWidth, drawCardHeight);
          ctx.clip(); // Clip drawing to the card boundaries

          // Calculate image draw size to fit, maintaining aspect ratio and applying card's specific scale
          const imgAspectRatio = img.width / img.height;
          const cardAspectRatio = drawCardWidth / drawCardHeight;
          const cardScale = card.scale || 1; // Use saved scale or default to 1

          let targetWidth, targetHeight;
          if (imgAspectRatio > cardAspectRatio) { // Image wider than card aspect ratio
            targetWidth = drawCardWidth * cardScale;
            targetHeight = targetWidth / imgAspectRatio;
          } else { // Image taller than card aspect ratio
            targetHeight = drawCardHeight * cardScale;
            targetWidth = targetHeight * imgAspectRatio;
          }

          // Center the scaled image within the card area
          const imgDrawX = drawX + (drawCardWidth - targetWidth) / 2;
          const imgDrawY = drawY + (drawCardHeight - targetHeight) / 2;

          ctx.drawImage(img, imgDrawX, imgDrawY, targetWidth, targetHeight);
          ctx.restore(); // Restore context to remove clipping
          resolve();
        };
        img.onerror = () => {
          console.error("Failed to load image:", card.image);
          // Optionally draw an error indicator within the clipped area
          ctx.save();
          const drawX = drawOffsetX + (marginX + col * (width + spacing)) * scaleFactor;
          const drawY = drawOffsetY + (marginY + row * (height + spacing)) * scaleFactor;
          const drawCardWidth = width * scaleFactor;
          const drawCardHeight = height * scaleFactor;
          ctx.beginPath();
          ctx.rect(drawX, drawY, drawCardWidth, drawCardHeight);
          ctx.clip();
          ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; // Semi-transparent red
          ctx.fillRect(drawX, drawY, drawCardWidth, drawCardHeight);
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.fillText("Error", drawX + drawCardWidth / 2, drawY + drawCardHeight / 2);
          ctx.restore();
          resolve(); // Resolve even on error
        };
        img.src = card.image;
      });
    });

    Promise.all(loadImages).then(() => {
      console.log("Canvas rendering complete");
    });
    // Dependencies for renderCanvas
  }, [cards, spacing, cardType, a4Width, width, height, marginX, marginY, cardsPerRow, cardsPerColumn]);

  // useEffect to load selected card data
  useEffect(() => {
    const selectedCard = cards[selectedCardIndex];
    if (selectedCard) {
      setUploadedImage(selectedCard.image);
      setImageScale(selectedCard.scale || 1); // Use saved scale or default to 1
      if (selectedCard.originalSize) {
        setOriginalImageSize(selectedCard.originalSize);
      } else if (selectedCard.image) {
         // If originalSize is missing, try to load the image to get dimensions
         const img = new Image();
         img.onload = () => setOriginalImageSize({ width: img.width, height: img.height });
         img.onerror = () => setOriginalImageSize({ width: 0, height: 0 }); // Handle image load error
         img.src = selectedCard.image;
      } else {
        setOriginalImageSize({ width: 0, height: 0 });
      }
    } else {
      setUploadedImage(null);
      setImageScale(1);
      setOriginalImageSize({ width: 0, height: 0 });
    }
  }, [selectedCardIndex, cards]);

  // useEffect to recalculate scale for the EDITOR PREVIEW (fits image into the box)
  useEffect(() => {
    if (uploadedImage && previewContainerRef.current && originalImageSize.width > 0 && originalImageSize.height > 0) {
      const container = previewContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const imageAspectRatio = originalImageSize.width / originalImageSize.height;
      const containerAspectRatio = containerWidth / containerHeight;

      let fitScale;
      if (imageAspectRatio > containerAspectRatio) {
        fitScale = containerWidth / originalImageSize.width; // Fit width
      } else {
        fitScale = containerHeight / originalImageSize.height; // Fit height
      }
      // This useEffect sets the scale to *fit* the preview box.
      // The user then adjusts this via the slider, which updates the `imageScale` state.
      // When saving, the `imageScale` state (potentially modified by user) is saved.
      // When loading a card, we set `imageScale` from the saved data.
      // Maybe we need two scales: one for fitting, one for user adjustment?
      // For now, let's assume `imageScale` is the user-controlled scale, and the preview just displays it.
      // Let's NOT automatically fit the scale here, but let the user control it from the loaded value or default 1.
      // The `transform: scale()` in the preview JSX will use the `imageScale` state.

    }
     // Only trigger when the image source or its original size changes.
  }, [uploadedImage, originalImageSize]);

   // useEffect to trigger canvas render
   useEffect(() => {
    renderCanvas();
    // The dependency array includes renderCanvas itself, which changes when its own dependencies change.
  }, [renderCanvas]);

  // Get DPI for export
  const getDpiForQuality = () => {
    switch (exportQuality) {
      case "standard": return 300;
      case "high": return 450;
      case "ultra": return 600;
      default: return 300; // Default to standard
    }
  }

  // Export functions
  const handleExportPDF = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      if (exportQuality === "ultra") {
        toast({ title: "高品質出力処理中", description: "高解像度PDFの生成には時間がかかる場合があります。" });
      }
      const options = {
        cards, spacing, cardType, cmykConversion, dpi: getDpiForQuality(), canvas: canvasRef.current,
        dimensions: { a4Width, a4Height, cardWidth: width, cardHeight: height, marginX, marginY, cardsPerRow, cardsPerColumn },
      };
      const pdfBlob = await generatePDF(options);
      downloadFile(pdfBlob, "tcg-proxy-cards.pdf");
      toast({ title: t("toast.pdfSuccess"), description: t("toast.pdfSuccessDesc") });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast({ title: t("toast.exportError"), description: `${t("toast.exportErrorDesc")}${error instanceof Error ? error.message : t("unknown error")}`, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }

  const handleExportPNG = async () => {
     if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      if (exportQuality === "ultra") {
        toast({ title: "高品質出力処理中", description: "高解像度PNGの生成には時間がかかる場合があります。" });
      }
       const options = {
        cards, spacing, cardType, cmykConversion, dpi: getDpiForQuality(), canvas: canvasRef.current,
        dimensions: { a4Width, a4Height, cardWidth: width, cardHeight: height, marginX, marginY, cardsPerRow, cardsPerColumn },
      };
      const pngBlob = await generatePNG(options);
      downloadFile(pngBlob, "tcg-proxy-cards.png");
      toast({ title: t("toast.pngSuccess"), description: t("toast.pngSuccessDesc") });
    } catch (error) {
      console.error("PNG export failed:", error);
      toast({ title: t("toast.exportError"), description: `${t("toast.exportErrorDesc")}${error instanceof Error ? error.message : t("unknown error")}`, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }

  // File download helper
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Component JSX
  return (
    <div className="space-y-6">
      {/* Card Selection Grid */}
      <div className="grid grid-cols-3 md:grid-cols-9 gap-2 mb-4">
        {Array(cardsPerRow * cardsPerColumn).fill(0).slice(0, 9).map((_, index) => ( // Limit to 9 slots for now
          <Button
            key={index}
            variant={selectedCardIndex === index ? "default" : "outline"}
            className={`h-12 flex items-center justify-center relative ${selectedCardIndex === index ? "bg-gold-500 hover:bg-gold-600" : ""} ${cards[index] ? "border-gold-300" : ""}`}
            onClick={() => setSelectedCardIndex(index)}
          >
            {index + 1}
            {cards[index] && <div className="w-2 h-2 bg-green-500 rounded-full absolute top-1 right-1 ring-1 ring-white"></div>} {/* Changed indicator */}
          </Button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Editor */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">{t("editor.cardPreview")} #{selectedCardIndex + 1}</h3>
            {/* Image Upload */}
            <div
              className="border-2 border-dashed rounded-lg p-4 mb-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="h-6 w-6 text-gray-400 mb-1" />
              <p className="text-sm text-gray-500">{t("editor.clickToUpload")}</p>
              <p className="text-xs text-gray-400">{t("editor.fileTypes")}</p>
              <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Card Preview Box */}
            <div
              ref={previewContainerRef}
              className="border rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 mb-4 mx-auto relative" // Added background color for empty state
              style={{
                // Use fixed pixel size for preview consistency, aspect ratio based on card type
                width: `200px`, // Fixed width
                height: `${(height / width) * 200}px`, // Calculate height based on aspect ratio
              }}
            >
              {uploadedImage ? (
                <div
                  style={{
                    position: "absolute", top: `50%`, left: `50%`,
                    // Use the actual image dimensions for transform origin if needed, but translate(-50%, -50%) works for centering
                    transform: `translate(-50%, -50%) scale(${imageScale})`,
                    // The div itself should match the container size for centering logic
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <img
                    src={uploadedImage}
                    alt="Card preview"
                    // Let the transform scale handle the size, objectFit ensures aspect ratio within the img tag boundaries if they were constrained
                    style={{
                        display: 'block', // Prevents extra space below image
                        maxWidth: 'none', // Allow image to exceed container before scaling
                        maxHeight: 'none',
                        // Use original image size to maintain aspect ratio correctly with scale transform
                        width: `${originalImageSize.width}px`,
                        height: `${originalImageSize.height}px`,
                        objectFit: "contain", // Should not be strictly necessary with explicit w/h + scale
                     }}
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <p className="text-sm">{t("editor.noImage")}</p>
                </div>
              )}
            </div>

            {/* Image Controls */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="image-scale">{t("editor.imageScale")}</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="image-scale" type="range" min="0.1" max="3" step="0.01" // Range slider for scale
                    value={imageScale}
                    onChange={(e) => setImageScale(Number(e.target.value))}
                    disabled={!uploadedImage}
                    className="w-full"
                  />
                   <span className="text-sm text-gray-500 w-12 text-right">{imageScale.toFixed(2)}x</span> {/* Display value */}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button className="flex-1 bg-gold-500 hover:bg-gold-600" onClick={handleSaveCard} disabled={!uploadedImage}>
                  {t("editor.saveToCard")} {selectedCardIndex + 1}
                </Button>
                {cards[selectedCardIndex] && (
                  <Button variant="destructive" size="icon" className="w-10 flex-none" onClick={() => onCardRemove(selectedCardIndex)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Print Layout Preview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">{t("layout.preview")}</h3>
            </div>
            {/* A4 Aspect Ratio Container */}
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg overflow-hidden">
              <div
                ref={printRef}
                className="relative bg-white dark:bg-gray-900 border rounded-lg mx-auto"
                style={{
                  width: "100%", aspectRatio: `${a4Width} / ${a4Height}`,
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", overflow: "hidden",
                }}
              >
                {/* Canvas for drawing */}
                <canvas ref={canvasRef} id="print-layout-canvas" className="absolute top-0 left-0 w-full h-full" />

                {/* Overlay Grid for Interaction - Scaled using mmToPixels */}
                <div
                  className="absolute top-0 left-0 w-full h-full z-10"
                  style={{
                    // Use mmToPixels which now scales based on printRef width
                    paddingLeft: `${mmToPixels(marginX)}px`,
                    paddingTop: `${mmToPixels(marginY)}px`,
                    width: `${mmToPixels(gridWidth)}px`,
                    height: `${mmToPixels(gridHeight)}px`,
                    pointerEvents: "none", // Container doesn't capture clicks
                  }}
                >
                  <div
                    className="grid h-full w-full"
                    style={{
                      gridTemplateColumns: `repeat(${cardsPerRow}, ${mmToPixels(width)}px)`,
                      gridTemplateRows: `repeat(${cardsPerColumn}, ${mmToPixels(height)}px)`,
                      gap: `${mmToPixels(spacing)}px`,
                    }}
                  >
                    {/* Clickable Card placeholders */}
                    {Array(cardsPerRow * cardsPerColumn).fill(0).map((_, index) => (
                      <div
                        key={index}
                        className={`relative border border-dashed border-gray-400 dark:border-gray-600 rounded cursor-pointer transition-all hover:bg-blue-100/30 dark:hover:bg-blue-900/30 ${
                          selectedCardIndex === index ? "ring-2 ring-gold-500 ring-offset-1 bg-blue-100/50 dark:bg-blue-900/50" : ""
                        }`}
                        style={{ pointerEvents: "auto" }} // Cells capture clicks
                        onClick={() => setSelectedCardIndex(index)}
                      >
                        {/* Remove button inside grid cell */}
                        {cards[index] && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-0.5 right-0.5 h-4 w-4 z-20 p-0" // Smaller, positioned top-right
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent grid cell click
                              onCardRemove(index);
                            }}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        )}
                         {/* Display index number */}
                         <span className="absolute bottom-0.5 left-0.5 text-xs text-gray-400 dark:text-gray-600">{index + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Export Controls */}
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="export-quality">{t("layout.exportQuality")}</Label>
                <select
                  id="export-quality"
                  className="text-sm border rounded p-1 bg-background w-full mt-2"
                  value={exportQuality}
                  title={t("layout.exportQuality")}
                  onChange={(e) => setExportQuality(e.target.value as any)}
                >
                  <option value="standard">標準 (300 DPI)</option>
                  <option value="high">高品質 (450 DPI)</option>
                  <option value="ultra">超高品質 (600 DPI)</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
                <div className="flex space-x-2 justify-end w-full sm:w-auto">
                  <Button variant="outline" onClick={() => window.print()} className="flex-1 sm:flex-none sm:w-28">
                    <Printer className="mr-2 h-4 w-4" /> {t("action.print")}
                  </Button>
                  <Button variant="outline" onClick={handleExportPNG} disabled={isExporting} className="flex-1 sm:flex-none sm:w-28">
                    <Download className="mr-2 h-4 w-4" /> PNG
                  </Button>
                  <Button className="bg-gold-500 hover:bg-gold-600 flex-1 sm:flex-none sm:w-28" onClick={handleExportPDF} disabled={isExporting}>
                    <Download className="mr-2 h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
