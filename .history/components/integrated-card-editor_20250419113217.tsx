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
  }, [a4Width, containerWidth]); // 修正: 依存配列のカンマ

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
      // 複数選択されていて、かつ長押ししたセルが選択中のセルの一つである場合
      if (selectedCardIndices.length > 1 && selectedCardIndices.includes(index)) {
        console.log("Triggering file input for multiple indices:", selectedCardIndices);
        // 複数選択用のダミーInput要素をクリック
      if (selectedCardIndices.length > 1 && selectedCardIndices.includes(index)) {
        console.log("Triggering file input for multiple indices:", selectedCardIndices);
        // 複数選択用のダミーインデックス（例: -1）でファイル選択をトリガー
        // handleFileChange でこのインデックスを識別して複数処理を行う
        inputRefs.current[-1]?.click(); // ダミーのinput要素（後で作成）をクリック
      } else {
        // 単一セルに対する長押し
        console.log(`Triggering file input for single index: ${index}`);
        setSelectedCardIndices([index]); // 長押ししたセルのみを選択状態にする
        inputRefs.current[index]?.click();
      }
    }, LONG_PRESS_DURATION);
  };

  const handlePointerUp = (index: number) => {
    // タイマーが動作中（＝まだ長押し判定されていない）ならクリア
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // 長押しでなければタップと判定
    if (!isLongPressing.current) {
      console.log(`Tap detected on index: ${index}`);
      setSelectedCardIndices(prevIndices => {
        const currentIndex = prevIndices.indexOf(index);
        if (currentIndex > -1) {
          // 既に選択されていれば解除
          return [...prevIndices.slice(0, currentIndex), ...prevIndices.slice(currentIndex + 1)];
        } else {
          // 選択されていなければ追加
          return [...prevIndices, index];
        }
      });
    }
    // 長押しフラグをリセット（念のため）
    isLongPressing.current = false;
  };

  const handlePointerLeave = () => {
    // 要素外に出たらタイマーをクリア
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      console.log("Pointer left, timer cleared.");
    }
    // isLongPressing.current = false; // 離れたら長押し状態も解除
  };
  // --- 長押し・タップ処理ここまで ---

  // Handle file selection (複数選択対応)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      // index が -1 なら複数選択処理
      if (index === -1 && selectedCardIndices.length > 0) {
        console.log("Processing image for multiple indices:", selectedCardIndices);
        processImage(file, selectedCardIndices); // 配列を渡すように変更
      } else if (index >= 0) {
        // 通常の単一選択処理（長押しまたは以前のクリック）
        console.log(`Processing image for single index: ${index}`);
        processImage(file, [index]); // 単一要素の配列を渡す
      }
    }
    // ファイル選択ダイアログをクリア
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
        const cardData = { image: imageDataUrl, scale: 1, type: cardType, originalSize, position: { x: 0, y: 0 } };

        indices.forEach(idx => {
          if (idx >= 0 && idx < cardsPerRow * cardsPerColumn) { // 有効なインデックスか確認
            onCardUpdate(cardData, idx);
          }
        });

        if (indices.length === 1) {
          toast({ title: t("toast.imageAdded"), description: `画像をスロット ${indices[0] + 1} に追加しました。` });
        } else {
          toast({ title: t("toast.imageAdded"), description: `画像を ${indices.length} 個のスロットに追加しました。` });
        }
        setSelectedCardIndices([]); // 処理後、選択を解除
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        setSelectedCardIndices([]); // エラー時も選択を解除
        toast({ title: "画像読み込みエラー", description: "画像の読み込みに失敗しました。", variant: "destructive" });
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsProcessingImage(false);
      setSelectedCardIndices([]); // エラー時も選択を解除
      toast({ title: "ファイル読み込みエラー", description: "ファイルの読み込みに失敗しました。", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  }, [onCardUpdate, cardType, t, cardsPerRow, cardsPerColumn]); // 依存関係に cardsPerRow, cardsPerColumn を追加

  // renderCanvas depends on containerWidth via mmToPixels
  const renderCanvas = useCallback(() => {
    // ... (renderCanvas の内容は変更なし) ...
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
        return;
    }

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        console.log(`Canvas size set to: ${canvas.width}x${canvas.height} based on containerWidth ${containerWidth}`);
    }

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (cardsPerRow <= 0 || cardsPerColumn <= 0) {
        console.warn("renderCanvas: cardsPerRow or cardsPerColumn is zero or negative, skipping image loading.");
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
              ctx.save(); ctx.beginPath(); ctx.rect(drawX, drawY, drawCardWidth, drawCardHeight); ctx.clip();
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
    // ... (ResizeObserver の内容は変更なし) ...
    const element = printRef.current;
    if (!element) {
        console.log("ResizeObserver useEffect: printRef is null, cannot observe.");
        return;
    }
    console.log("ResizeObserver useEffect: Setting up observer for", element);

    let animationFrameId: number | null = null;

    const observer = new ResizeObserver(entries => {
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
        animationFrameId = requestAnimationFrame(() => {
            for (let entry of entries) {
                const newWidth = entry.contentRect.width;
                if (newWidth > 0 && Number.isFinite(newWidth)) {
                    setContainerWidth(prevWidth => {
                        if (newWidth !== prevWidth) {
                            console.log(`ResizeObserver updating containerWidth from ${prevWidth} to ${newWidth}`);
                            return newWidth;
                        }
                        return prevWidth;
                    });
                } else if (newWidth <= 0) {
                    console.warn(`ResizeObserver callback: Width became zero or invalid (${newWidth})`);
                }
            }
        });
    });

    observer.observe(element, { box: 'content-box' });
    console.log("ResizeObserver useEffect: Observer attached.");

    return () => {
      console.log("ResizeObserver useEffect: Cleaning up observer for", element);
      if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
      if (element) { observer.unobserve(element); }
      observer.disconnect();
      console.log("ResizeObserver useEffect: Observer detached.");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect to trigger renderCanvas when containerWidth is ready or renderCanvas definition changes
  useEffect(() => {
    // ... (renderCanvas useEffect の内容は変更なし) ...
    if (containerWidth > 0) {
      console.log(`renderCanvas useEffect: Triggering renderCanvas (containerWidth: ${containerWidth})`);
      renderCanvas();
    } else {
      console.log(`renderCanvas useEffect: Skipping renderCanvas (containerWidth: ${containerWidth})`);
    }
  }, [containerWidth, renderCanvas]);

  // Get DPI for export
  const getDpiForQuality = useCallback(() => {
    // ... (getDpiForQuality の内容は変更なし) ...
    switch (exportQuality) {
      case "standard": return 300;
      case "high": return 450;
      case "ultra": return 600;
      default: return 300;
    }
  }, [exportQuality]);

  // Export functions
  const handleExportPDF = async () => {
    // ... (handleExportPDF の内容は変更なし) ...
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
    // ... (handleExportPNG の内容は変更なし) ...
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
    // ... (downloadFile の内容は変更なし) ...
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
    // ... (overlayStyles の内容は変更なし) ...
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
    // ... (gridStyles の内容は変更なし) ...
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
  }, [containerWidth, cardsPerRow, cardsPerColumn, cardWidthMM, cardHeightMM, spacing, mmToPixels]);

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

                {/* Overlay Grid - Conditionally rendered */}
                {overlayStyles.display !== 'none' && gridStyles.display !== 'none' && (
                  <div
                    className="absolute top-0 left-0 w-full h-full z-10"
                    style={overlayStyles}
                  >
                    <div className="grid h-full w-full" style={gridStyles}>
                      {/* ダミーの Input 要素 for 複数選択 */}
                      <Input
                        ref={(el) => { inputRefs.current[-1] = el; }}
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleFileChange(e, -1)} // index -1 で識別
                      />
                      {Array(cardsPerRow * cardsPerColumn).fill(0).map((_, index) => (
                        <div
                          key={index}
                          className={cn( // cn を使用
                            "relative border border-dashed border-gray-400 dark:border-gray-600 rounded cursor-pointer transition-all hover:bg-blue-100/30 dark:hover:bg-blue-900/30",
                            // 選択状態のスタイルを selectedCardIndices で判定
                            selectedCardIndices.includes(index) ? "ring-2 ring-gold-500 ring-offset-1 bg-blue-100/50 dark:bg-blue-900/50" : ""
                          )}
                          style={{ pointerEvents: "auto", touchAction: 'none' }} // touchAction: none でスクロールを抑制
                          onPointerDown={() => handlePointerDown(index)}
                          onPointerUp={() => handlePointerUp(index)}
                          onPointerLeave={handlePointerLeave}
                          // onClick は削除 (タップ処理は onPointerUp で行う)
                        >
                          <Input
                            ref={(el) => {
                                if (index < cardsPerRow * cardsPerColumn) {
                                    inputRefs.current[index] = el;
                                }
                            }}
                            type="file" accept="image/*" className="hidden"
                            onChange={(e) => handleFileChange(e, index)}
                          />
                          {cards[index] && (
                            <Button
                              variant="destructive" size="icon"
                              className="absolute top-0.5 right-0.5 h-4 w-4 z-20 p-0 pointer-events-auto" // Ensure button is clickable
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent grid interaction
                                onCardRemove(index);
                                // 削除時に選択状態も解除
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
                 {/* Loading/Placeholder indicator */}
                 {containerWidth <= 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 dark:bg-gray-700/50 z-20">
                        <p className="text-gray-500 dark:text-gray-400">レイアウトを計算中...</p>
                    </div>
                 )}
              </div>
            </div>

            {/* Export Controls */}
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
  )
}
