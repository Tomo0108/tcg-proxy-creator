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
  exportQuality: "standard" | "high" | "ultra" // Add exportQuality prop
}

export function IntegratedCardEditor({
  cardType,
  spacing,
  cmykConversion,
  cards,
  onCardUpdate,
  onCardRemove,
  exportQuality, // Receive exportQuality as prop
}: IntegratedCardEditorProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetect()
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  // const [exportQuality, setExportQuality] = useState<"standard" | "high" | "ultra">("high") // Remove state
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

    // console.log("Grid calculation (MM):", { validCpr, validCpc, gwMM, ghMM, mxMM, myMM });
    return { cardsPerRow: validCpr, cardsPerColumn: validCpc, gridWidthMM: gwMM, gridHeightMM: ghMM, marginXMM: mxMM, marginYMM: myMM };
  }, [a4Width, a4Height, cardWidthMM, cardHeightMM, spacing]);

  // mmToPixels depends on containerWidth state
  const mmToPixels = useCallback((mm: number) => {
    if (containerWidth <= 0 || !Number.isFinite(containerWidth)) return 0;
    if (!Number.isFinite(mm)) return 0;
    const scale = containerWidth / a4Width;
    return mm * scale;
  }, [a4Width, containerWidth]);

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

    // console.log(`renderCanvas: Drawing grid (${cardsPerRow}x${cardsPerColumn})`);

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
      } else {
          // console.warn(`Card ${index} background skipped: Invalid dimensions`, { drawCardWidthBg, drawCardHeightBg });
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
              // console.warn(`Skipping image draw for index ${index}: Invalid card dimensions`);
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
          } else {
              // console.warn(`Skipping image draw for index ${index}: Invalid target dimensions or position`, { targetWidth, targetHeight, imgDrawX, imgDrawY });
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

    Promise.all(loadPromises).then(() => {
      // console.log("Canvas image loading and drawing complete");
    }).catch(err => {
        console.error("Error during image loading/drawing:", err);
    });
  }, [cards, spacing, cardType, a4Width, a4Height, cardWidthMM, cardHeightMM, marginXMM, marginYMM, cardsPerRow, cardsPerColumn, mmToPixels, containerWidth]);

  // useEffect to setup ResizeObserver and update containerWidth
  useEffect(() => {
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
                // console.log("ResizeObserver callback: newWidth =", newWidth); // Keep this log for debugging
                if (newWidth > 0 && Number.isFinite(newWidth)) {
                    setContainerWidth(prevWidth => {
                        if (newWidth !== prevWidth) {
                            console.log(`ResizeObserver updating containerWidth from ${prevWidth} to ${newWidth}`);
                            return newWidth;
                        }
                        return prevWidth;
                    });
                } else if (newWidth <= 0) {
                    // Optional: Handle case where width becomes 0 after being positive
                    // setContainerWidth(0); // Or keep the last known positive width? Decide based on desired behavior.
                    console.warn(`ResizeObserver callback: Width became zero or invalid (${newWidth})`);
                }
            }
        });
    });

    observer.observe(element, { box: 'content-box' });
    console.log("ResizeObserver useEffect: Observer attached.");

    // REMOVED initial check with setTimeout - rely solely on the observer callback

    return () => {
      console.log("ResizeObserver useEffect: Cleaning up observer for", element);
      if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
      // Check element existence before unobserving is good practice
      if (element) { observer.unobserve(element); }
      observer.disconnect();
      console.log("ResizeObserver useEffect: Observer detached.");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array: Run only once on mount

  // useEffect to trigger renderCanvas when containerWidth is ready or renderCanvas definition changes
  useEffect(() => {
    // Only render if containerWidth is validly set (greater than 0)
    if (containerWidth > 0) {
      console.log(`renderCanvas useEffect: Triggering renderCanvas (containerWidth: ${containerWidth})`);
      renderCanvas();
    } else {
      console.log(`renderCanvas useEffect: Skipping renderCanvas (containerWidth: ${containerWidth})`);
    }
  }, [containerWidth, renderCanvas]); // Depend on containerWidth and the stable renderCanvas

  // Get DPI for export (moved logic here, depends on prop)
  const getDpiForQuality = useCallback(() => {
    switch (exportQuality) {
      case "standard": return 300;
      case "high": return 450;
      case "ultra": return 600;
      default: return 300; // Default to standard if prop is somehow invalid
    }
  }, [exportQuality]);

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
