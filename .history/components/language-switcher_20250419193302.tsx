"use client"

import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils" // Import cn utility

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()

  return (
    <div className="flex items-center gap-1"> {/* Adjust gap if needed */}
      <Button
        variant="ghost" // Change to ghost variant
        size="sm" // Adjust size to better match icon buttons if needed (sm: h-9, default: h-10)
         onClick={() => setLocale("en")}
         className={cn(
           "relative text-sm text-foreground", // Add relative positioning
           locale === "en" ? "opacity-100" : "opacity-60 hover:opacity-100" // Use opacity for active state
         )}
       >
         EN
         {locale === 'en' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary"></span>}
      </Button>
      <Button
        variant="ghost" // Change to ghost variant
        size="sm" // Adjust size
         onClick={() => setLocale("ja")}
         className={cn(
           "relative text-sm text-foreground", // Add relative positioning
           locale === "ja" ? "opacity-100" : "opacity-60 hover:opacity-100" // Use opacity for active state
         )}
       >
         JA
         {locale === 'ja' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary"></span>}
      </Button>
    </div>
  )
}
