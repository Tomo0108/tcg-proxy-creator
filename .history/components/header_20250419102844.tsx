"use client"

import Link from "next/link"
import { useTranslation } from "@/lib/i18n"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"

export function Header() {
  const { t } = useTranslation()

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        {/* Apply Gkktt font to the logo */}
        <Link href="/" className="text-lg font-semibold font-['Gkktt']">
          {t("app.title")}
        </Link>
        <nav className="ml-6 hidden md:flex items-center space-x-4">
          <Link href="/" className="text-sm font-medium hover:text-gold-500 transition-colors">
            {t("nav.home")}
          </Link>
          <Link href="/create" className="text-sm font-medium hover:text-gold-500 transition-colors">
            {t("nav.create")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  )
}
