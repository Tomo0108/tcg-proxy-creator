"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, Home, PlusSquare, X } from "lucide-react" // Home, PlusSquare, X を追加
import { useTranslation } from "@/lib/i18n"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose, // SheetClose を再度インポート
} from "@/components/ui/sheet"

export function Header() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: t("nav.home") },
    { href: "/create", label: t("nav.create") },
  ]

  // ロゴクリック時の処理
  const handleLogoClick = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false); // メニューが開いていれば閉じる
    }
    // Next.jsのLinkはデフォルトでスクロールトップするので、通常は不要
    // window.scrollTo(0, 0);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-b-gold-500 bg-background">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-semibold font-['Gkktt']"
          onClick={handleLogoClick} // onClickイベントハンドラを追加
        >
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
        <div className="hidden md:flex items-center gap-6">
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
        <div className="md:hidden">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>{t("nav.menu")}</SheetTitle>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                {/* Mobile Nav Links */}
                <nav className="grid gap-2">
                  {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                          pathname === item.href
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                  ))}
                </nav>
                {/* Mobile Controls */}
                <div className="mt-4 border-t pt-4 grid gap-6">
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-medium">{t("settings.theme")}</span>
                     <ThemeToggle />
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-medium">{t("settings.language")}</span>
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
