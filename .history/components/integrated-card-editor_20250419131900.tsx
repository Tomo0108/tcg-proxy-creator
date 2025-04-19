"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Download, Printer, Trash2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { generatePDF, generatePNG } from "@/lib/pdf-generator"
import { toast } from "@/components/ui/use-toast"
import { useMobileDetect } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils" // cn をインポート

interface IntegratedCardEditorProps {
  cardType: string
  spacing: number
  cmykConversion: boolean
  cards: any[]
  onCardUpdate: (card: any, index: number) => void
  onCardRemove: (index: number) => void
  exportQuality: "standard" | "high" | "ultra"
}

const LONG_PRESS_DURATION = 500; // 長押し判定時間 (ms)

export function IntegratedCardEditor({
  cardType,
  spacing,
  cmykConversion,
  cards,
  onCardUpdate,
  onCardRemove,
  exportQuality,
}: IntegratedCardEditorProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetect()
  const [selectedCardIndices, setSelectedCardIndices] = useState<number[]>([]); // 複数選択用の state
  const [isExporting, setIsExporting] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Refs
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const printRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null); // 長押しタイマー用 Ref
  const isLongPressing = useRef<boolean>(false); // 長押し判定フラグ用 Ref

  // State for container width
  const [containerWidth, setContainerWidth] = useState(0);

  // Card dimensions in mm
  const cardDimensions = {
    pokemon: { width: 63, height: 88 },
    yugioh: { width: 59, height: 86 },
  }

  const { width: cardWidthMM, height: cardHeightMM } = cardDimensions[cardType as keyof typeof cardDimensions]

  // A4 size in mm
  const a4Width = 210
  const a4Height = 297

  // Calculate grid properties (memoized based on inputs)
  const { cardsPerRow, cardsPerColumn, gridWidthMM, gridHeightMM, marginXMM, marginYMM } = useMemo(() => {
    const effectiveCardWidth = cardWidthMM + spacing;
    const effectiveCardHeight = cardHeightMM + spacing;
    if (effectiveCardWidth <= 0 || effectiveCardHeight <= 0) {
        console.warn("Grid calculation skipped: Invalid card dimensions or spacing", { cardWidthMM, cardHeightMM, spacing });
        return { cardsPerRow: 0, cardsPerColumn: 0, gridWidthMM: 0, gridHeightMM: 0, marginXMM: 0, marginYMM: 0 };
    }

    const cpr = Math.floor((a4Width + spacing) / effectiveCardWidth);
    const cpc = Math.floor((a4Height + spacing) / effectiveCardHeight);
    const validCpr = Math.max(0, cpr);
    const validCpc = Math.max(0, cpc);

    const gwMM = validCpr > 0 ? validCpr * cardWidthMM + (validCpr - 1) * spacing : 0;
    const ghMM = validCpc > 0 ? validCpc * cardHeightMM + (validCpc - 1) * spacing : 0;
    const mxMM = (a4Width - gwMM) / 2;
    const myMM = (a4Height - ghMM) / 2;

    return { cardsPerRow: validCpr, cardsPerColumn: validCpc, gridWidthMM: gwMM, gridHeightMM: ghMM, marginXMM: mxMM, marginYMM: myMM };
  }, [a4Width, a4Height, cardWidthMM, cardHeightMM, spacing]);

  // mmToPixels depends on containerWidth state
  const mmToPixels = useCallback((mm: number) => {
    if (containerWidth <= 0 || !Number.isFinite(containerWidth)) return 0;
    if (!Number.isFinite(mm)) return 0;
    const scale = containerWidth / a4Width;
    return mm * scale;
  }, [a4Width, containerWidth]);

  // --- 長押し・タップ処理 ---
  const handlePointerDown = (index: number) => {
    isLongPressing.current = false;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressTimer.current = setTimeout(() => {
      isLongPressing.current = true;
      console.log(`Long press detected on index: ${index}`);
      // 長押し時は常に単一選択として扱うか、複数選択を維持するか？
      // 現状: 複数選択状態でも、長押ししたスロットの input をトリガー
      // → 複数選択状態で長押しした場合も、複数選択用の input (-1) をトリガーするように変更
      if (selectedCardIndices.length > 1 && selectedCardIndices.includes(index)) {
        console.log("Triggering file input for multiple indices:", selectedCardIndices);
        inputRefs.current[-1]?.click(); // 複数選択用 input をトリガー
      } else {
        // 単一選択、または複数選択されていないスロットを長押しした場合
        console.log(`Triggering file input for single index: ${index}`);
        setSelectedCardIndices([index]); // 長押ししたスロットのみを選択状態にする
        inputRefs.current[index]?.click(); // 個別 input をトリガー
      }
    }, LONG_PRESS_DURATION);
  };

  const handlePointerUp = (index: number) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!isLongPressing.current) {
      console.log(`Tap detected on index: ${index}`);
      setSelectedCardIndices(prevIndices => {
        const currentIndex = prevIndices.indexOf(index);
        if (currentIndex > -1) {
          // すでに選択されている場合は選択解除
          return [...prevIndices.slice(0, currentIndex), ...prevIndices.slice(currentIndex + 1)];
        } else {
          // 選択されていない場合は追加
          return [...prevIndices, index];
        }
      });
    }
    // 長押し後の PointerUp では isLongPressing が true なので、ここでは何もしない
    isLongPressing.current = false; // フラグをリセット
  };

  const handlePointerLeave = (index: number) => { // index を受け取るように変更
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      console.log(`Pointer left index ${index}, timer cleared.`);
    }
    // isLongPressing.current = false; // Leave しただけでは長押し状態は解除しない方が自然かも
  };
  // --- 長押し・タップ処理ここまで ---

        console.log(`Processing image for single index: ${index}`);
        processImage(file, [index]);
      }
    }
    e.target.value = "";
  };

  // Process image (複数インデックス対応)
  const processImage = useCallback((file: File, indices: number[]) => {
    if (indices.length === 0) return;
    setIsProcessingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const imageDataUrl = event.target?.result as string;
        const originalSize = { width: img.width, height: img.height };

        indices.forEach(idx => {
          // ループ内で cardData を毎回新しく作成
          const cardData = {
            image: imageDataUrl,
            scale: 1,
            type: cardType,
            originalSize,
            position: { x: 0, y: 0 }
          };
          if (cardsPerRow > 0 && cardsPerColumn > 0 && idx >= 0 && idx < cardsPerRow * cardsPerColumn) {
            console.log(`Calling onCardUpdate for index: ${idx}`); // 呼び出しログ追加
            onCardUpdate(cardData, idx);
          }
        });

        if (indices.length === 1) {
          toast({ title: t("toast.imageAdded"), description: `画像をスロット ${indices[0] + 1} に追加しました。` });
        } else {
          toast({ title: t("toast.imageAdded"), description: `画像を ${indices.length} 個のスロットに追加しました。` });
        }
        setSelectedCardIndices([]);
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        setSelectedCardIndices([]);
        toast({ title: "画像読み込みエラー", description: "画像の読み込みに失敗しました。", variant: "destructive" });
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsProcessingImage(false);
      setSelectedCardIndices([]);
      toast({ title: "ファイル読み込みエラー", description: "ファイルの読み込みに失敗しました。", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  }, [onCardUpdate, cardType, t, cardsPerRow, cardsPerColumn]);

  // renderCanvas depends on containerWidth via mmToPixels
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || !printRef.current || containerWidth <= 0 || !Number.isFinite(containerWidth)) {
        return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
        return;
    }
    const displayWidth = containerWidth;
    const displayHeight = (containerWidth / a4Width) * a4Height;
    if (displayWidth <= 0 || displayHeight <= 0 || !Number.isFinite(displayWidth) || !Number.isFinite(displayHeight)) {
        return;
    }
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (cardsPerRow <= 0 || cardsPerColumn <= 0) {
        return;
    }

    const loadPromises = cards.slice(0, cardsPerRow * cardsPerColumn).map((card, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const drawXBg = mmToPixels(marginXMM + col * (cardWidthMM + spacing));
      const drawYBg = mmToPixels(marginYMM + row * (cardHeightMM + spacing));
      const drawCardWidthBg = mmToPixels(cardWidthMM);
      const drawCardHeightBg = mmToPixels(cardHeightMM);

      if (drawCardWidthBg > 0 && drawCardHeightBg > 0) {
          ctx.fillStyle = "#f0f0f0";
          ctx.fillRect(drawXBg, drawYBg, drawCardWidthBg, drawCardHeightBg);
      }

      if (!card || !card.image) return Promise.resolve();

      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const drawX = drawXBg;
          const drawY = drawYBg;
          const drawCardWidth = drawCardWidthBg;
          const drawCardHeight = drawCardHeightBg;

          if (drawCardWidth <= 0 || drawCardHeight <= 0) {
              resolve(); return;
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
            baseWidth = drawCardWidth; baseHeight = baseWidth / imgAspectRatio;
          } else {
            baseHeight = drawCardHeight; baseWidth = baseHeight * imgAspectRatio;
          }
          const targetWidth = baseWidth * cardScale;
          const targetHeight = baseHeight * cardScale;
          const imgDrawX = drawX + (drawCardWidth - targetWidth) / 2;
          const imgDrawY = drawY + (drawCardHeight - targetHeight) / 2;
          if (targetWidth > 0 && targetHeight > 0 && Number.isFinite(imgDrawX) && Number.isFinite(imgDrawY)) {
              ctx.drawImage(img, imgDrawX, imgDrawY, targetWidth, targetHeight);
          }
          ctx.restore();
          resolve();
        };
        img.onerror = (err) => {
          console.error(`Failed to load image for card ${index}:`, card.image, err);
          const drawX = drawXBg; const drawY = drawYBg;
          const drawCardWidth = drawCardWidthBg; const drawCardHeight = drawCardHeightBg;
          if (drawCardWidth > 0 && drawCardHeight > 0) {
              ctx.save(); ctx.beginPath(); ctx.rect(drawX, drawY, drawCardWidth, drawCardHeight); ctx.clip(); // 修正: カンマ追加
              ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; ctx.fillRect(drawX, drawY, drawCardWidth, drawCardHeight);
              ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.font = "10px sans-serif";
              ctx.fillText("Error", drawX + drawCardWidth / 2, drawY + drawCardHeight / 2);
              ctx.restore();
          }
          resolve();
        };
        img.src = card.image;
      });
    });

    Promise.all(loadPromises).catch(err => {
        console.error("Error during image loading/drawing:", err);
    });
  }, [cards, spacing, cardType, a4Width, a4Height, cardWidthMM, cardHeightMM, marginXMM, marginYMM, cardsPerRow, cardsPerColumn, mmToPixels, containerWidth]);

  // useEffect to setup ResizeObserver and update containerWidth
  useEffect(() => {
    const element = printRef.current;
    if (!element) {
        return;
    }
    let animationFrameId: number | null = null;
    const observer = new ResizeObserver(entries => {
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
        animationFrameId = requestAnimationFrame(() => {
            for (let entry of entries) {
                const newWidth = entry.contentRect.width;
                if (newWidth > 0 && Number.isFinite(newWidth)) {
                    setContainerWidth(prevWidth => {
                        if (newWidth !== prevWidth) {
                            return newWidth;
                        }
                        return prevWidth;
                    });
                } else if (newWidth <= 0) {
                    // console.warn(`ResizeObserver callback: Width became zero or invalid (${newWidth})`);
                }
            }
        });
    });
    observer.observe(element, { box: 'content-box' });
    return () => {
      if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
      if (element) { observer.unobserve(element); }
      observer.disconnect();
    };
  }, []);

  // useEffect to trigger renderCanvas when containerWidth is ready or renderCanvas definition changes
  useEffect(() => {
    if (containerWidth > 0) {
      renderCanvas();
    }
  }, [containerWidth, renderCanvas]);

  // Get DPI for export
  const getDpiForQuality = useCallback(() => { // 修正: コンポーネント関数の直下に移動
    switch (exportQuality) {
      case "standard": return 300;
      case "high": return 450;
      case "ultra": return 600;
      default: return 300;
    }
  }, [exportQuality]);

  // Export functions
  const handleExportPDF = async () => {
    if (!canvasRef.current || containerWidth <= 0) {
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
      if (containerWidth <= 0 || cardsPerRow <= 0 || cardsPerColumn <= 0) return { display: 'none' };
      const paddingLeftPx = mmToPixels(marginXMM);
      const paddingTopPx = mmToPixels(marginYMM);
      const gridWidthPx = mmToPixels(gridWidthMM);
      const gridHeightPx = mmToPixels(gridHeightMM);
      if (![paddingLeftPx, paddingTopPx, gridWidthPx, gridHeightPx].every(Number.isFinite)) return { display: 'none' };
      return {
          paddingLeft: `${paddingLeftPx}px`, paddingTop: `${paddingTopPx}px`,
          width: `${gridWidthPx}px`, height: `${gridHeightPx}px`,
          pointerEvents: "none" as const,
      };
  }, [containerWidth, cardsPerRow, cardsPerColumn, marginXMM, marginYMM, gridWidthMM, gridHeightMM, mmToPixels]);

  const gridStyles = useMemo(() => {
      if (containerWidth <= 0 || cardsPerRow <= 0 || cardsPerColumn <= 0) return { display: 'none' };
      const cardWidthPx = mmToPixels(cardWidthMM);
      const cardHeightPx = mmToPixels(cardHeightMM);
      const gapPx = mmToPixels(spacing);
      if (![cardWidthPx, cardHeightPx, gapPx].every(v => Number.isFinite(v) && v >= 0)) return { display: 'none' };
      if (cardWidthPx <= 0 || cardHeightPx <= 0) return { display: 'none' };
      return {
          gridTemplateColumns: `repeat(${cardsPerRow}, ${cardWidthPx}px)`,
          gridTemplateRows: `repeat(${cardsPerColumn}, ${cardHeightPx}px)`,
          gap: `${gapPx}px`,
      };
  }, [containerWidth, cardsPerRow, cardsPerColumn, cardWidthMM, cardHeightMM, spacing, mmToPixels]); // 修正: セミコロンを追加

  // Component JSX
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <Card className="col-span-1 border-gold-500">
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
                  height: containerWidth > 0 ? `${(containerWidth / a4Width) * a4Height}px` : undefined,
                  outline: containerWidth <= 0 ? '2px dashed red' : 'none',
                }}
              >
                <canvas
                  ref={canvasRef}
                  id="print-layout-canvas"
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ padding: 0, border: 'none', margin: 0, display: 'block' }}
                />
                {overlayStyles.display !== 'none' && gridStyles.display !== 'none' && (
                  <div
                    className="absolute top-0 left-0 w-full h-full z-10"
                    style={overlayStyles}
                  >
                    <div className="grid h-full w-full" style={gridStyles}>
                      <Input
                        ref={(el) => { inputRefs.current[-1] = el; }}
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleFileChange(e, -1)}
                      />
                      {Array(cardsPerRow * cardsPerColumn).fill(0).map((_, index) => (
                        <div
                          key={index}
                          className={cn(
                            "relative border border-dashed border-gray-400 dark:border-gray-600 rounded cursor-pointer transition-all hover:bg-blue-100/30 dark:hover:bg-blue-900/30",
                            selectedCardIndices.includes(index) ? "ring-2 ring-gold-500 ring-offset-1 bg-blue-100/50 dark:bg-blue-900/50" : ""
                          )}
                          style={{ pointerEvents: "auto", touchAction: 'none' }}
                          onPointerDown={() => handlePointerDown(index)}
                          onPointerUp={() => handlePointerUp(index)}
                          onPointerLeave={handlePointerLeave}
                        >
                          <Input
                            ref={(el) => {
                                if (index >= 0 && index < (cardsPerRow * cardsPerColumn)) {
                                    inputRefs.current[index] = el;
                                }
                            }}
                            type="file" accept="image/*" className="hidden"
                            onChange={(e) => handleFileChange(e, index)}
                          />
                          {cards[index] && (
                            <Button
                              variant="destructive" size="icon"
                              className="absolute top-0.5 right-0.5 h-4 w-4 z-20 p-0 pointer-events-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCardRemove(index);
                                setSelectedCardIndices(prev => prev.filter(i => i !== index));
                              }}
                            > <Trash2 className="h-2.5 w-2.5" /> </Button>
                          )}
                          <span className="absolute bottom-0.5 left-0.5 text-xs text-gray-400 dark:text-gray-600">{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                 {containerWidth <= 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 dark:bg-gray-700/50 z-20">
                        <p className="text-gray-500 dark:text-gray-400">レイアウトを計算中...</p>
                    </div>
                 )}
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
                <div className="flex space-x-2 justify-end w-full sm:w-auto">
                  <Button variant="outline" onClick={() => window.print()} className="border-gold-500 flex-1 sm:flex-none sm:w-28">
                    <Printer className="mr-2 h-4 w-4" /> {t("action.print")}
                  </Button>
                  <Button onClick={handleExportPNG} disabled={isExporting || containerWidth <= 0} className="bg-gold-500 hover:bg-gold-600 flex-1 sm:flex-none sm:w-28">
                    <Download className="mr-2 h-4 w-4" /> PNG
                  </Button>
                  <Button onClick={handleExportPDF} disabled={isExporting || containerWidth <= 0} className="bg-gold-500 hover:bg-gold-600 flex-1 sm:flex-none sm:w-28">
                    <Download className="mr-2 h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
