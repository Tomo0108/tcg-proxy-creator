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
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
        console.error("renderCanvas failed: Could not get 2D context");
        return;
    }

    const displayWidth = containerWidth;
    const displayHeight = (containerWidth / a4Width) * a4Height;

    if (displayWidth <= 0 || displayHeight <= 0 || !Number.isFinite(displayWidth) || !Number.isFinite(displayHeight)) {
        console.warn("renderCanvas skipped: Invalid calculated canvas dimensions", { displayWidth, displayHeight });
        // Optionally clear canvas if dimensions become invalid after being valid
        // ctx.clearRect(0, 0, canvas.width, canvas.height); // Or fill with a placeholder color
        return;
    }

    // Only resize canvas if necessary
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        console.log(`Canvas size set to: ${canvas.width}x${canvas.height} based on containerWidth ${containerWidth}`);
    } else {
        // console.log("Canvas size already correct, clearing and redrawing.");
    }


    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (cardsPerRow <= 0 || cardsPerColumn <= 0) {
        console.warn("renderCanvas: cardsPerRow or cardsPerColumn is zero or negative, skipping image loading.");
        return;
    }

    console.log(`renderCanvas: Drawing grid (${cardsPerRow}x${cardsPerColumn})`);

    const loadPromises = cards.slice(0, cardsPerRow * cardsPerColumn).map((card, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;

      // Calculate dimensions in pixels using mmToPixels
      const drawXBg = mmToPixels(marginXMM + col * (cardWidthMM + spacing));
      const drawYBg = mmToPixels(marginYMM + row * (cardHeightMM + spacing));
      const drawCardWidthBg = mmToPixels(cardWidthMM);
      const drawCardHeightBg = mmToPixels(cardHeightMM);

      // Log calculated pixel values for debugging
      // console.log(`Card ${index} Bg Pos/Size (px): x=${drawXBg}, y=${drawYBg}, w=${drawCardWidthBg}, h=${drawCardHeightBg}`);

      // Draw background only if dimensions are valid
      if (drawCardWidthBg > 0 && drawCardHeightBg > 0) {
          ctx.fillStyle = "#f0f0f0";
          ctx.fillRect(drawXBg, drawYBg, drawCardWidthBg, drawCardHeightBg);
      } else {
          console.warn(`Card ${index} background skipped: Invalid dimensions`, { drawCardWidthBg, drawCardHeightBg });
      }


      if (!card || !card.image) return Promise.resolve();

      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const drawX = drawXBg; // Reuse background position
          const drawY = drawYBg;
          const drawCardWidth = drawCardWidthBg; // Reuse background size
          const drawCardHeight = drawCardHeightBg;

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

          if (targetWidth > 0 && targetHeight > 0 && Number.isFinite(imgDrawX) && Number.isFinite(imgDrawY)) {
              // console.log(`Drawing image ${index} at ${imgDrawX},${imgDrawY} size ${targetWidth}x${targetHeight}`);
              ctx.drawImage(img, imgDrawX, imgDrawY, targetWidth, targetHeight);
          } else {
              console.warn(`Skipping image draw for index ${index}: Invalid target dimensions or position`, { targetWidth, targetHeight, imgDrawX, imgDrawY });
          }

          ctx.restore();
          resolve();
        };
        img.onerror = (err) => {
          console.error(`Failed to load image for card ${index}:`, card.image, err);
          const drawX = drawXBg;
          const drawY = drawYBg;
          const drawCardWidth = drawCardWidthBg;
          const drawCardHeight = drawCardHeightBg;
          if (drawCardWidth > 0 && drawCardHeight > 0) {
              ctx.save();
              ctx.beginPath();
              ctx.rect(drawX, drawY, drawCardWidth, drawCardHeight);
              ctx.clip();
              ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
              ctx.fillRect(drawX, drawY, drawCardWidth, drawCardHeight);
              ctx.fillStyle = "white";
              ctx.textAlign = "center";
              ctx.font = "10px sans-serif"; // Ensure font is set
              ctx.fillText("Error", drawX + drawCardWidth / 2, drawY + drawCardHeight / 2);
              ctx.restore();
          }
          resolve(); // Resolve even on error
        };
        img.src = card.image;
      });
    });

    Promise.all(loadPromises).then(() => {
      console.log("Canvas image loading and drawing complete");
    }).catch(err => {
        console.error("Error during image loading/drawing:", err);
    });
  }, [cards, spacing, cardType, a4Width, a4Height, cardWidthMM, cardHeightMM, marginXMM, marginYMM, cardsPerRow, cardsPerColumn, mmToPixels, containerWidth]); // Dependencies updated

  // useEffect to setup ResizeObserver and update containerWidth
  useEffect(() => {
    const element = printRef.current;
    if (!element) {
        console.log("ResizeObserver useEffect: printRef is null");
        return;
    }
    console.log("ResizeObserver useEffect: Setting up observer for", element);

    let animationFrameId: number | null = null;

    const observer = new ResizeObserver(entries => {
        // Debounce using rAF
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(() => {
            for (let entry of entries) {
                const newWidth = entry.contentRect.width;
                console.log("ResizeObserver callback: newWidth =", newWidth, "entry.contentRect =", entry.contentRect);
                // Update state only if width is positive and different
                if (newWidth > 0 && Number.isFinite(newWidth)) {
                    setContainerWidth(prevWidth => {
                        if (newWidth !== prevWidth) {
                            console.log(`ResizeObserver updating containerWidth from ${prevWidth} to ${newWidth}`);
                            return newWidth;
                        }
                        // console.log(`ResizeObserver: Width ${newWidth} is same as previous ${prevWidth}, no update.`);
                        return prevWidth; // No change needed
                    });
                } else {
                    console.warn(`ResizeObserver callback: Invalid newWidth ${newWidth}`);
                }
            }
        });
    });

    observer.observe(element, { box: 'content-box' }); // Observe content-box size

    // Initial check - use setTimeout to allow initial layout pass
    const initialCheckTimeoutId = setTimeout(() => {
        if (printRef.current) { // Check ref again inside timeout
            const initialWidth = printRef.current.clientWidth;
            console.log(`Initial check (after timeout): clientWidth = ${initialWidth}`);
            if (initialWidth > 0 && Number.isFinite(initialWidth)) {
                setContainerWidth(prevWidth => {
                    if (initialWidth !== prevWidth) {
                        console.log(`Initial check setting containerWidth from ${prevWidth} to ${initialWidth}`);
                        return initialWidth;
                    }
                    return prevWidth;
                });
            } else {
                 console.warn(`Initial check: Invalid initialWidth ${initialWidth}`);
            }
        } else {
            console.log("Initial check (after timeout): printRef is null");
        }
    }, 0);


    return () => {
      console.log("ResizeObserver useEffect: Cleaning up observer");
      clearTimeout(initialCheckTimeoutId);
      if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
      }
      // It's important to check if 'element' still exists before unobserving,
      // though in typical React cleanup it should.
      if (element) {
          observer.unobserve(element);
      }
      observer.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty: We only want this to run once on mount to set up the observer for printRef.current

  // useEffect to trigger renderCanvas when containerWidth is ready or renderCanvas definition changes
  useEffect(() => {
    if (containerWidth > 0) {
      console.log(`renderCanvas useEffect: Triggering renderCanvas (containerWidth: ${containerWidth})`);
      renderCanvas();
    } else {
      console.log(`renderCanvas useEffect: Skipping renderCanvas (containerWidth: ${containerWidth})`);
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

  // Export functions (check containerWidth)
  const handleExportPDF = async () => {
    if (!canvasRef.current || containerWidth <= 0) {
        console.warn("PDF Export cancelled: Canvas not ready or containerWidth invalid");
        toast({ title: "エクスポート不可", description: "プレビューの準備ができていません。", variant: "destructive" });
        return;
    }
    setIsExporting(true);
    try {
      if (exportQuality === "ultra") {
        toast({ title: "高品質出力処理中", description: "高解像度PDFの生成には時間がかかる場合があります。" });
      }
      const options = {
        cards, spacing, cardType, cmykConversion, dpi: getDpiForQuality(), canvas: canvasRef.current,
        dimensions: { a4Width, a4Height, cardWidth: cardWidthMM, cardHeight: cardHeightMM, marginX: marginXMM, marginY: marginYMM, cardsPerRow, cardsPerColumn },
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
     if (!canvasRef.current || containerWidth <= 0) {
        console.warn("PNG Export cancelled: Canvas not ready or containerWidth invalid");
        toast({ title: "エクスポート不可", description: "プレビューの準備ができていません。", variant: "destructive" });
        return;
     }
    setIsExporting(true);
    try {
      if (exportQuality === "ultra") {
        toast({ title: "高品質出力処理中", description: "高解像度PNGの生成には時間がかかる場合があります。" });
      }
       const options = {
        cards, spacing, cardType, cmykConversion, dpi: getDpiForQuality(), canvas: canvasRef.current,
        dimensions: { a4Width, a4Height, cardWidth: cardWidthMM, cardHeight: cardHeightMM, marginX: marginXMM, marginY: marginYMM, cardsPerRow, cardsPerColumn },
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

  // Calculate pixel values for styles (memoized)
  const overlayStyles = useMemo(() => {
      if (containerWidth <= 0 || cardsPerRow <= 0 || cardsPerColumn <= 0) {
          return { display: 'none' }; // Hide if not ready
      }
      const paddingLeftPx = mmToPixels(marginXMM);
      const paddingTopPx = mmToPixels(marginYMM);
      const gridWidthPx = mmToPixels(gridWidthMM);
      const gridHeightPx = mmToPixels(gridHeightMM);

      // console.log("Overlay Styles (px):", { paddingLeftPx, paddingTopPx, gridWidthPx, gridHeightPx });

      // Ensure calculated pixel values are valid numbers
      if (![paddingLeftPx, paddingTopPx, gridWidthPx, gridHeightPx].every(Number.isFinite)) {
          console.warn("Invalid pixel values calculated for overlay styles");
          return { display: 'none' };
      }

      return {
          paddingLeft: `${paddingLeftPx}px`,
          paddingTop: `${paddingTopPx}px`,
          width: `${gridWidthPx}px`,
          height: `${gridHeightPx}px`,
          pointerEvents: "none" as const, // Type assertion for pointerEvents
      };
  }, [containerWidth, cardsPerRow, cardsPerColumn, marginXMM, marginYMM, gridWidthMM, gridHeightMM, mmToPixels]);

  const gridStyles = useMemo(() => {
      if (containerWidth <= 0 || cardsPerRow <= 0 || cardsPerColumn <= 0) {
          return { display: 'none' }; // Hide if not ready
      }
      const cardWidthPx = mmToPixels(cardWidthMM);
      const cardHeightPx = mmToPixels(cardHeightMM);
      const gapPx = mmToPixels(spacing);

      // console.log("Grid Styles (px):", { cardWidthPx, cardHeightPx, gapPx });

      if (![cardWidthPx, cardHeightPx, gapPx].every(v => Number.isFinite(v) && v >= 0)) {
           console.warn("Invalid pixel values calculated for grid styles");
           return { display: 'none' };
      }
      // Ensure dimensions are positive for grid layout
      if (cardWidthPx <= 0 || cardHeightPx <= 0) {
          console.warn("Grid styles: Card width or height in pixels is zero or negative.");
          return { display: 'none' };
      }


      return {
          gridTemplateColumns: `repeat(${cardsPerRow}, ${cardWidthPx}px)`,
          gridTemplateRows: `repeat(${cardsPerColumn}, ${cardHeightPx}px)`,
          gap: `${gapPx}px`,
      };
  }, [containerWidth, cardsPerRow, cardsPerColumn, cardWidthMM, cardHeightMM, spacing, mmToPixels]);


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
              {/* Container for aspect ratio and ref */}
              <div
                ref={printRef}
                className="relative bg-white dark:bg-gray-900 border rounded-lg mx-auto"
                style={{
                  width: "100%",
                  aspectRatio: `${a4Width} / ${a4Height}`,
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  overflow: "hidden",
                  // Use calculated height if available, otherwise rely on aspect ratio
                  height: containerWidth > 0 ? `${(containerWidth / a4Width) * a4Height}px` : undefined,
                  // Add a visual indicator for debugging if width is 0
                  outline: containerWidth <= 0 ? '2px dashed red' : 'none',
                }}
              >
                {/* Canvas - always present but might be 0x0 initially */}
                <canvas
                  ref={canvasRef}
                  id="print-layout-canvas"
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ padding: 0, border: 'none', margin: 0, display: 'block' }}
                />

                {/* Overlay Grid - Conditionally rendered based on calculated styles */}
                {overlayStyles.display !== 'none' && gridStyles.display !== 'none' && (
                  <div
                    className="absolute top-0 left-0 w-full h-full z-10"
                    style={overlayStyles}
                  >
                    <div
                      className="grid h-full w-full"
                      style={gridStyles}
                    >
                      {/* Render grid cells */}
                      {Array(cardsPerRow * cardsPerColumn).fill(0).map((_, index) => (
                        <div
                          key={index}
                          className={`relative border border-dashed border-gray-400 dark:border-gray-600 rounded cursor-pointer transition-all hover:bg-blue-100/30 dark:hover:bg-blue-900/30 ${
                            selectedCardIndex === index ? "ring-2 ring-gold-500 ring-offset-1 bg-blue-100/50 dark:bg-blue-900/50" : ""
                          }`}
                          style={{ pointerEvents: "auto" }}
                          onClick={() => {
                            // Ensure index is within bounds of inputRefs
                            if (index < inputRefs.current.length) {
                                setSelectedCardIndex(index);
                                inputRefs.current[index]?.click();
                            } else {
                                console.error(`Attempted to click input ref for index ${index}, but only ${inputRefs.current.length} refs exist.`);
                            }
                          }}
                        >
                          <Input
                            ref={(el) => {
                                // Ensure index is valid before assigning ref
                                if (index < cardsPerRow * cardsPerColumn) {
                                    inputRefs.current[index] = el;
                                }
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, index)}
                          />
                          {/* Remove button */}
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
