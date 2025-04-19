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
    { href: "/", label: t("nav.home") },
    { href: "/create", label: t("nav.create") },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-b-gold-500 bg-background">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold font-['Gkktt']">
          <Image
            src="/logo/proxy_creator_logo.png"
            alt="TCG Proxy Creator Logo"
            width={40}
            height={40}
            className="h-10 w-10"
          />
          {t("app.title")}
        </Link>

        {/* Desktop Nav and Controls */}
        <div className="hidden md:flex items-center gap-6"> {/* デスクトップでのみ表示 */}
          <nav className="flex items-center space-x-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors flex items-center gap-1.5",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
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

        {/* Mobile Menu Button */}
        <div className="md:hidden"> {/* モバイルでのみ表示 */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right"> {/* 右から表示 */}
              <SheetHeader>
                <SheetTitle>{t("nav.menu")}</SheetTitle>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                {/* Mobile Nav Links */}
                <nav className="grid gap-2">
                  {navItems.map((item) => (
                     <SheetClose asChild key={item.href}> {/* リンククリックで閉じる */}
                       <Link
                         href={item.href}
                         className={cn(
                           "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                           pathname === item.href
                             ? "bg-accent text-accent-foreground" // アクティブ時のスタイル
                             : "text-muted-foreground hover:bg-accent hover:text-accent-foreground" // 非アクティブ時のスタイル
                         )}
                         onClick={() => setIsMenuOpen(false)} // 念のためクリックでも閉じる
                       >
                         {item.label}
                       </Link>
                     </SheetClose>
                  ))}
                </nav>
                {/* Mobile Controls */}
                <div className="mt-4 border-t pt-4 grid gap-6"> {/* gap-6 に変更 */}
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-medium">{t("settings.theme")}</span> {/* text-muted-foreground を削除 */}
                     <ThemeToggle />
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-medium">{t("settings.language")}</span> {/* text-muted-foreground を削除 */}
                     <LanguageSwitcher />
                   </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
