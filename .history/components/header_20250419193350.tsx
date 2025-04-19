"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, Home, PlusSquare, Sun, Moon } from "lucide-react" // Sun, Moon を追加
import { useTheme } from "next-themes" // useTheme を追加
import { useTranslation } from "@/lib/i18n"
// import { ThemeToggle } from "@/components/theme-toggle" // ThemeToggle を削除
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export function Header() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme(); // useTheme を使用

  // アイコン付きナビゲーションアイテム
  const navItems = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/create", label: t("nav.create"), icon: PlusSquare },
  ]

  // ロゴクリック時の処理
  const handleLogoClick = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  return (
    // Add 'dark' class to force dark mode styles for the header
    <header className="sticky top-0 z-50 w-full border-b border-b-gold-500 bg-background dark">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          // Add text-foreground to ensure white text even in light mode (due to parent 'dark' class)
          className="flex items-center gap-2 text-xl font-semibold font-['Gkktt'] text-foreground"
          onClick={handleLogoClick}
          // Update text-shadow for a sharp, darker gold outline (gold-700: #856f00)
          style={{ textShadow: "1px 1px 0 #856f00, -1px 1px 0 #856f00, 1px -1px 0 #856f00, -1px -1px 0 #856f00" }}
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
          {/* デスクトップ用テーマボタン */}
          <div className="flex items-center gap-2"> {/* gap-2 に変更 */}
             <Button
               variant="ghost" // 常に ghost に変更
               size="icon"
               onClick={() => setTheme('light')}
               aria-label="Set light theme"
               className={cn(
                 "flex items-center gap-1.5 text-foreground", // Use flex, gap
                 theme === 'light' ? 'opacity-100' : 'opacity-60 hover:opacity-100'
               )}
             >
               {theme === 'light' && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
               <Sun className="h-[1.2rem] w-[1.2rem]" />
             </Button>
             <Button
               variant="ghost" // 常に ghost に変更
               size="icon"
               onClick={() => setTheme('dark')}
               aria-label="Set dark theme"
               className={cn(
                 "flex items-center gap-1.5 text-foreground", // Use flex, gap
                 theme === 'dark' ? 'opacity-100' : 'opacity-60 hover:opacity-100'
               )}
             >
               {theme === 'dark' && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
               <Moon className="h-[1.2rem] w-[1.2rem]" />
             </Button>
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
            <SheetContent side="right" className="flex flex-col pt-8">
              <SheetHeader className="text-left">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              {/* メニュー内容 */}
              <div className="flex flex-1 flex-col gap-4 py-4">
                {/* Mobile Nav Links */}
                <nav className="grid gap-2">
                  {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium",
                          pathname === item.href
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                  ))}
                </nav>

                <Separator className="my-2 bg-gold-500 h-[1px]" />

                {/* Mobile Controls */}
                <div className="grid gap-6">
                   {/* モバイル用テーマボタン */}
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-medium">Mode</span>
                     <div className="flex items-center gap-2"> {/* ボタンをグループ化 */}
                       <Button
                         variant="ghost" // 常に ghost に変更
                         size="icon"
                         onClick={() => { setTheme('light'); setIsMenuOpen(false); }} // メニューも閉じる
                         aria-label="Set light theme"
                         className={cn(
                           "flex items-center gap-1.5 text-foreground", // Use flex, gap
                           theme === 'light' ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                         )}
                       >
                         <Sun className="h-[1.2rem] w-[1.2rem]" />
                         {theme === 'light' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary"></span>}
                       </Button>
                       <Button
                         variant="ghost" // 常に ghost に変更
                         size="icon"
                         onClick={() => { setTheme('dark'); setIsMenuOpen(false); }} // メニューも閉じる
                         aria-label="Set dark theme"
                         className={cn(
                           "relative text-foreground", // Add relative positioning
                           theme === 'dark' ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                         )}
                       >
                         <Moon className="h-[1.2rem] w-[1.2rem]" />
                         {theme === 'dark' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary"></span>}
                       </Button>
                     </div>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-medium">Language</span>
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
