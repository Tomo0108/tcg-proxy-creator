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
import { toast } from "@/components/ui/use-toast"
import { CardData, generatePDF, generatePNG, PdfExportOptions, PngExportOptions } from "@/lib/pdf-generator"; // Import CardData and export functions/types
import { downloadFile } from "@/lib/utils"; // Import downloadFile

const MAX_CARDS_PER_PAGE = 9; // Define max cards per page

// Card dimensions in mm (Consider moving to a shared config or constants file)
const cardDimensions = {
  pokemon: { width: 63, height: 88 },
  yugioh: { width: 59, height: 86 },
};
const a4Width = 210;
const a4Height = 297;


export default function CreatePage() {
  const { t } = useTranslation()
  const { toast } = useToast(); // Initialize useToast

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
       return { cardsPerRow: 0, cardsPerColumn: 0, marginXMM: 0, marginYMM: 0 };
     }
     const cpr = Math.floor((a4Width + spacing) / effectiveCardWidth);
     const cpc = Math.floor((a4Height + spacing) / effectiveCardHeight);
     const validCpr = Math.max(1, cpr);
     const validCpc = Math.max(1, cpc);
     const gridWidthMM = validCpr * cardWidthMM + (validCpr - 1) * spacing;
     const gridHeightMM = validCpc * cardHeightMM + (validCpc - 1) * spacing;
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
                 </div>
               </CardContent>
             </Card>

            <div className="text-sm text-muted-foreground">
              <p>
                • {t("layout.info.cardType")}: {cardType === "pokemon" ? t("card.pokemon") : t("card.yugioh")}
              </p>
              <p>
                • {t("layout.info.spacing")}: {spacing}mm
              </p>
              <p>
                • {t("layout.info.cmyk")}: {cmykConversion ? t("enabled") : t("disabled")}
              </p>
               <p>
                 • {t("settings.quality")}: {t(`quality.${exportQuality}`)} {/* 品質表示を追加 */}
               </p>
               {/* CMYKモードのサマリー表示を追加 */}
               {cmykConversion && (
                 <p>
                   • {t("settings.cmykMode")}: {t(`cmykMode.${cmykMode}`)}
                 </p>
               )}
             </div>
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
              exportQuality={exportQuality}
              cmykMode={cmykMode}
              // Pass page-related props
              currentPageIndex={currentPageIndex}
              pageCount={pages.length}
              setCurrentPageIndex={setCurrentPageIndex}
              addPage={addPage}
              deletePage={deletePage}
               // Pass all pages for potential multi-page export (if needed later)
               allPages={pages}
               // Pass export scope state and setter
               exportScope={exportScope}
               setExportScope={setExportScope}
               />
            </div>
          </div>
      </div>
      <Toaster />
    </div>
  )
}
