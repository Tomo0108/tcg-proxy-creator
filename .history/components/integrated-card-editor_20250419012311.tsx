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
  // selectedCardIndex は、どのスロットに画像を追加するかを一時的に保持するために使用
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  // 削除する State: uploadedImage, imageScale, originalImageSize
  // const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  // const [imageScale, setImageScale] = useState(1);
  // const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 })
  const [exportQuality, setExportQuality] = useState<"standard" | "high" | "ultra">("high")
  const [isExporting, setIsExporting] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false); // 画像処理中のフラグは維持

  const fileInputRef = useRef<HTMLInputElement>(null)
  // 削除する Ref: previewContainerRef
  // const previewContainerRef = useRef<HTMLDivElement>(null)
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
  }, [a4Width, printRef]); // Added printRef dependency

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImage(file)
    }
  }

  // Process image - Updated to calculate initial fit scale
  const processImage = useCallback((file: File) => {
    setIsProcessingImage(true); // Start processing
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const newOriginalSize = { width: img.width, height: img.height };
        setOriginalImageSize(newOriginalSize);
        setUploadedImage(img.src);

        // Calculate initial fit scale based on preview container
        if (previewContainerRef.current && newOriginalSize.width > 0 && newOriginalSize.height > 0) {
          const container = previewContainerRef.current;
          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;
          const imageAspectRatio = newOriginalSize.width / newOriginalSize.height;
          const containerAspectRatio = containerWidth / containerHeight;

          let fitScale;
          if (imageAspectRatio > containerAspectRatio) {
            fitScale = containerWidth / newOriginalSize.width; // Fit width
          } else {
            fitScale = containerHeight / newOriginalSize.height; // Fit height
          }
          // Don't set imageScale state with fitScale. imageScale is now relative.
          console.log("Calculated preview fit scale (for reference):", fitScale);
        }
        // Reset the user-controlled relative scale to 1 (fitted) for the new image
        setImageScale(1);
        setIsProcessingImage(false); // End processing
      }
      img.onerror = () => {
        console.error("Failed to load image for processing.");
        setUploadedImage(null);
        setOriginalImageSize({ width: 0, height: 0 });
        setImageScale(1);
        setIsProcessingImage(false); // End processing on error
        toast({ title: "画像読み込みエラー", description: "画像の読み込みに失敗しました。", variant: "destructive" });
      }
      img.src = event.target?.result as string
    }
    reader.onerror = () => {
       console.error("FileReader error.");
       setIsProcessingImage(false); // End processing on error
       toast({ title: "ファイル読み込みエラー", description: "ファイルの読み込みに失敗しました。", variant: "destructive" });
    }
    reader.readAsDataURL(file)
  }, [previewContainerRef]); // Dependency on the ref container

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
          position: { x: 0, y: 0 }, // Add default position
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

    // Use mmToPixels for consistent scaling between canvas drawing and overlay grid
    const drawOffsetX = 0; // Draw from top-left of the canvas (Keep offset logic if needed, though it's 0 now)
    const drawOffsetY = 0;

    console.log(`Canvas size set to: ${canvas.width}x${canvas.height}`);

    // Clear canvas
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const loadImages = cards.map((card, index) => {
      // Draw background for the card slot using mmToPixels
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      // Use mmToPixels for background position and size, applying drawOffset if necessary (though it's 0)
      const drawXBg = drawOffsetX + mmToPixels(marginX + col * (width + spacing));
      const drawYBg = drawOffsetY + mmToPixels(marginY + row * (height + spacing));
      const drawCardWidthBg = mmToPixels(width);
      const drawCardHeightBg = mmToPixels(height);
      ctx.fillStyle = "#f0f0f0"; // Light grey background for card area
      ctx.fillRect(drawXBg, drawYBg, drawCardWidthBg, drawCardHeightBg);

      if (!card || !card.image) return Promise.resolve(); // Skip image drawing if no card or no image

      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // Use mmToPixels for position and size in CANVAS PIXELS
          const drawX = drawOffsetX + mmToPixels(marginX + col * (width + spacing));
          const drawY = drawOffsetY + mmToPixels(marginY + row * (height + spacing));
          const drawCardWidth = mmToPixels(width);
          const drawCardHeight = mmToPixels(height);

          ctx.save();
          ctx.beginPath();
          ctx.rect(drawX, drawY, drawCardWidth, drawCardHeight);
          ctx.clip(); // Clip drawing to the card boundaries

          // Calculate image draw size to fit, maintaining aspect ratio and applying card's specific scale
          const imgAspectRatio = img.width / img.height;
          const cardAspectRatio = drawCardWidth / drawCardHeight;
          const cardScale = card.scale || 1; // Use saved relative scale (1 = fitted)

          // Calculate base size to fit the image within the card slot (drawCardWidth, drawCardHeight)
          let baseWidth, baseHeight;
          if (imgAspectRatio > cardAspectRatio) { // Image wider than card slot
            baseWidth = drawCardWidth;
            baseHeight = baseWidth / imgAspectRatio;
          } else { // Image taller than or same aspect ratio as card slot
            baseHeight = drawCardHeight;
            baseWidth = baseHeight * imgAspectRatio;
          }

          // Apply the relative scale to the base (fitted) size
          const targetWidth = baseWidth * cardScale;
          const targetHeight = baseHeight * cardScale;

          // Center the final scaled image within the card area
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
          // Use mmToPixels for error indicator position and size
          const drawX = drawOffsetX + mmToPixels(marginX + col * (width + spacing));
          const drawY = drawOffsetY + mmToPixels(marginY + row * (height + spacing));
          const drawCardWidth = mmToPixels(width);
          const drawCardHeight = mmToPixels(height);
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
    // Dependencies for renderCanvas - Added mmToPixels
  }, [cards, spacing, cardType, a4Width, width, height, marginX, marginY, cardsPerRow, cardsPerColumn, mmToPixels]);

  // useEffect to load selected card data
  useEffect(() => {
    const selectedCard = cards[selectedCardIndex];
    if (selectedCard) {
      setUploadedImage(selectedCard.image);
      // IMPORTANT: Only set scale from saved data if NOT currently processing a new image upload.
      // This prevents the saved scale from immediately overwriting the calculated fit scale.
      if (!isProcessingImage) {
          setImageScale(selectedCard.scale || 1); // Use saved scale or default to 1
      }
      // Load original size regardless
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
      // Clear fields if no card is selected or card data is missing
      setUploadedImage(null);
      setImageScale(1);
      setOriginalImageSize({ width: 0, height: 0 });
    }
    // Dependency: Only run when selected card index or the cards array changes.
  }, [selectedCardIndex, cards]);

  // Removed the useEffect that recalculated scale based on uploadedImage/originalImageSize
  // The logic is now handled within processImage for initial fit and the above useEffect for loading saved scale.

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

      {/* Main Content Area - Simplified to only show Print Layout */}
      <div className="grid grid-cols-1 gap-6">
        {/* Print Layout Preview */}
        <Card className="col-span-1"> {/* Ensure it takes full width */}
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
                  {/* Canvas for drawing - Added explicit style reset */}
                  <canvas
                    ref={canvasRef}
                    id="print-layout-canvas"
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ padding: 0, border: 'none', margin: 0, display: 'block' }} // Added style reset
                  />

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
