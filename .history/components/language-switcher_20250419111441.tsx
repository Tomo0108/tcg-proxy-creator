"use client"

import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils" // Import cn utility

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={locale === "en" ? "default" : "outline"}
        size="default" // Use default size (h-10)
        onClick={() => setLocale("en")}
        className={cn(
          // "h-10", // Remove explicit height, rely on size="default"
          locale === "en" ? "bg-gold-500 hover:bg-gold-600" : ""
        )}
      >
        English
      </Button>
      <Button
        variant={locale === "ja" ? "default" : "outline"}
        size="default" // Use default size (h-10)
        onClick={() => setLocale("ja")}
        className={cn(
          // "h-10", // Remove explicit height, rely on size="default"
          locale === "ja" ? "bg-gold-500 hover:bg-gold-600" : ""
        )}
      >
        日本語
      </Button>
    </div>
  )
}
