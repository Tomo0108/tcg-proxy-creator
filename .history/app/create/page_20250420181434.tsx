"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/header"
import { Toaster } from "@/components/toaster"
import { useTranslation } from "@/lib/i18n"
import { IntegratedCardEditor } from "@/components/integrated-card-editor"
import { useMobileDetect } from "@/hooks/use-mobile"
import { toast } from "@/components/ui/use-toast" // Import toast

// Define CardData interface (adjust based on actual card data structure)
interface CardData {
  image: string;
  scale: number;
  type: string;
  originalSize: { width: number; height: number };
  position: { x: number; y: number };
}

const MAX_CARDS_PER_PAGE = 9; // Define max cards per page

export default function CreatePage() {
  const { t } = useTranslation()
  const [cardType, setCardType] = useState("pokemon")
  const [spacing, setSpacing] = useState(5)
   const [cmykConversion, setCmykConversion] = useState(false) // Default to false
   const [cmykMode, setCmykMode] = useState<"simple" | "accurate">("simple") // Add CMYK mode state
   // Change 'cards' state to 'pages' state (array of pages, each page is an array of cards)
   const [pages, setPages] = useState<(CardData | null)[][]>([Array(MAX_CARDS_PER_PAGE).fill(null)]);
   // Add state for the currently selected page index
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [exportQuality, setExportQuality] = useState<"standard" | "high" | "ultra">("high") // Add exportQuality state
    const [exportScope, setExportScope] = useState<'current' | 'all'>('current'); // Add state for export scope
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
       toast({ title: t("toast.pageDeleteError"), description: t("toast.pageDeleteErrorDesc"), variant: "destructive" });
       return; // Don't delete the last page
     }
     setPages(prevPages => {
       const newPages = prevPages.filter((_, index) => index !== currentPageIndex);
       // Adjust current page index if necessary
       if (currentPageIndex >= newPages.length) {
         setCurrentPageIndex(newPages.length - 1);
       }
       toast({ title: t("toast.pageDeleted"), description: t("toast.pageDeletedDesc", { page: currentPageIndex + 1 }) });
       return newPages;
     });
   };

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
                    <Select value={cardType} onValueChange={setCardType}>
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
