"use client"

import { useState, useCallback, useMemo } from "react"; // Import useState, useCallback, useMemo
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { Button } from "@/components/ui/button"; // Import Button
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label" // Import Label
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"; // Import ToggleGroup
import { Printer, Download } from "lucide-react"; // Import icons
import { Header } from "@/components/header"
import { Toaster } from "@/components/toaster"
import { useTranslation } from "@/lib/i18n"
import { IntegratedCardEditor } from "@/components/integrated-card-editor"
import { useMobileDetect } from "@/hooks/use-mobile"
import { useToast } from "@/components/ui/use-toast"; // Correct import for the hook
import { CardData, generatePDF, generatePNG, PdfExportOptions, PngExportOptions } from "@/lib/pdf-generator"; // Import CardData and export functions/types
// Removed downloadFile import from utils

const MAX_CARDS_PER_PAGE = 9; // Define max cards per page

// Card dimensions in mm (Consider moving to a shared config or constants file)
const cardDimensions = {
  pokemon: { width: 63, height: 88 },
  yugioh: { width: 59, height: 86 },
};
const a4Width = 210;
const a4Height = 297;

// File download helper function (moved here from integrated-card-editor)
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

export default function CreatePage() {
  const { t } = useTranslation()
  const { toast } = useToast(); // Correct usage with the imported hook

  // --- Settings State ---
  const [cardType, setCardType] = useState<keyof typeof cardDimensions>("pokemon")
  const [spacing, setSpacing] = useState(5)
  const [cmykConversion, setCmykConversion] = useState(false)
  const [cmykMode, setCmykMode] = useState<"simple" | "accurate">("simple")

  // --- Page Management State ---
  const [pages, setPages] = useState<(CardData | null)[][]>([Array(MAX_CARDS_PER_PAGE).fill(null)]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // --- Export State ---
  const [exportQuality, setExportQuality] = useState<"standard" | "high" | "ultra">("high");
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const isMobile = useMobileDetect()

   // Handle card creation or update for the current page
   const handleCardUpdate = (card: CardData, index: number) => { // Use CardData type
    setPages(prevPages => {
      const newPages = [...prevPages];
      const currentPage = [...(newPages[currentPageIndex] || [])]; // Get current page or empty array
      if (index >= 0 && index < MAX_CARDS_PER_PAGE) {
        currentPage[index] = card;
        newPages[currentPageIndex] = currentPage;
      }
      return newPages;
    });
  }

  // Handle card removal for the current page
  const handleCardRemove = (index: number) => {
    setPages(prevPages => {
      const newPages = [...prevPages];
      const currentPage = [...(newPages[currentPageIndex] || [])];
      if (index >= 0 && index < MAX_CARDS_PER_PAGE) {
        currentPage[index] = null;
        newPages[currentPageIndex] = currentPage;
      }
      return newPages;
     });
   }

   // Handle resetting the current page
   const handleResetCurrentPage = () => {
     setPages(prevPages => {
       const newPages = [...prevPages];
       if (newPages[currentPageIndex]) {
         newPages[currentPageIndex] = Array(MAX_CARDS_PER_PAGE).fill(null);
         // toast({ title: t("toast.pageReset"), description: t("toast.pageResetDesc", { page: currentPageIndex + 1 }) });
       }
       return newPages;
     });
   };

   // Handle adding a new page
   const addPage = () => {
     setPages(prevPages => [...prevPages, Array(MAX_CARDS_PER_PAGE).fill(null)]);
      // Switch to the newly added page
      setCurrentPageIndex(pages.length); // Index will be the current length before adding
      // toast({ title: t("toast.pageAdded"), description: t("toast.pageAddedDesc", { page: pages.length + 1 }) });
    };

    // Handle deleting the current page
   const deletePage = () => {
     if (pages.length <= 1) {
       // toast({ title: t("toast.pageDeleteError"), description: t("toast.pageDeleteErrorDesc"), variant: "destructive" });
       return; // Don't delete the last page
     }
     setPages(prevPages => {
       const newPages = prevPages.filter((_, index) => index !== currentPageIndex);
       // Adjust current page index if necessary
        if (currentPageIndex >= newPages.length) {
          setCurrentPageIndex(newPages.length - 1);
        }
        // toast({ title: t("toast.pageDeleted"), description: t("toast.pageDeletedDesc", { page: currentPageIndex + 1 }) });
        return newPages;
      });
   };

   // --- Calculate grid properties for export (memoized) ---
   const { cardsPerRow, cardsPerColumn, marginXMM, marginYMM } = useMemo(() => {
     const { width: cardWidthMM, height: cardHeightMM } = cardDimensions[cardType];
     const effectiveCardWidth = cardWidthMM + spacing;
     const effectiveCardHeight = cardHeightMM + spacing;
     if (effectiveCardWidth <= 0 || effectiveCardHeight <= 0) {
       console.warn("Grid calculation skipped in page: Invalid card dimensions or spacing");
       return { cardsPerRow: 0, cardsPerColumn: 0, marginXMM: 0, marginYMM: 0 };
     }
     const cpr = Math.floor((a4Width + spacing) / effectiveCardWidth);
     const cpc = Math.floor((a4Height + spacing) / effectiveCardHeight);
     const validCpr = Math.max(1, cpr);
     const validCpc = Math.max(1, cpc);
     const gridWidthMM = validCpr > 0 ? validCpr * cardWidthMM + (validCpr - 1) * spacing : 0;
     const gridHeightMM = validCpc > 0 ? validCpc * cardHeightMM + (validCpc - 1) * spacing : 0;
     const mxMM = Math.max(0, (a4Width - gridWidthMM) / 2);
     const myMM = Math.max(0, (a4Height - gridHeightMM) / 2);
     return { cardsPerRow: validCpr, cardsPerColumn: validCpc, marginXMM: mxMM, marginYMM: myMM };
   }, [cardType, spacing]);

   // --- Get DPI for export based on quality ---
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
     setIsExporting(true);
     try {
       const pagesToExport = exportScope === 'all' ? pages : [pages[currentPageIndex]];
       const { width: cardWidthMM, height: cardHeightMM } = cardDimensions[cardType];
       const exportDimensions = { a4Width, a4Height, cardWidth: cardWidthMM, cardHeight: cardHeightMM, marginX: marginXMM, marginY: marginYMM, cardsPerRow, cardsPerColumn };
       const exportDpi = getDpiForQuality();

       if (exportScope === 'all') {
         // toast({ title: t("toast.exportingAllTitle"), description: t("toast.exportingAllDescPdf") });
       } else if (exportQuality === "ultra") {
         // toast({ title: "高品質出力処理中", description: "高解像度PDFの生成には時間がかかる場合があります。" });
       }

       const options: PdfExportOptions = {
         pages: pagesToExport.map(page => page || []), // Ensure page is not undefined
         spacing, cardType: cardType as string, cmykConversion, cmykMode,
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
     // PNG export currently only supports the current page
     if (exportScope === 'all') {
       // toast({ title: t("toast.notImplementedTitle"), description: t("toast.notImplementedDescAllPagesPng"), variant: "default" });
       return;
     }
     setIsExporting(true);
     try {
       if (exportQuality === "ultra") {
         // toast({ title: "高品質出力処理中", description: "高解像度PNGの生成には時間がかかる場合があります。" });
       }
       const currentPageCards = pages[currentPageIndex] || [];
       const validCards = currentPageCards.filter((card): card is CardData => card !== null);
       const { width: cardWidthMM, height: cardHeightMM } = cardDimensions[cardType];
       const exportDimensions = { a4Width, a4Height, cardWidth: cardWidthMM, cardHeight: cardHeightMM, marginX: marginXMM, marginY: marginYMM, cardsPerRow, cardsPerColumn };
       const exportDpi = getDpiForQuality();

       const options: PngExportOptions = {
         cards: validCards,
         spacing, cardType: cardType as string, cmykConversion, cmykMode,
         dpi: exportDpi,
         // Note: PNG generation in page.tsx doesn't have direct canvas access.
         // The pdf-generator might need adjustment or a different approach for high-quality PNG without canvas.
         // For now, we pass null or handle it within generatePNG.
         // canvas: null, // Pass null as canvas is not directly available here - Type error, pdf-generator needs update if canvas is required
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

   const handlePrint = async () => {
     if (isPrinting || isExporting) return;
     setIsPrinting(true);
     // toast({ title: "印刷準備中", description: "高品質な印刷用データを生成しています..." });

     let printFrame: HTMLIFrameElement | null = null;
     let pdfUrl: string | null = null;

     try {
       const pagesToPrint = exportScope === 'all' ? pages : [pages[currentPageIndex]];
       const { width: cardWidthMM, height: cardHeightMM } = cardDimensions[cardType];
       const printDimensions = { a4Width, a4Height, cardWidth: cardWidthMM, cardHeight: cardHeightMM, marginX: marginXMM, marginY: marginYMM, cardsPerRow, cardsPerColumn };
       const printDpi = getDpiForQuality();

       const options: PdfExportOptions = {
         pages: pagesToPrint.map(page => page || []), // Ensure page is not undefined
         spacing, cardType: cardType as string, cmykConversion, cmykMode,
         dpi: printDpi,
         dimensions: printDimensions,
       };

       const pdfBlob = await generatePDF(options);
       pdfUrl = URL.createObjectURL(pdfBlob);

       printFrame = document.createElement('iframe');
       printFrame.style.position = 'absolute'; printFrame.style.width = '0'; printFrame.style.height = '0';
       printFrame.style.border = '0'; printFrame.style.visibility = 'hidden';
       printFrame.src = pdfUrl;

       const handleLoad = () => {
         try {
           if (printFrame?.contentWindow) {
             printFrame.contentWindow.focus();
             printFrame.contentWindow.print();
             setIsPrinting(false);
             // toast({ title: "印刷準備完了", description: "印刷ダイアログが表示されました。" });
             // No automatic cleanup here due to modal print dialog
           } else { throw new Error("印刷フレームのコンテンツが見つかりません。"); }
         } catch (printError) {
           console.error("Printing failed:", printError);
           // toast({ title: "印刷エラー", description: `印刷の実行に失敗しました: ${printError instanceof Error ? printError.message : t("toast.unknownError")}`, variant: "destructive" });
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
       if (printFrame && printFrame.parentNode) document.body.removeChild(printFrame);
       if (pdfUrl) URL.revokeObjectURL(pdfUrl);
       setIsPrinting(false);
     }
   };
   // --- End Export Handlers ---

   return (
     <div className="flex min-h-screen flex-col">
       <Header />
      {/* Added pt-16 to account for sticky header height */}
      <div className="container mx-auto p-4 pt-16 max-w-7xl flex-1">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{t("create.title")}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Panel - Left Side */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-gold-500"> {/* Added gold border */}
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">{t("create.settings.title")}</h2>

                 <div className="space-y-4">
                   <div>
                     <Label htmlFor="card-type">{t("settings.cardType")}</Label>
                     <Select value={cardType} onValueChange={(value) => setCardType(value as keyof typeof cardDimensions)}> {/* Correctly cast value */}
                       <SelectTrigger id="card-type">
                         <SelectValue placeholder={t("settings.cardType")} />
                       </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pokemon">{t("card.pokemon")}</SelectItem>
                        <SelectItem value="yugioh">{t("card.yugioh")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Moved Quality setting here */}
                  <div>
                    <Label htmlFor="export-quality">{t("settings.quality")}</Label> {/* Use translation key */}
                    <Select value={exportQuality} onValueChange={(value) => setExportQuality(value as any)}>
                      <SelectTrigger id="export-quality">
                        <SelectValue placeholder={t("settings.quality")} /> {/* Use translation key for placeholder */}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (300 DPI)</SelectItem>
                        <SelectItem value="high">High (450 DPI)</SelectItem>
                        <SelectItem value="ultra">Ultra (600 DPI)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="spacing-slider">{t("settings.spacing")}</Label>
                    <Slider
                      id="spacing-slider"
                      min={0}
                      max={20}
                      step={1}
                      value={[spacing]}
                      onValueChange={(value) => setSpacing(value[0])}
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">{spacing}mm</p>
                  </div>

                  <div className="flex items-center justify-between">
                     <Label htmlFor="cmyk-switch">{t("settings.cmyk")}</Label>
                     <Switch id="cmyk-switch" checked={cmykConversion} onCheckedChange={setCmykConversion} />
                   </div>

                   {/* CMYK Mode Selection (only if CMYK is enabled) */}
                   {cmykConversion && (
                     <div>
                       <Label htmlFor="cmyk-mode">{t("settings.cmykMode")}</Label>
                       <Select value={cmykMode} onValueChange={(value) => setCmykMode(value as any)}>
                         <SelectTrigger id="cmyk-mode">
                           <SelectValue placeholder={t("settings.cmykMode")} />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="simple">{t("cmykMode.simple")}</SelectItem>
                           <SelectItem value="accurate">{t("cmykMode.accurate")}</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   )}
                   {/* --- Settings Summary (Moved Inside) --- */}
                   <hr className="my-4 border-gold-500/50" /> {/* Separator line */}
                   <div className="text-sm text-muted-foreground space-y-1"> {/* Added space-y-1 */}
                     <p>• {t("layout.info.cardType")}: {cardType === "pokemon" ? t("card.pokemon") : t("card.yugioh")}</p>
                     <p>• {t("layout.info.spacing")}: {spacing}mm</p>
                     <p>• {t("layout.info.cmyk")}: {cmykConversion ? t("enabled") : t("disabled")}</p>
                     <p>• {t("settings.quality")}: {t(`quality.${exportQuality}`)} {/* 品質表示を追加 */}</p>
                     {/* CMYKモードのサマリー表示を追加 */}
                     {cmykConversion && (
                       <p>• {t("settings.cmykMode")}: {t(`cmykMode.${cmykMode}`)}</p>
                     )}
                   </div>
                   {/* --- End Settings Summary --- */}
                 </div> {/* This closes the inner space-y-4 div */}
               </CardContent>
             </Card>
             {/* The external summary div and incorrect closing tags are removed */}

             {/* --- Export/Print Controls --- */}
       <Card className="border-gold-500 mt-6"> {/* Added gold border and margin */}
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">{t("export.title")}</h2>
                  <div className="space-y-4">
                    {/* Export Scope Toggle */}
                    <div>
                      <Label htmlFor="export-scope">{t("export.scope")}</Label>
                      <ToggleGroup
                        id="export-scope"
                        type="single"
                        value={exportScope}
                        onValueChange={(value) => { if (value) setExportScope(value as 'current' | 'all'); }}
                        className="mt-1 grid grid-cols-2 gap-2"
                        disabled={isExporting || isPrinting}
                      >
                        <ToggleGroupItem value="current" aria-label={t("export.scopeCurrent")}>
                          {t("export.scopeCurrent")}
                        </ToggleGroupItem>
                        <ToggleGroupItem value="all" aria-label={t("export.scopeAll")}>
                          {t("export.scopeAll")}
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    {/* Export Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button
                        onClick={handleExportPDF}
                        disabled={isExporting || isPrinting}
                        className="w-full border-gold-500" // Added gold border
                      >
                        <Download className="mr-2 h-4 w-4" /> PDF
                      </Button>
                      <Button
                        onClick={handleExportPNG}
                        disabled={isExporting || isPrinting || exportScope === 'all'} // Disable PNG for 'all' scope for now
                        className="w-full border-gold-500" // Added gold border
                      >
                        <Download className="mr-2 h-4 w-4" /> PNG
                      </Button>
                      <Button
                        onClick={handlePrint}
                        disabled={isExporting || isPrinting}
                        className="w-full border-gold-500" // Added gold border
                      >
                        <Printer className="mr-2 h-4 w-4" /> {t("action.print")}
                      </Button>
                    </div>
                    {(isExporting || isPrinting) && (
                      <p className="text-sm text-muted-foreground text-center animate-pulse">
                        {isPrinting ? t("status.printing") : t("status.exporting")}...
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* --- End Export/Print Controls --- */}

            </div>

            {/* Integrated Card Editor - Right Side */}
            <div className="lg:col-span-3">
            <IntegratedCardEditor
              cardType={cardType}
              spacing={spacing}
              cmykConversion={cmykConversion}
              // Pass the cards for the current page
              cards={pages[currentPageIndex] || []} // Ensure fallback to empty array
              onCardUpdate={handleCardUpdate}
              onCardRemove={handleCardRemove}
              // Pass the reset function for the current page
              onResetCards={handleResetCurrentPage} // Rename prop for clarity? Or keep as is? Let's keep for now.
              // Removed exportQuality, cmykMode, allPages, exportScope, setExportScope props
              // Pass page-related props
              currentPageIndex={currentPageIndex}
              pageCount={pages.length}
              setCurrentPageIndex={setCurrentPageIndex}
              addPage={addPage}
              deletePage={deletePage}
               // Pass all pages for potential multi-page export (if needed later) - Re-added for context, but IntegratedCardEditor won't use it directly for export buttons
               allPages={pages}
             />

             {/* --- Export/Print Controls (Moved Here) --- */}
             <Card className="border-gold-500 mt-6"> {/* Added gold border and margin */}
               <CardContent className="p-6">
                 <h2 className="text-xl font-semibold mb-4">{t("export.title")}</h2>
                 <div className="space-y-4">
                   {/* Export Scope Toggle */}
                   <div>
                     <Label htmlFor="export-scope">{t("export.scope")}</Label>
                     <ToggleGroup
                       id="export-scope"
                       type="single"
                       value={exportScope}
                       onValueChange={(value) => { if (value) setExportScope(value as 'current' | 'all'); }}
                       className="mt-1 grid grid-cols-2 gap-2"
                       disabled={isExporting || isPrinting}
                     >
                       <ToggleGroupItem value="current" aria-label={t("export.scopeCurrent")}>
                         {t("export.scopeCurrent")}
                       </ToggleGroupItem>
                       <ToggleGroupItem value="all" aria-label={t("export.scopeAll")}>
                         {t("export.scopeAll")}
                       </ToggleGroupItem>
                     </ToggleGroup>
                   </div>

                   {/* Export Buttons */}
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                     <Button
                       onClick={handleExportPDF}
                       disabled={isExporting || isPrinting}
                       className="w-full border-gold-500" // Added gold border
                     >
                       <Download className="mr-2 h-4 w-4" /> PDF
                     </Button>
                     <Button
                       onClick={handleExportPNG}
                       disabled={isExporting || isPrinting || exportScope === 'all'} // Disable PNG for 'all' scope for now
                       className="w-full border-gold-500" // Added gold border
                     >
                       <Download className="mr-2 h-4 w-4" /> PNG
                     </Button>
                     <Button
                       onClick={handlePrint}
                       disabled={isExporting || isPrinting}
                       className="w-full border-gold-500" // Added gold border
                     >
                       <Printer className="mr-2 h-4 w-4" /> {t("action.print")}
                     </Button>
                   </div>
                   {(isExporting || isPrinting) && (
                     <p className="text-sm text-muted-foreground text-center animate-pulse">
                       {isPrinting ? t("status.printing") : t("status.exporting")}...
                     </p>
                   )}
                 </div>
               </CardContent>
             </Card>
             {/* --- End Export/Print Controls --- */}

           </div>
         </div>
      </div>
      <Toaster />
    </div>
  )
}
