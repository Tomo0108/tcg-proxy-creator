"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
 import { Input } from "@/components/ui/input"
 import { Label } from "@/components/ui/label" // Keep Label import if used elsewhere, otherwise remove
 import { Upload, Download, Printer, Trash2, RotateCcw, ChevronLeft, ChevronRight, PlusSquare } from "lucide-react"
 // Import specific types from pdf-generator
 import { CardData, generatePDF, generatePNG, PdfExportOptions, PngExportOptions } from "@/lib/pdf-generator";
import { toast } from "@/components/ui/use-toast"
import { useMobileDetect } from "@/hooks/use-mobile"
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
 import { cn } from "@/lib/utils"
 import { Plus, FileText } from "lucide-react" // Keep Plus, FileText if used
 import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
 import { useTranslation } from "@/lib/i18n"; // Import useTranslation

// Interface for props passed to this component
interface IntegratedCardEditorProps {
  cardType: string;
  spacing: number;
  cmykConversion: boolean;
  cards: (CardData | null)[]; // Cards for the CURRENT page
  onCardUpdate: (card: CardData, index: number) => void; // Update card on the CURRENT page
  onCardRemove: (index: number) => void; // Remove card from the CURRENT page
  onResetCards: () => void; // Reset the CURRENT page
  exportQuality: "standard" | "high" | "ultra";
  cmykMode: "simple" | "accurate";
  // Page management props
  currentPageIndex: number;
  pageCount: number;
  setCurrentPageIndex: (index: number) => void;
  addPage: () => void;
  deletePage: () => void;
  allPages: (CardData | null)[][]; // All pages data for multi-page export
  // Export scope props
  exportScope: 'current' | 'all';
  setExportScope: (scope: 'current' | 'all') => void;
}

const LONG_PRESS_DURATION = 500; // Long press duration in ms

export function IntegratedCardEditor({
  cardType,
  spacing,
  cmykConversion,
  cards, // Represents cards for the currentPageIndex
  onCardUpdate,
  onCardRemove,
  onResetCards, // Renamed prop, resets current page
  exportQuality,
  cmykMode,
  // Page props
  currentPageIndex,
  pageCount,
  setCurrentPageIndex,
  addPage,
  deletePage,
  allPages, // Receive all pages data
  // Export scope props
  exportScope,
  setExportScope,
}: IntegratedCardEditorProps) {
  const { t } = useTranslation(); // Initialize useTranslation
  const isMobile = useMobileDetect();
  const [selectedCardIndices, setSelectedCardIndices] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false); // Add printing state

  // Refs
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressing = useRef<boolean>(false);
  const uploadTargetIndicesRef = useRef<number[] | null>(null);

  // State for container width
  const [containerWidth, setContainerWidth] = useState(0);

  // Card dimensions in mm
  const cardDimensions = useMemo(() => ({
    pokemon: { width: 63, height: 88 },
    yugioh: { width: 59, height: 86 },
  }), []);

  const { width: cardWidthMM, height: cardHeightMM } = cardDimensions[cardType as keyof typeof cardDimensions] || cardDimensions.pokemon;

  // A4 size in mm
  const a4Width = 210;
  const a4Height = 297;

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
    const validCpr = Math.max(1, cpr); // Ensure at least 1 column/row if possible
    const validCpc = Math.max(1, cpc);

    const gwMM = validCpr > 0 ? validCpr * cardWidthMM + (validCpr - 1) * spacing : 0;
    const ghMM = validCpc > 0 ? validCpc * cardHeightMM + (validCpc - 1) * spacing : 0;
    const mxMM = Math.max(0, (a4Width - gwMM) / 2); // Ensure non-negative margin
    const myMM = Math.max(0, (a4Height - ghMM) / 2);

    return { cardsPerRow: validCpr, cardsPerColumn: validCpc, gridWidthMM: gwMM, gridHeightMM: ghMM, marginXMM: mxMM, marginYMM: myMM };
  }, [a4Width, a4Height, cardWidthMM, cardHeightMM, spacing]);

  // mmToPixels depends on containerWidth state
  const mmToPixels = useCallback((mm: number) => {
    if (containerWidth <= 0 || !Number.isFinite(containerWidth)) return 0;
    if (!Number.isFinite(mm)) return 0;
    const scale = containerWidth / a4Width;
    return mm * scale;
  }, [a4Width, containerWidth]);

  // --- Long Press / Tap Handlers ---
  const handlePointerDown = (index: number) => {
    isLongPressing.current = false;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressTimer.current = setTimeout(() => {
      isLongPressing.current = true;
      if (selectedCardIndices.length > 1 && selectedCardIndices.includes(index)) {
        inputRefs.current[-1]?.click(); // Trigger multi-select input
      } else {
        setSelectedCardIndices([index]); // Select only the long-pressed slot
        inputRefs.current[index]?.click(); // Trigger single input
      }
    }, LONG_PRESS_DURATION);
  };

  const handlePointerUp = (index: number) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!isLongPressing.current) {
      setSelectedCardIndices(prevIndices => {
        const currentIndex = prevIndices.indexOf(index);
        if (currentIndex > -1) {
          return [...prevIndices.slice(0, currentIndex), ...prevIndices.slice(currentIndex + 1)];
        } else {
          return [...prevIndices, index];
        }
      });
    }
    isLongPressing.current = false;
  };

  const handlePointerLeave = (index: number) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  // --- End Long Press / Tap Handlers ---

  // Handle file selection (multiple indices support)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (index === -1 && selectedCardIndices.length > 0) {
        processImage(file, selectedCardIndices);
      } else if (index >= 0) {
        processImage(file, [index]); // Process as single index
      }
    }
    e.target.value = ""; // Reset input
  };

  // Process image and update card data via onCardUpdate prop
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
          const cardData: CardData = { // Ensure CardData type is used
            image: imageDataUrl,
            scale: 1,
            type: cardType,
            originalSize,
            position: { x: 0, y: 0 }
          };
          // Validate index against the current page's card count (derived from grid)
          if (cardsPerRow > 0 && cardsPerColumn > 0 && idx >= 0 && idx < cardsPerRow * cardsPerColumn) {
            onCardUpdate(cardData, idx); // Call prop function
          }
        });

        if (indices.length === 1) {
          // toast({ title: t("toast.imageAdded"), description: `画像をスロット ${indices[0] + 1} (Page ${currentPageIndex + 1}) に追加しました。` });
        } else {
          // toast({ title: t("toast.imageAdded"), description: `画像を ${indices.length} 個のスロット (Page ${currentPageIndex + 1}) に追加しました。` });
        }
        setSelectedCardIndices([]);
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        setSelectedCardIndices([]);
        // toast({ title: "画像読み込みエラー", description: "画像の読み込みに失敗しました。", variant: "destructive" });
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsProcessingImage(false);
      setSelectedCardIndices([]);
      // toast({ title: "ファイル読み込みエラー", description: "ファイルの読み込みに失敗しました。", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  }, [onCardUpdate, cardType, t, cardsPerRow, cardsPerColumn, currentPageIndex]); // Added currentPageIndex dependency for toast

  // Handle file selection for the dedicated upload area (multiple files)
  const handleUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const targetIndices = uploadTargetIndicesRef.current;

    if (files && files.length > 0 && targetIndices && targetIndices.length > 0) {
      const filesToProcess = Array.from(files).slice(0, targetIndices.length);
      setIsProcessingImage(true);
      const processPromises = filesToProcess.map((file, i) => {
        const targetIndex = targetIndices[i];
        if (targetIndex === undefined) return Promise.resolve();

        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const imageDataUrl = event.target?.result as string;
              const originalSize = { width: img.width, height: img.height };
              const cardData: CardData = { // Ensure CardData type
                image: imageDataUrl, scale: 1, type: cardType, originalSize, position: { x: 0, y: 0 }
              };
              if (cardsPerRow > 0 && cardsPerColumn > 0 && targetIndex >= 0 && targetIndex < cardsPerRow * cardsPerColumn) {
                onCardUpdate(cardData, targetIndex); // Call prop function
              }
              resolve();
            };
            img.onerror = () => reject(new Error(`画像読み込みエラー: ${file.name}`));
            img.src = event.target?.result as string;
          };
          reader.onerror = () => reject(new Error(`ファイル読み込みエラー: ${file.name}`));
          reader.readAsDataURL(file);
        });
      });

      Promise.all(processPromises)
        .then(() => {
          // toast({ title: t("toast.imageAdded"), description: `${filesToProcess.length} 個の画像をスロット (Page ${currentPageIndex + 1}) に追加しました。` });
        })
        .catch((error) => {
          // toast({ title: "一部画像の処理に失敗", description: error.message || "画像の処理中にエラーが発生しました。", variant: "destructive" });
        })
        .finally(() => {
          setIsProcessingImage(false);
          setSelectedCardIndices([]);
        });
    }
    e.target.value = "";
    uploadTargetIndicesRef.current = null;
  };

  // Handle click for the dedicated upload area
  const handleUploadButtonClick = () => {
    let targetIndices: number[] | null = null;
    const maxSlots = cardsPerRow * cardsPerColumn;

    if (selectedCardIndices.length > 0) {
      targetIndices = [...selectedCardIndices];
    } else {
      const emptyIndices: number[] = [];
      for (let i = 0; i < maxSlots && emptyIndices.length < 9; i++) {
        const card = cards[i]; // Use 'cards' prop (current page)
        if (card == null || card.image == null) {
          emptyIndices.push(i);
        }
      }
      if (emptyIndices.length > 0) {
        targetIndices = emptyIndices;
      }
    }

    if (targetIndices && targetIndices.length > 0) {
      const validTargetIndices = targetIndices.filter(idx => idx >= 0 && idx < maxSlots);
      if (validTargetIndices.length > 0) {
        uploadTargetIndicesRef.current = validTargetIndices;
        uploadInputRef.current?.click();
      } else {
        // toast({ title: "アップロード先なし", description: "有効なアップロード先スロットが見つかりません。", variant: "destructive" });
      }
    } else {
      // toast({ title: "アップロード先なし", description: "選択中のスロット、または空きスロットがありません。", variant: "destructive" });
    }
  };

  // Render canvas based on current page's cards ('cards' prop)
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || !printRef.current || containerWidth <= 0 || !Number.isFinite(containerWidth)) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const displayWidth = containerWidth;
    const displayHeight = (containerWidth / a4Width) * a4Height;
    if (displayWidth <= 0 || displayHeight <= 0 || !Number.isFinite(displayWidth) || !Number.isFinite(displayHeight)) return;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (cardsPerRow <= 0 || cardsPerColumn <= 0) return;

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
          const drawX = drawXBg; const drawY = drawYBg;
          const drawCardWidth = drawCardWidthBg; const drawCardHeight = drawCardHeightBg;
          if (drawCardWidth <= 0 || drawCardHeight <= 0) { resolve(); return; }

          ctx.save();
          ctx.beginPath(); ctx.rect(drawX, drawY, drawCardWidth, drawCardHeight); ctx.clip();

          const originalImgWidth = card.originalSize?.width || img.width;
          const originalImgHeight = card.originalSize?.height || img.height;
          const imgAspectRatio = originalImgWidth / originalImgHeight;
          const cardAspectRatio = drawCardWidth / drawCardHeight;
          const cardScale = card.scale || 1;
          const cardPosition = card.position || { x: 0, y: 0 };

          let baseWidth, baseHeight;
          if (imgAspectRatio > cardAspectRatio) {
             baseHeight = drawCardHeight; baseWidth = baseHeight * imgAspectRatio;
          } else {
             baseWidth = drawCardWidth; baseHeight = baseWidth / imgAspectRatio;
          }
          const targetWidth = baseWidth * cardScale;
          const targetHeight = baseHeight * cardScale;

          // Calculate offset including cardPosition adjustment (position.x/y range -1 to 1)
          const offsetX = (drawCardWidth - targetWidth) / 2 + cardPosition.x * Math.abs(drawCardWidth - targetWidth) / 2;
          const offsetY = (drawCardHeight - targetHeight) / 2 + cardPosition.y * Math.abs(drawCardHeight - targetHeight) / 2;
          const imgDrawX = drawX + offsetX;
          const imgDrawY = drawY + offsetY;

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
  }, [cards, spacing, cardType, a4Width, a4Height, cardWidthMM, cardHeightMM, marginXMM, marginYMM, cardsPerRow, cardsPerColumn, mmToPixels, containerWidth]); // Use 'cards' prop

  // useEffect to setup ResizeObserver and update containerWidth
  useEffect(() => {
    const element = printRef.current;
    if (!element) return;
    let animationFrameId: number | null = null;
    const observer = new ResizeObserver(entries => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(() => {
            for (let entry of entries) {
                const newWidth = entry.contentRect.width;
                if (newWidth > 0 && Number.isFinite(newWidth)) {
                    setContainerWidth(prevWidth => newWidth !== prevWidth ? newWidth : prevWidth);
                }
            }
        });
    });
    observer.observe(element, { box: 'content-box' });
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (element) observer.unobserve(element);
      observer.disconnect();
    };
  }, []);

  // useEffect to trigger renderCanvas when containerWidth or dependencies change
  useEffect(() => {
    if (containerWidth > 0) {
      renderCanvas();
    }
  }, [containerWidth, renderCanvas]); // renderCanvas depends on 'cards' prop now

  // Get DPI for export based on quality prop
  const getDpiForQuality = useCallback(() => {
    switch (exportQuality) {
      case "standard": return 300;
      case "high": return 450;
      case "ultra": return 600;
      default: return 300;
    }
  }, [exportQuality]);

   // --- Export Handlers ---
   const handleExportPDF = async () => {
     if (containerWidth <= 0) {
         // toast({ title: "エクスポート不可", description: "プレビューの準備ができていません。", variant: "destructive" });
         return;
     }
     setIsExporting(true);
     try {
       const pagesToExport = exportScope === 'all' ? allPages : [cards]; // Use allPages or current page's cards
       const exportDimensions = { a4Width, a4Height, cardWidth: cardWidthMM, cardHeight: cardHeightMM, marginX: marginXMM, marginY: marginYMM, cardsPerRow, cardsPerColumn };
       const exportDpi = getDpiForQuality();

       if (exportScope === 'all') {
         // toast({ title: t("toast.exportingAllTitle"), description: t("toast.exportingAllDescPdf") });
       } else if (exportQuality === "ultra") {
          // toast({ title: "高品質出力処理中", description: "高解像度PDFの生成には時間がかかる場合があります。" });
       }

       const options: PdfExportOptions = { // Use PdfExportOptions type
         pages: pagesToExport,
         spacing, cardType, cmykConversion, cmykMode,
         dpi: exportDpi,
         dimensions: exportDimensions,
       };
       const pdfBlob = await generatePDF(options);
       downloadFile(pdfBlob, `tcg-proxy-cards-${exportScope}-${exportDpi}dpi.pdf`);
       // toast({ title: t("toast.pdfSuccess"), description: t("toast.pdfSuccessDesc") });
     } catch (error) {
      console.error("PDF export failed:", error);
      // toast({ title: t("toast.exportError"), description: `${t("toast.exportErrorDesc")}${error instanceof Error ? error.message : t("toast.unknownError")}`, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
   }

   const handleExportPNG = async () => {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas || containerWidth <= 0) {
         // toast({ title: "エクスポート不可", description: "プレビューの準備ができていません。", variant: "destructive" });
         return;
      }
      if (exportScope === 'all') {
        // toast({ title: t("toast.notImplementedTitle"), description: t("toast.notImplementedDescAllPages"), variant: "default" });
        return;
      }

      setIsExporting(true);
      try {
        if (exportQuality === "ultra") {
           // toast({ title: "高品質出力処理中", description: "高解像度PNGの生成には時間がかかる場合があります。" });
         }
         // Filter out null cards from the CURRENT page ('cards' prop)
         const validCards = cards.filter((card): card is CardData => card !== null);
         const exportDimensions = { a4Width, a4Height, cardWidth: cardWidthMM, cardHeight: cardHeightMM, marginX: marginXMM, marginY: marginYMM, cardsPerRow, cardsPerColumn };
         const exportDpi = getDpiForQuality();

         const options: PngExportOptions = { // Use PngExportOptions type
           cards: validCards, // Pass only valid cards from the current page
           spacing, cardType, cmykConversion, cmykMode,
           dpi: exportDpi,
           canvas: currentCanvas, // Pass preview canvas for fallback
           dimensions: exportDimensions,
         };
        const pngBlob = await generatePNG(options);
        downloadFile(pngBlob, `tcg-proxy-cards-page${currentPageIndex + 1}-${exportDpi}dpi.png`);
        // toast({ title: t("toast.pngSuccess"), description: t("toast.pngSuccessDesc") });
      } catch (error) {
        console.error("PNG export failed:", error);
        // toast({ title: t("toast.exportError"), description: `${t("toast.exportErrorDesc")}${error instanceof Error ? error.message : t("toast.unknownError")}`, variant: "destructive" });
      } finally {
        setIsExporting(false);
      }
   }
   // --- End Export Handlers ---

   // --- Print Handler ---
   const handlePrint = async () => {
     if (isPrinting || isExporting || containerWidth <= 0) {
       // toast({ title: "印刷不可", description: "現在他の処理を実行中か、プレビューの準備ができていません。", variant: "destructive" });
       return;
     }
     setIsPrinting(true);
     // toast({ title: "印刷準備中", description: "高品質な印刷用データを生成しています..." });

     let printFrame: HTMLIFrameElement | null = null;
     let pdfUrl: string | null = null;

     try {
       const pagesToPrint = exportScope === 'all' ? allPages : [cards];
       const printDimensions = { a4Width, a4Height, cardWidth: cardWidthMM, cardHeight: cardHeightMM, marginX: marginXMM, marginY: marginYMM, cardsPerRow, cardsPerColumn };
       const printDpi = getDpiForQuality(); // Use export quality for printing

       const options: PdfExportOptions = {
         pages: pagesToPrint,
         spacing, cardType, cmykConversion, cmykMode,
         dpi: printDpi,
         dimensions: printDimensions,
       };

       const pdfBlob = await generatePDF(options);
       pdfUrl = URL.createObjectURL(pdfBlob);

       printFrame = document.createElement('iframe');
       printFrame.style.position = 'absolute';
       printFrame.style.width = '0';
       printFrame.style.height = '0';
       printFrame.style.border = '0';
       printFrame.style.visibility = 'hidden';
       printFrame.src = pdfUrl;

       const handleLoad = () => {
         try {
           if (printFrame?.contentWindow) {
             printFrame.contentWindow.focus(); // Required for some browsers
             printFrame.contentWindow.print();
             // Cleanup is tricky because print dialog is modal.
             // Removing automatic cleanup to prevent dialog from closing prematurely.
             // Resource leak might occur, but browser should handle on tab close.
             // setTimeout(() => { // Remove or comment out setTimeout
               // if (printFrame) {
               //   document.body.removeChild(printFrame); // Comment out cleanup
               //   printFrame = null;
               // }
               // if (pdfUrl) {
               //   URL.revokeObjectURL(pdfUrl); // Comment out cleanup
               //   pdfUrl = null;
               // }
               setIsPrinting(false); // Keep resetting state
               // toast({ title: "印刷準備完了", description: "印刷ダイアログが表示されました。" }); // Keep toast
             // }, 2000); // Remove or comment out setTimeout
           } else {
             throw new Error("印刷フレームのコンテンツが見つかりません。");
           }
         } catch (printError) {
           console.error("Printing failed:", printError);
           // toast({ title: "印刷エラー", description: `印刷の実行に失敗しました: ${printError instanceof Error ? printError.message : t("toast.unknownError")}`, variant: "destructive" });
           // Cleanup on error
           if (printFrame) document.body.removeChild(printFrame);
           if (pdfUrl) URL.revokeObjectURL(pdfUrl);
           setIsPrinting(false);
         }
       };

       const handleError = () => {
         console.error("Failed to load PDF in iframe.");
         // toast({ title: "印刷準備エラー", description: "印刷用PDFの読み込みに失敗しました。", variant: "destructive" });
         if (printFrame) document.body.removeChild(printFrame);
         if (pdfUrl) URL.revokeObjectURL(pdfUrl);
         setIsPrinting(false);
       };

       printFrame.addEventListener('load', handleLoad);
       printFrame.addEventListener('error', handleError);

       document.body.appendChild(printFrame);

     } catch (error) {
       console.error("PDF generation for printing failed:", error);
       // toast({ title: "印刷準備エラー", description: `印刷用PDFの生成に失敗しました: ${error instanceof Error ? error.message : t("toast.unknownError")}`, variant: "destructive" });
       // Ensure cleanup even if PDF generation fails
       if (printFrame && printFrame.parentNode) document.body.removeChild(printFrame);
       if (pdfUrl) URL.revokeObjectURL(pdfUrl);
       setIsPrinting(false);
     }
   };
   // --- End Print Handler ---

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
  }, [containerWidth, cardsPerRow, cardsPerColumn, cardWidthMM, cardHeightMM, spacing, mmToPixels]);

  // Component JSX
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <Card className="col-span-1 border-gold-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">{t("layout.preview")}</h3>
              {/* Reset Button - Calls onResetCards prop */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                     <Button
                       onClick={onResetCards} // Use prop
                       className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border bg-background text-gray-900 dark:text-white hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 border-gold-500 w-full sm:w-auto" // Modified: flex-1 sm:flex-none sm:w-28 -> w-full sm:w-auto
                     >
                       <RotateCcw className="h-4 w-4" />
                      <span>{t("action.resetAll")}</span> {/* Text updated in i18n to "Reset Page" */}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t("action.resetAll")}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
                      {/* Multi-select hidden input */}
                      <Input
                        ref={(el) => { inputRefs.current[-1] = el; }}
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleFileChange(e, -1)}
                      />
                      {/* Grid Cells */}
                      {Array(cardsPerRow * cardsPerColumn).fill(0).map((_, index) => (
                        <div
                          key={`card-slot-${currentPageIndex}-${index}`} // Add currentPageIndex to key for reactivity
                          className={cn(
                            "relative border border-dashed border-gray-400 dark:border-gray-600 rounded cursor-pointer transition-all hover:bg-yellow-50/10 dark:hover:bg-yellow-700/10 select-none",
                            selectedCardIndices.includes(index) ? "ring-2 ring-gold-500 ring-offset-1 bg-yellow-50/15 dark:bg-yellow-700/15" : ""
                          )}
                          style={{ pointerEvents: "auto", touchAction: 'none' }}
                          onPointerDown={() => handlePointerDown(index)}
                          onPointerUp={() => handlePointerUp(index)}
                          onPointerLeave={() => handlePointerLeave(index)}
                          onContextMenu={(e) => e.preventDefault()}
                        >
                          {/* Individual hidden input */}
                          <Input
                            ref={(el) => { if (index >= 0 && index < (cardsPerRow * cardsPerColumn)) { inputRefs.current[index] = el; } }}
                            type="file" accept="image/*" className="hidden"
                            onChange={(e) => handleFileChange(e, index)}
                           />
                           {/* Remove Button - Uses onCardRemove prop */}
                           {cards[index] != null && ( // Check 'cards' prop
                             <Button
                               variant="destructive" size="icon"
                               className="absolute top-0.5 right-0.5 h-4 w-4 z-20 p-0 pointer-events-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCardRemove(index); // Use prop
                                setSelectedCardIndices(prev => prev.filter(i => i !== index));
                              }}
                            > <Trash2 className="h-2.5 w-2.5" /> </Button>
                          )}
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
             {/* --- Pagination Controls --- */}
             <div className="mt-4 flex items-center justify-center space-x-2">
               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button
                       variant="outline" size="icon"
                       onClick={() => setCurrentPageIndex(currentPageIndex - 1)} // Use prop
                       disabled={currentPageIndex === 0}
                       className="border-gold-500"
                     > <ChevronLeft className="h-4 w-4" /> </Button>
                   </TooltipTrigger>
                   <TooltipContent><p>{t("pagination.previous")}</p></TooltipContent>
                 </Tooltip>
               </TooltipProvider>

               <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                 {t("pagination.page")} {currentPageIndex + 1} / {pageCount} {/* Use props */}
               </span>

               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button
                       variant="outline" size="icon"
                       onClick={() => setCurrentPageIndex(currentPageIndex + 1)} // Use prop
                       disabled={currentPageIndex === pageCount - 1} // Use prop
                       className="border-gold-500"
                     > <ChevronRight className="h-4 w-4" /> </Button>
                   </TooltipTrigger>
                   <TooltipContent><p>{t("pagination.next")}</p></TooltipContent>
                 </Tooltip>
               </TooltipProvider>

               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button variant="outline" size="icon" onClick={addPage} className="border-gold-500"> {/* Use prop */}
                       <PlusSquare className="h-4 w-4" />
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent><p>{t("pagination.addPage")}</p></TooltipContent>
                 </Tooltip>
               </TooltipProvider>

               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button variant="destructive" size="icon" onClick={deletePage} disabled={pageCount <= 1}> {/* Use props */}
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent><p>{t("pagination.deletePage")}</p></TooltipContent>
                 </Tooltip>
               </TooltipProvider>
             </div>
             {/* --- End Pagination Controls --- */}
             <div className="mt-6 space-y-4">
               {/* Hidden input for the upload button */}
               <Input
                 ref={uploadInputRef} type="file" accept="image/*" multiple className="hidden"
                 onChange={handleUploadFileChange}
               />
               {/* Upload Area */}
               <div
                 onClick={handleUploadButtonClick}
                  className={cn(
                    "flex flex-col items-center justify-center w-full sm:w-auto sm:flex-1 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                    isProcessingImage ? "opacity-50 cursor-not-allowed" : ""
                  )}
                  style={{ minHeight: '60px' }}
                >
                  <Upload className="h-6 w-6 text-gray-500 dark:text-gray-400 mb-1" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    {selectedCardIndices.length > 1
                      ? `${t("action.clickOrDropToUpload")} (${selectedCardIndices.length} スロット選択中)`
                       : t("action.clickOrDropToUpload")}
                  </span>
               </div>

               {/* Export/Print Controls Section */}
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t mt-4">
                 {/* Export Scope Toggle */}
                 <div className="flex-shrink-0"> {/* Wrap ToggleGroup for better alignment control */}
                   <ToggleGroup
                     type="single"
                     value={exportScope} // Use prop
                     onValueChange={(value) => { if (value === 'current' || value === 'all') { setExportScope(value); } }} // Use prop
                     className="border border-gold-500 rounded-md overflow-hidden h-10"
                     aria-label="Export Scope"
                   >
                     <ToggleGroupItem value="current" aria-label="Export current page" className="data-[state=on]:bg-gold-500 data-[state=on]:text-black px-3 text-xs sm:text-sm h-full">
                       {t("export.scope.current")}
                     </ToggleGroupItem>
                     <ToggleGroupItem value="all" aria-label="Export all pages" className="data-[state=on]:bg-gold-500 data-[state=on]:text-black px-3 text-xs sm:text-sm h-full">
                       {t("export.scope.all")}
                     </ToggleGroupItem>
                   </ToggleGroup>
                 </div>

                 {/* Export Buttons */}
                 <div className="flex space-x-2 justify-end w-full sm:w-auto">
                   <Button variant="outline" onClick={handlePrint} disabled={isPrinting || isExporting || containerWidth <= 0} className="border-gold-500 flex-1 sm:flex-none sm:w-28">
                     <Printer className="mr-2 h-4 w-4" /> {t("action.print")}
                     </Button>
                     {exportScope === 'current' && (
                       <Button onClick={handleExportPNG} disabled={isExporting || containerWidth <= 0} className="bg-gold-500 hover:bg-gold-600 flex-1 sm:flex-none sm:w-28">
                         <Download className="mr-2 h-4 w-4" /> PNG
                       </Button>
                     )}
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
