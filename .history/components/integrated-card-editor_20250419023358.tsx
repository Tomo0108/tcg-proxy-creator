"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, useMemo } from "react" // useMemo を追加
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
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [exportQuality, setExportQuality] = useState<"standard" | "high" | "ultra">("high")
  const [isExporting, setIsExporting] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Refs
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const printRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // State for container width
  const [containerWidth, setContainerWidth] = useState(0);

  // Card dimensions in mm
  const cardDimensions = {
    pokemon: { width: 63, height: 88 },
    yugioh: { width: 59, height: 86 },
  }

  const { width, height } = cardDimensions[cardType as keyof typeof cardDimensions]

  // A4 size in mm
  const a4Width = 210
  const a4Height = 297

  // Calculate grid properties (memoized based on inputs)
  const { cardsPerRow, cardsPerColumn, gridWidth, gridHeight, marginX, marginY } = useMemo(() => {
    const cpr = Math.floor((a4Width + spacing) / (width + spacing))
    const cpc = Math.floor((a4Height + spacing) / (height + spacing))
    // Handle cases where dimensions or spacing might lead to zero cards per row/column
    const gw = cpr > 0 ? cpr * width + (cpr - 1) * spacing : 0;
    const gh = cpc > 0 ? cpc * height + (cpc - 1) * spacing : 0;
    const mx = (a4Width - gw) / 2
    const my = (a4Height - gh) / 2
    console.log("Grid calculation:", { cpr, cpc, gw, gh, mx, my }); // Debug log
    return { cardsPerRow: cpr, cardsPerColumn: cpc, gridWidth: gw, gridHeight: gh, marginX: mx, marginY: my };
  }, [a4Width, a4Height, width, height, spacing]);

  // mmToPixels depends on containerWidth state
  const mmToPixels = useCallback((mm: number) => {
    if (containerWidth === 0) return 0; // Return 0 if width is not determined yet
    const scale = containerWidth / a4Width;
    return mm * scale;
  }, [a4Width, containerWidth]); // Depend on containerWidth state

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file, index);
    }
    e.target.value = "";
  };

  // Process image
  const processImage = useCallback((file: File, index: number) => {
    setIsProcessingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const imageDataUrl = event.target?.result as string;
        const originalSize = { width: img.width, height: img.height };
        onCardUpdate(
          { image: imageDataUrl, scale: 1, type: cardType, originalSize, position: { x: 0, y: 0 } },
          index,
        );
        toast({ title: t("toast.imageAdded"), description: `画像をスロット ${index + 1} に追加しました。` });
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        toast({ title: "画像読み込みエラー", description: "画像の読み込みに失敗しました。", variant: "destructive" });
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsProcessingImage(false);
      toast({ title: "ファイル読み込みエラー", description: "ファイルの読み込みに失敗しました。", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  }, [onCardUpdate, cardType, t]);

  // renderCanvas depends on containerWidth via mmToPixels
  const renderCanvas = useCallback(() => {
    // Ensure refs are set and containerWidth is determined
    if (!canvasRef.current || !printRef.current || containerWidth === 0) {
        console.log("renderCanvas skipped: refs or containerWidth not ready", { canvas: !!canvasRef.current, print: !!printRef.current, containerWidth });
        return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Use the state containerWidth for calculations
    const displayWidth = containerWidth;
    // Calculate displayHeight based on aspect ratio and containerWidth
    const displayHeight = (containerWidth / a4Width) * a4Height;

    // Check if calculated dimensions are valid before setting
    if (displayWidth <= 0 || displayHeight <= 0 || !Number.isFinite(displayWidth) || !Number.isFinite(displayHeight)) {
        console.warn("renderCanvas skipped: Invalid calculated canvas dimensions", { displayWidth, displayHeight });
        return;
    }

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    console.log(`Canvas size set to: ${canvas.width}x${canvas.height} based on containerWidth ${containerWidth}`);

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Ensure cardsPerRow and cardsPerColumn are valid before mapping
    if (cardsPerRow <= 0 || cardsPerColumn <= 0) {
        console.warn("renderCanvas: cardsPerRow or cardsPerColumn is zero or negative, skipping image loading.");
        return; // Avoid unnecessary processing or potential errors
    }

    const loadImages = cards.slice(0, cardsPerRow * cardsPerColumn).map((card, index) => { // Limit map to visible slots
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const drawXBg = mmToPixels(marginX + col * (width + spacing));
      const drawYBg = mmToPixels(marginY + row * (height + spacing));
      const drawCardWidthBg = mmToPixels(width);
      const drawCardHeightBg = mmToPixels(height);
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(drawXBg, drawYBg, drawCardWidthBg, drawCardHeightBg);

      if (!card || !card.image) return Promise.resolve();

      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const drawX = mmToPixels(marginX + col * (width + spacing));
          const drawY = mmToPixels(marginY + row * (height + spacing));
          const drawCardWidth = mmToPixels(width);
          const drawCardHeight = mmToPixels(height);

          // Ensure draw dimensions are valid
          if (drawCardWidth <= 0 || drawCardHeight <= 0) {
              console.warn(`Skipping image draw for index ${index}: Invalid card dimensions`);
              resolve();
              return;
          }

          ctx.save();
          ctx.beginPath();
          ctx.rect(drawX, drawY, drawCardWidth, drawCardHeight);
          ctx.clip();

          const imgAspectRatio = img.width / img.height;
          const cardAspectRatio = drawCardWidth / drawCardHeight;
          const cardScale = card.scale || 1;

          let baseWidth, baseHeight;
          if (imgAspectRatio > cardAspectRatio) {
            baseWidth = drawCardWidth;
            baseHeight = baseWidth / imgAspectRatio;
          } else {
            baseHeight = drawCardHeight;
            baseWidth = baseHeight * imgAspectRatio;
          }

          const targetWidth = baseWidth * cardScale;
          const targetHeight = baseHeight * cardScale;
          const imgDrawX = drawX + (drawCardWidth - targetWidth) / 2;
          const imgDrawY = drawY + (drawCardHeight - targetHeight) / 2;

          // Ensure target dimensions are valid
          if (targetWidth > 0 && targetHeight > 0) {
              ctx.drawImage(img, imgDrawX, imgDrawY, targetWidth, targetHeight);
          } else {
              console.warn(`Skipping image draw for index ${index}: Invalid target dimensions`);
          }

          ctx.restore();
          resolve();
        };
        img.onerror = () => {
          console.error("Failed to load image:", card.image);
          // Draw error indicator
          const drawX = mmToPixels(marginX + col * (width + spacing));
          const drawY = mmToPixels(marginY + row * (height + spacing));
          const drawCardWidth = mmToPixels(width);
          const drawCardHeight = mmToPixels(height);
          if (drawCardWidth > 0 && drawCardHeight > 0) {
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

  // useEffect for loading selected card data is removed as the editor panel is gone.

  // useEffect to handle resize and initial render using ResizeObserver
  useEffect(() => {
    const element = printRef.current;
    if (!element) return;

    // Define the callback for the observer
    const handleResize = () => {
      console.log("ResizeObserver triggered canvas render");
      renderCanvas(); // renderCanvas is stable due to useCallback
    };

    // Create and observe the element
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(element);

    // Initial render call after mount, ensuring size is available
    // Use setTimeout to defer execution slightly, allowing layout calculation
    const timeoutId = setTimeout(() => {
       console.log("Initial render triggered by setTimeout");
       // Double-check if the element still exists and has width
       if (printRef.current && printRef.current.clientWidth > 0) {
         renderCanvas();
       } else {
         console.warn("Initial render skipped: printRef not ready or has no width.");
         // The ResizeObserver should trigger the render once the size is available.
       }
    }, 0); // 0ms delay

    // Cleanup observer on component unmount or when element changes
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.unobserve(element);
      resizeObserver.disconnect();
    };
    // This effect depends on renderCanvas. If renderCanvas changes (due to its own dependencies like cardType),
    // the effect will re-run, setting up the observer again and triggering an initial render.
  }, [renderCanvas]); // renderCanvas is stable due to useCallback

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
                        onClick={() => {
                          setSelectedCardIndex(index); // Keep for highlighting
                          // Click the specific input using the ref array
                          inputRefs.current[index]?.click();
                        }}
                      >
                        {/* Hidden file input specific to this cell, assign ref */}
                        <Input
                          ref={(el) => { inputRefs.current[index] = el; }} // Correct ref assignment
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, index)} // Pass index
                        />
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
                  {/* No single hidden input needed here anymore */}
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
