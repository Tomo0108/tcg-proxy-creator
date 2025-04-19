"use client"

import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={locale === "en" ? "default" : "outline"}
        // size="sm" // Remove size="sm"
        onClick={() => setLocale("en")}
        className={cn(
          "h-10", // Add h-10 for consistent height
          locale === "en" ? "bg-gold-500 hover:bg-gold-600" : ""
        )}
      >
        English
      </Button>
      <Button
        variant={locale === "ja" ? "default" : "outline"}
        // size="sm" // Remove size="sm"
        onClick={() => setLocale("ja")}
        className={cn(
          "h-10", // Add h-10 for consistent height
          locale === "ja" ? "bg-gold-500 hover:bg-gold-600" : ""
        )}
      >
        日本語
      </Button>
    </div>
  )
}
