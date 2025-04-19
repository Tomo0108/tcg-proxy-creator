"use client"

import Link from "next/link"
import { usePathname } from "next/navigation" // Import usePathname
import { useTranslation } from "@/lib/i18n"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
import { cn } from "@/lib/utils" // Assuming you have a cn utility

export function Header() {
  const { t } = useTranslation()
  const pathname = usePathname() // Get current pathname

  const navItems = [
    { href: "/", label: t("nav.home") },
    { href: "/create", label: t("nav.create") },
  ]

  return (
    <header className="border-b">
      {/* Adjust layout: Logo on left, Nav + Controls on right */}
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Apply Gkktt font to the logo */}
        <Link href="/" className="text-lg font-semibold font-['Gkktt']">
          {t("app.title")}
        </Link>

        {/* Group Nav and Controls together */}
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors flex items-center gap-1.5", // Added flex and gap
                    isActive
                      ? "text-primary" // Use primary color for active link (assuming accent is primary)
                      : "text-muted-foreground hover:text-foreground" // Adjusted non-active colors
                  )}
                >
                  {/* Add indicator dot if active */}
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  )
}
