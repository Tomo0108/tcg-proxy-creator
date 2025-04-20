"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button" // Keep existing Button import
import { Card, CardContent } from "@/components/ui/card"
 import { Input } from "@/components/ui/input"
 import { Label } from "@/components/ui/label"
 import { Upload, Download, Printer, Trash2, RotateCcw, ChevronLeft, ChevronRight, PlusSquare } from "lucide-react" // Import pagination icons
 import { useTranslation } from "@/lib/i18n"
 import { generatePDF, generatePNG } from "@/lib/pdf-generator"
import { toast } from "@/components/ui/use-toast"
import { useMobileDetect } from "@/hooks/use-mobile"
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip" // Import Tooltip components
 import { cn } from "@/lib/utils" // cn をインポート
 import { Plus, FileText } from "lucide-react" // Import Plus and FileText
 import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group" // Import ToggleGroup
 
 // Define CardData interface locally for type safety
 interface CardData {
  image: string;
  scale: number;
  type: string;
  originalSize: { width: number; height: number };
  position: { x: number; y: number };
}

interface IntegratedCardEditorProps {
  cardType: string
  spacing: number
  cmykConversion: boolean
   cards: (CardData | null)[] // Use CardData type
   onCardUpdate: (card: CardData, index: number) => void // Use CardData type
   onCardRemove: (index: number) => void
   onResetCards: () => void // This corresponds to handleResetCurrentPage now
   exportQuality: "standard" | "high" | "ultra"
   cmykMode: "simple" | "accurate"
   // Add new props for page management
   currentPageIndex: number;
   pageCount: number;
   setCurrentPageIndex: (index: number) => void;
   addPage: () => void;
    deletePage: () => void;
    allPages: (CardData | null)[][]; // For potential future use (e.g., multi-page export)
    // Add export scope props
    exportScope: 'current' | 'all';
    setExportScope: (scope: 'current' | 'all') => void;
  }
 
 const LONG_PRESS_DURATION = 500; // 長押し判定時間 (ms)

export function IntegratedCardEditor({
  cardType,
  spacing,
  cmykConversion,
  cards, // This now represents the cards for the currentPageIndex
   onCardUpdate,
   onCardRemove,
   onResetCards, // Receive reset function (now resets current page)
   exportQuality,
   cmykMode,
   // Destructure new page props
   currentPageIndex,
   pageCount,
   setCurrentPageIndex,
   addPage,
    deletePage,
    allPages, // Receive allPages, though not used directly in rendering yet
    // Destructure export scope props
    exportScope,
    setExportScope,
  }: IntegratedCardEditorProps) {
    const { t } = useTranslation()
   const isMobile = useMobileDetect()
  const [selectedCardIndices, setSelectedCardIndices] = useState<number[]>([]); // 複数選択用の state
  const [isExporting, setIsExporting] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Refs
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const uploadInputRef = useRef<HTMLInputElement | null>(null); // 新しいファイル入力用の Ref
  const printRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null); // 長押しタイマー用 Ref
  const isLongPressing = useRef<boolean>(false); // 長押し判定フラグ用 Ref
  const uploadTargetIndicesRef = useRef<number[] | null>(null); // アップロードエリアの対象インデックス配列用 Ref

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

  // Handle file selection (複数選択対応)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      // index が -1 の場合は複数選択用の input からのイベント
      if (index === -1 && selectedCardIndices.length > 0) {
        console.log("Processing image for multiple indices:", selectedCardIndices);
        processImage(file, selectedCardIndices);
      } else if (index >= 0) {
        // index が 0 以上の場合は個別の input からのイベント (単一選択 or 長押し)
        // 長押しで単一選択になった場合もここに来る
        console.log(`Processing image for single index: ${index}`);
        processImage(file, [index]); // 常に配列で渡す
      }
    }
    // Reset input value to allow selecting the same file again
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
        setSelectedCardIndices([]); // 処理後、選択状態をリセット
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        setSelectedCardIndices([]); // エラー時もリセット
        toast({ title: "画像読み込みエラー", description: "画像の読み込みに失敗しました。", variant: "destructive" });
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsProcessingImage(false);
      setSelectedCardIndices([]); // エラー時もリセット
      toast({ title: "ファイル読み込みエラー", description: "ファイルの読み込みに失敗しました。", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  }, [onCardUpdate, cardType, t, cardsPerRow, cardsPerColumn]);

  // Handle file selection for the dedicated upload area (multiple files)
  const handleUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const targetIndices = uploadTargetIndicesRef.current; // 配列を取得

    if (files && files.length > 0 && targetIndices && targetIndices.length > 0) {
      console.log(`Processing ${files.length} images via upload area for indices: ${targetIndices.join(', ')}`);

      // Determine how many files to process (up to the number of target slots)
      const filesToProcess = Array.from(files).slice(0, targetIndices.length);

      // Process each file for a corresponding target index
      filesToProcess.forEach((file, i) => {
        const targetIndex = targetIndices[i];
        if (targetIndex !== undefined) { // Ensure the index exists
          console.log(`Processing file ${i + 1} for target index ${targetIndex}`);
          // We need a way to process each file individually.
          // Modifying processImage or creating a new function might be needed.
          // For now, let's adapt the existing processImage logic inline or call it repeatedly.
          // Calling processImage repeatedly might trigger multiple toasts and state updates inefficiently.
          // Let's try processing them in a batch.

          // --- Inline processing logic (similar to processImage but for one file/index pair) ---
          setIsProcessingImage(true); // Set processing state
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const imageDataUrl = event.target?.result as string;
              const originalSize = { width: img.width, height: img.height };
              const cardData = {
                image: imageDataUrl,
                scale: 1,
                type: cardType,
                originalSize,
                position: { x: 0, y: 0 }
              };
              if (cardsPerRow > 0 && cardsPerColumn > 0 && targetIndex >= 0 && targetIndex < cardsPerRow * cardsPerColumn) {
                onCardUpdate(cardData, targetIndex);
              }
              // Consider moving toast and state reset outside the loop for batch completion message
              // toast({ title: t("toast.imageAdded"), description: `画像をスロット ${targetIndex + 1} に追加しました。` });
              // setIsProcessingImage(false); // Reset processing state after each file? Or after all?
            };
            img.onerror = () => {
              toast({ title: "画像読み込みエラー", description: `ファイル ${file.name} の読み込みに失敗しました。`, variant: "destructive" });
              // setIsProcessingImage(false); // Reset on error
            };
            img.src = event.target?.result as string;
          };
          reader.onerror = () => {
            toast({ title: "ファイル読み込みエラー", description: `ファイル ${file.name} の読み込みに失敗しました。`, variant: "destructive" });
            // setIsProcessingImage(false); // Reset on error
          };
          reader.readAsDataURL(file);
          // --- End of inline processing logic ---
        }
      });

      // After loop: Show a single toast for batch completion and reset state
      // Need to wait for all file readers to complete. Using Promise.all might be better.
      // Let's refine this with Promise.all.

      // --- Refined processing with Promise.all ---
      setIsProcessingImage(true);
      const processPromises = filesToProcess.map((file, i) => {
        const targetIndex = targetIndices[i];
        if (targetIndex === undefined) return Promise.resolve(); // Skip if no target index

        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const imageDataUrl = event.target?.result as string;
              const originalSize = { width: img.width, height: img.height };
              const cardData = {
                image: imageDataUrl, scale: 1, type: cardType, originalSize, position: { x: 0, y: 0 }
              };
              if (cardsPerRow > 0 && cardsPerColumn > 0 && targetIndex >= 0 && targetIndex < cardsPerRow * cardsPerColumn) {
                onCardUpdate(cardData, targetIndex);
              }
              resolve();
            };
            img.onerror = () => {
              console.error(`Error loading image: ${file.name}`);
              reject(new Error(`画像読み込みエラー: ${file.name}`));
            };
            img.src = event.target?.result as string;
          };
          reader.onerror = () => {
            console.error(`Error reading file: ${file.name}`);
            reject(new Error(`ファイル読み込みエラー: ${file.name}`));
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(processPromises)
        .then(() => {
          toast({ title: t("toast.imageAdded"), description: `${filesToProcess.length} 個の画像をスロットに追加しました。` });
        })
        .catch((error) => {
          toast({ title: "一部画像の処理に失敗", description: error.message || "画像の処理中にエラーが発生しました。", variant: "destructive" });
        })
        .finally(() => {
          setIsProcessingImage(false);
          setSelectedCardIndices([]); // Reset selection after processing
        });
      // --- End of refined processing ---

    } else {
      console.warn("Upload area file change triggered without valid files or target indices.");
    }

    // Reset input value and target indices regardless of success/failure
    e.target.value = "";
    uploadTargetIndicesRef.current = null;
  };

  // Handle click for the dedicated upload area
  const handleUploadButtonClick = () => {
    let targetIndices: number[] | null = null;

    // Priority 1: Use all selected indices if available
    if (selectedCardIndices.length > 0) {
      targetIndices = [...selectedCardIndices]; // 選択中のインデックス全てをコピー
      console.log(`Upload area target: Selected indices ${targetIndices.join(', ')}`);
    } else {
      // Priority 2: Find up to 9 empty slots
      const emptyIndices: number[] = [];
       const maxSlots = cardsPerRow * cardsPerColumn;
       for (let i = 0; i < maxSlots && emptyIndices.length < 9; i++) {
         // Explicitly check for null before accessing properties
         const card = cards[i];
         if (card == null || card.image == null) { // Check if card or card.image is null/undefined
           emptyIndices.push(i);
         }
       }

      if (emptyIndices.length > 0) {
        targetIndices = emptyIndices;
        console.log(`Upload area target: Empty indices ${targetIndices.join(', ')}`);
      } else {
         console.log("Upload area target: No empty slots found.");
      }
    }

    if (targetIndices && targetIndices.length > 0) {
      // Filter out invalid indices just in case
      const validTargetIndices = targetIndices.filter(idx => idx >= 0 && idx < cardsPerRow * cardsPerColumn);
      if (validTargetIndices.length > 0) {
        uploadTargetIndicesRef.current = validTargetIndices; // Store the valid target indices
        uploadInputRef.current?.click(); // Trigger the hidden input
      } else {
        toast({ title: "アップロード先なし", description: "有効なアップロード先スロットが見つかりません。", variant: "destructive" });
        console.log("Upload area: No valid target slot found.");
      }
    } else {
      toast({ title: "アップロード先なし", description: "選択中のスロット、または空きスロットがありません。", variant: "destructive" });
      console.log("Upload area: No target slot found (grid full or invalid state).");
    }
  };

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
          ctx.fillStyle = "#f0f0f0"; // 背景色を少し薄く
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
          // 画像をカードに合わせて中央揃えで表示 (Aspect Fill)
          if (imgAspectRatio > cardAspectRatio) {
             baseHeight = drawCardHeight;
             baseWidth = baseHeight * imgAspectRatio;
          } else {
             baseWidth = drawCardWidth;
             baseHeight = baseWidth / imgAspectRatio;
          }
          const targetWidth = baseWidth * cardScale;
          const targetHeight = baseHeight * cardScale;
          // 画像の位置調整 (position を考慮)
          const cardPosition = card.position || { x: 0, y: 0 };
          const offsetX = (drawCardWidth - targetWidth) / 2 + cardPosition.x * (drawCardWidth / 2); // position.x は -1 から 1 の範囲を想定
          const offsetY = (drawCardHeight - targetHeight) / 2 + cardPosition.y * (drawCardHeight / 2); // position.y は -1 から 1 の範囲を想定
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
        console.error("Error during image loading/drawing:", err); // Add comma
    });
  }, [cards, spacing, cardType, a4Width, a4Height, cardWidthMM, cardHeightMM, marginXMM, marginYMM, cardsPerRow, cardsPerColumn, mmToPixels, containerWidth]); // Corrected closing brace and dependency array

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
  const getDpiForQuality = useCallback(() => {
    switch (exportQuality) {
      case "standard": return 300;
      case "high": return 450;
      case "ultra": return 600;
      default: return 300;
    }
  }, [exportQuality]);

   // Export functions
   const handleExportPDF = async () => {
     const currentCanvas = canvasRef.current; // チェック用に変数に入れる
     if (!currentCanvas || containerWidth <= 0) { // currentCanvas をチェック
         toast({ title: "エクスポート不可", description: "プレビューの準備ができていません。", variant: "destructive" });
         return;
    }
    // Check export scope - REMOVED 'all' check for PDF

    setIsExporting(true);
    try {
       // Prepare pages data based on exportScope
       const pagesToExport = exportScope === 'all'
         ? allPages // Use all pages data
         : [cards]; // Use only the current page data, wrapped in an array

       // Show a different toast message when exporting all pages
       if (exportScope === 'all') {
         toast({ title: t("toast.exportingAllTitle"), description: t("toast.exportingAllDescPdf") });
       } else if (exportQuality === "ultra") { // Keep ultra quality toast for single page
          toast({ title: "高品質出力処理中", description: "高解像度PDFの生成には時間がかかる場合があります。" });
       }

       const options = {
         pages: pagesToExport, // Pass the prepared pages data
         spacing, cardType, cmykConversion, cmykMode,
         dpi: getDpiForQuality(),
         // canvas is removed from PDF options
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
      const currentCanvas = canvasRef.current; // チェック用に変数に入れる
      if (!currentCanvas || containerWidth <= 0) { // currentCanvas をチェック
         toast({ title: "エクスポート不可", description: "プレビューの準備ができていません。", variant: "destructive" });
         return;
    }
    // Check export scope
    if (exportScope === 'all') {
      toast({
        title: t("toast.notImplementedTitle"),
        description: t("toast.notImplementedDescAllPages"),
        variant: "default", // Use default variant for info
      });
      return; // Stop execution if 'all' is selected
    }

    setIsExporting(true);
    try {
      if (exportQuality === "ultra") {
         toast({ title: "高品質出力処理中", description: "高解像度PNGの生成には時間がかかる場合があります。" });
       }
       // Filter out null cards from the CURRENT page before passing to generatePNG
       const validCards = cards.filter((card): card is CardData => card !== null);
         const options = {
           cards: validCards,
           spacing, cardType, cmykConversion, cmykMode,
           dpi: getDpiForQuality(),
           canvas: currentCanvas, // null でないことが保証された canvas を渡す
           dimensions: { a4Width, a4Height, cardWidth: cardWidthMM, cardHeight: cardHeightMM, marginX: marginXMM, marginY: marginYMM, cardsPerRow, cardsPerColumn },
         };
        const pngBlob = await generatePNG(options);
      // TODO: Implement multi-page PNG export (e.g., zip) when exportScope is 'all'
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
          pointerEvents: "none" as const, // Overlay自体はイベントを受け取らない
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
              {/* Reset Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                     {/* Apply the new class string and remove variant/size, set text color based on mode */}
                     <Button
                       onClick={onResetCards}
                       className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border bg-background text-gray-900 dark:text-white hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 border-gold-500 flex-1 sm:flex-none sm:w-28" // Changed text-white to text-gray-900 dark:text-white
                     >
                       {/* Keep the icon */}
                       <RotateCcw className="h-4 w-4" />
                      {/* Ensure span is visible */}
                      <span>{t("action.resetAll")}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("action.resetAll")}</p>
                  </TooltipContent>
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
                    className="absolute top-0 left-0 w-full h-full z-10" // z-10 を追加
                    style={overlayStyles}
                  >
                    <div className="grid h-full w-full" style={gridStyles}>
                      {/* 複数選択用の隠し Input */}
                      <Input
                        ref={(el) => { inputRefs.current[-1] = el; }}
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleFileChange(e, -1)}
                      />
                      {Array(cardsPerRow * cardsPerColumn).fill(0).map((_, index) => (
                        <div
                          key={index}
                          className={cn(
                            "relative border border-dashed border-gray-400 dark:border-gray-600 rounded cursor-pointer transition-all hover:bg-yellow-50/10 dark:hover:bg-yellow-700/10 select-none", // select-none を追加
                          onContextMenu={(e) => e.preventDefault()} // コンテキストメニューを無効化
                        >
                          {/* 個別の隠し Input */}
                          <Input
                            ref={(el) => {
                                if (index >= 0 && index < (cardsPerRow * cardsPerColumn)) {
                                    inputRefs.current[index] = el;
                                }
                            }}
                            type="file" accept="image/*" className="hidden"
                            onChange={(e) => handleFileChange(e, index)}
                           />
                           {/* 削除ボタン (null チェックを明示的に) */}
                           {cards[index] != null && (
                             <Button
                               variant="destructive" size="icon"
                               className="absolute top-0.5 right-0.5 h-4 w-4 z-20 p-0 pointer-events-auto" // z-20 を追加
                              onClick={(e) => {
                                e.stopPropagation(); // 親要素へのイベント伝播を停止
                                onCardRemove(index);
                                setSelectedCardIndices(prev => prev.filter(i => i !== index));
                              }}
                            > <Trash2 className="h-2.5 w-2.5" /> </Button>
                          )}
                          {/* スロット番号 (削除) */}
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
                       variant="outline"
                       size="icon"
                       onClick={() => setCurrentPageIndex(currentPageIndex - 1)}
                       disabled={currentPageIndex === 0}
                       className="border-gold-500"
                     >
                       <ChevronLeft className="h-4 w-4" />
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent><p>{t("pagination.previous")}</p></TooltipContent>
                 </Tooltip>
               </TooltipProvider>

               <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                 {t("pagination.page")} {currentPageIndex + 1} / {pageCount}
               </span>

               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button
                       variant="outline"
                       size="icon"
                       onClick={() => setCurrentPageIndex(currentPageIndex + 1)}
                       disabled={currentPageIndex === pageCount - 1}
                       className="border-gold-500"
                     >
                       <ChevronRight className="h-4 w-4" />
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent><p>{t("pagination.next")}</p></TooltipContent>
                 </Tooltip>
               </TooltipProvider>

               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button
                       variant="outline"
                       size="icon"
                       onClick={addPage}
                       className="border-gold-500"
                     >
                       <PlusSquare className="h-4 w-4" />
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent><p>{t("pagination.addPage")}</p></TooltipContent>
                 </Tooltip>
               </TooltipProvider>

               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button
                       variant="destructive"
                       size="icon"
                       onClick={deletePage}
                       disabled={pageCount <= 1} // Disable if only one page exists
                     >
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
                 ref={uploadInputRef}
                 type="file"
                 accept="image/*"
                 multiple // Allow multiple file selection
                 className="hidden"
                 onChange={handleUploadFileChange}
               />
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                {/* Upload Area */}
                <div
                  onClick={handleUploadButtonClick}
                  className={cn(
                    "flex flex-col items-center justify-center w-full sm:w-auto sm:flex-1 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                    isProcessingImage ? "opacity-50 cursor-not-allowed" : ""
                  )}
                  style={{ minHeight: '60px' }} // Ensure minimum height
                >
                  <Upload className="h-6 w-6 text-gray-500 dark:text-gray-400 mb-1" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    {selectedCardIndices.length > 1
                      ? `${t("action.clickOrDropToUpload")} (${selectedCardIndices.length} スロット選択中)`
                      : t("action.clickOrDropToUpload")}
                  </span>
                  {/* Optionally show target slot info more explicitly */}
                  {/* {selectedCardIndices.length === 1 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      (スロット {selectedCardIndices[0] + 1} へ)
                    </span>
                  )} */}
                 </div>
 
                 {/* Export Scope Toggle & Export Buttons */}
                 <div className="flex flex-col sm:flex-row items-center justify-end gap-2 w-full sm:w-auto">
                   {/* Export Scope Toggle */}
                   <ToggleGroup
                     type="single"
                     value={exportScope}
                     onValueChange={(value) => {
                       // Ensure the value is one of the allowed types before setting
                       if (value === 'current' || value === 'all') {
                         setExportScope(value);
                       }
                     }}
                     className="border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden h-10" // Added height
                     aria-label="Export Scope"
                   >
                     <ToggleGroupItem value="current" aria-label="Export current page" className="data-[state=on]:bg-gold-100 dark:data-[state=on]:bg-gold-900 data-[state=on]:text-gold-900 dark:data-[state=on]:text-gold-100 px-3 text-xs sm:text-sm h-full"> {/* Added h-full */}
                       {t("export.scope.current")}
                     </ToggleGroupItem>
                     <ToggleGroupItem value="all" aria-label="Export all pages" className="data-[state=on]:bg-gold-100 dark:data-[state=on]:bg-gold-900 data-[state=on]:text-gold-900 dark:data-[state=on]:text-gold-100 px-3 text-xs sm:text-sm h-full"> {/* Added h-full */}
                       {t("export.scope.all")}
                     </ToggleGroupItem>
                   </ToggleGroup>
 
                   {/* Existing Export Buttons */}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
