"use client"

import { useState } from "react" // 追加
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react" // 追加
import { useTranslation } from "@/lib/i18n"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button" // 追加
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose, // 追加
} from "@/components/ui/sheet" // 追加
import { cn } from "@/lib/utils"

export function Header() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 追加: メニュー開閉状態

  const navItems = [
            alt="TCG Proxy Creator Logo"
            width={40} // Reverted width to 40
            height={40} // Reverted height to 40
            className="h-10 w-10" // Reverted size to h-10 w-10
          />
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
