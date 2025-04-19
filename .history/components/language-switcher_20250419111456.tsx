"use client"

import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils" // Import cn utility

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline" // Always use outline variant
        size="default" // Use default size (h-10)
        onClick={() => setLocale("en")}
        className={cn(
          locale === "en" && "bg-gold-500 hover:bg-gold-600 text-primary-foreground" // Apply active styles conditionally
        )}
      >
        English
      </Button>
      <Button
        variant="outline" // Always use outline variant
        size="default" // Use default size (h-10)
        onClick={() => setLocale("ja")}
        className={cn(
          locale === "ja" && "bg-gold-500 hover:bg-gold-600 text-primary-foreground" // Apply active styles conditionally
        )}
      >
        日本語
      </Button>
    </div>
  )
}
