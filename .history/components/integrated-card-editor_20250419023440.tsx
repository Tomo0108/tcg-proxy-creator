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

  const { width: cardWidthMM, height: cardHeightMM } = cardDimensions[cardType as keyof typeof cardDimensions] // Renamed to avoid conflict

  // A4 size in mm
  const a4Width = 210
  const a4Height = 297

  // Calculate grid properties (memoized based on inputs)
  const { cardsPerRow, cardsPerColumn, gridWidthMM, gridHeightMM, marginXMM, marginYMM } = useMemo(() => { // Renamed MM variables
    // Ensure dimensions + spacing are positive
    const effectiveCardWidth = cardWidthMM + spacing;
    const effectiveCardHeight = cardHeightMM + spacing;
    if (effectiveCardWidth <= 0 || effectiveCardHeight <= 0) {
        console.warn("Grid calculation skipped: Invalid card dimensions or spacing", { cardWidthMM, cardHeightMM, spacing });
        return { cardsPerRow: 0, cardsPerColumn: 0, gridWidthMM: 0, gridHeightMM: 0, marginXMM: 0, marginYMM: 0 };
    }

    const cpr = Math.floor((a4Width + spacing) / effectiveCardWidth);
    const cpc = Math.floor((a4Height + spacing) / effectiveCardHeight);

    // Ensure cpr and cpc are non-negative
    const validCpr = Math.max(0, cpr);
    const validCpc = Math.max(0, cpc);

    const gwMM = validCpr > 0 ? validCpr * cardWidthMM + (validCpr - 1) * spacing : 0;
    const ghMM = validCpc > 0 ? validCpc * cardHeightMM + (validCpc - 1) * spacing : 0;
    const mxMM = (a4Width - gwMM) / 2;
    const myMM = (a4Height - ghMM) / 2;

    console.log("Grid calculation (MM):", { validCpr, validCpc, gwMM, ghMM, mxMM, myMM });
    return { cardsPerRow: validCpr, cardsPerColumn: validCpc, gridWidthMM: gwMM, gridHeightMM: ghMM, marginXMM: mxMM, marginYMM: myMM };
  }, [a4Width, a4Height, cardWidthMM, cardHeightMM, spacing]);

  // mmToPixels depends on containerWidth state
  const mmToPixels = useCallback((mm: number) => {
    if (containerWidth <= 0 || !Number.isFinite(containerWidth)) {
        // console.warn(`mmToPixels called with invalid containerWidth: ${containerWidth}`);
        return 0;
    }
    if (!Number.isFinite(mm)) {
        console.warn(`mmToPixels called with invalid mm value: ${mm}`);
        return 0;
    }
    const scale = containerWidth / a4Width;
    const pixelValue = mm * scale;
    // console.log(`mmToPixels: ${mm}mm -> ${pixelValue}px (scale: ${scale}, containerWidth: ${containerWidth})`);
    return pixelValue;
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
    if (!canvasRef.current || !printRef.current || containerWidth <= 0 || !Number.isFinite(containerWidth)) {
        console.log("renderCanvas skipped: refs or containerWidth not ready/valid", { canvas: !!canvasRef.current, print: !!printRef.current, containerWidth });
        return;
    }

    const canvas = canvasRef.current;
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
              ctx.save();
              ctx.beginPath();
              ctx.rect(drawX, drawY, drawCardWidth, drawCardHeight);
              ctx.clip();
              ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
              ctx.fillRect(drawX, drawY, drawCardWidth, drawCardHeight);
              ctx.fillStyle = "white";
              ctx.textAlign = "center";
              ctx.fillText("Error", drawX + drawCardWidth / 2, drawY + drawCardHeight / 2);
              ctx.restore();
          }
          resolve();
        };
        img.src = card.image;
      });
    });

    Promise.all(loadImages).then(() => {
      console.log("Canvas rendering complete");
    });
  }, [cards, spacing, cardType, a4Width, a4Height, width, height, marginX, marginY, cardsPerRow, cardsPerColumn, mmToPixels, containerWidth]); // Added containerWidth dependency

  // useEffect to setup ResizeObserver and update containerWidth
  useEffect(() => {
    const element = printRef.current;
    if (!element) return;

    let animationFrameId: number | null = null;

    const observer = new ResizeObserver(entries => {
        // Use requestAnimationFrame to debounce resize events
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(() => {
            for (let entry of entries) {
                const newWidth = entry.contentRect.width;
                // Update state only if width is positive and different
                if (newWidth > 0) {
                    setContainerWidth(prevWidth => {
                        if (newWidth !== prevWidth) {
                            console.log(`ResizeObserver updating containerWidth to ${newWidth}`);
                            return newWidth;
                        }
                        return prevWidth; // No change needed
                    });
                }
            }
        });
    });

    observer.observe(element);

    // Initial check in case the element already has size on mount
    const initialWidth = element.clientWidth;
    if (initialWidth > 0) {
        setContainerWidth(prevWidth => {
            if (initialWidth !== prevWidth) {
                console.log(`Initial check setting containerWidth to ${initialWidth}`);
                return initialWidth;
            }
            return prevWidth;
        });
    }

    return () => {
      if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
      }
      observer.unobserve(element);
      observer.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printRef]); // Only depend on printRef, state updates handled inside

  // useEffect to trigger renderCanvas when containerWidth is ready or renderCanvas changes
  useEffect(() => {
    // Only render if containerWidth is valid
    if (containerWidth > 0) {
      console.log("Triggering renderCanvas because containerWidth > 0");
      renderCanvas();
    } else {
      console.log("Skipping renderCanvas because containerWidth is 0");
    }
  }, [containerWidth, renderCanvas]); // Depend on containerWidth and the stable renderCanvas

  // Get DPI for export
  const getDpiForQuality = () => {
    switch (exportQuality) {
      case "standard": return 300;
      case "high": return 450;
      case "ultra": return 600;
      default: return 300;
    }
  }

  // Export functions
  const handleExportPDF = async () => {
    if (!canvasRef.current || containerWidth === 0) return; // Check containerWidth
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
     if (!canvasRef.current || containerWidth === 0) return; // Check containerWidth
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
      <div className="grid grid-cols-1 gap-6">
        <Card className="col-span-1">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">{t("layout.preview")}</h3>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg overflow-hidden">
              <div
                ref={printRef}
                className="relative bg-white dark:bg-gray-900 border rounded-lg mx-auto"
                style={{
                  width: "100%", aspectRatio: `${a4Width} / ${a4Height}`,
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", overflow: "hidden",
                  // Ensure height is determined by aspect ratio, add min-height for initial observation
                  height: containerWidth > 0 ? `${(containerWidth / a4Width) * a4Height}px` : 'auto',
                  minHeight: '100px', // Helps ensure the observer can attach and measure initially
                }}
              >
                {/* Canvas for drawing */}
                <canvas
                  ref={canvasRef}
                  id="print-layout-canvas"
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ padding: 0, border: 'none', margin: 0, display: 'block' }}
                />

                {/* Overlay Grid - Render only when containerWidth is known and valid grid exists */}
                {containerWidth > 0 && cardsPerRow > 0 && cardsPerColumn > 0 && (
                  <div
                    className="absolute top-0 left-0 w-full h-full z-10"
                    style={{
                      paddingLeft: `${mmToPixels(marginX)}px`,
                      paddingTop: `${mmToPixels(marginY)}px`,
                      width: `${mmToPixels(gridWidth)}px`,
                      height: `${mmToPixels(gridHeight)}px`,
                      pointerEvents: "none",
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
                      {/* Limit map to the actual number of grid cells */}
                      {Array(cardsPerRow * cardsPerColumn).fill(0).map((_, index) => (
                        <div
                          key={index}
                          className={`relative border border-dashed border-gray-400 dark:border-gray-600 rounded cursor-pointer transition-all hover:bg-blue-100/30 dark:hover:bg-blue-900/30 ${
                            selectedCardIndex === index ? "ring-2 ring-gold-500 ring-offset-1 bg-blue-100/50 dark:bg-blue-900/50" : ""
                          }`}
                          style={{ pointerEvents: "auto" }}
                          onClick={() => {
                            setSelectedCardIndex(index);
                            inputRefs.current[index]?.click();
                          }}
                        >
                          <Input
                            ref={(el) => { inputRefs.current[index] = el; }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, index)}
                          />
                          {cards[index] && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-0.5 right-0.5 h-4 w-4 z-20 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCardRemove(index);
                              }}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          )}
                          <span className="absolute bottom-0.5 left-0.5 text-xs text-gray-400 dark:text-gray-600">{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  <Button variant="outline" onClick={handleExportPNG} disabled={isExporting || containerWidth === 0} className="flex-1 sm:flex-none sm:w-28">
                    <Download className="mr-2 h-4 w-4" /> PNG
                  </Button>
                  <Button className="bg-gold-500 hover:bg-gold-600 flex-1 sm:flex-none sm:w-28" onClick={handleExportPDF} disabled={isExporting || containerWidth === 0}>
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
