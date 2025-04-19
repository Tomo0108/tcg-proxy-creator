"use client";

import { MoonIcon, SunIcon } from "lucide-react"; // Use specific icons from lucide-react
import { useTheme } from "next-themes";
import { useEffect, useState } from "react"; // Use standard React imports
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  // Include systemTheme for accurate theme detection
  const { theme, systemTheme, setTheme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a placeholder or null on the server and initial client render
    // to avoid hydration mismatch. Adjust size/styling as needed.
    return <Button variant="outline" size="icon" disabled className="border-gold-500" aria-label="Toggle theme" />;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="border-gold-500 flex items-center justify-center gap-1" // flex, items-center, justify-center, gap-1 を追加
    >
      {/* 常に両方のアイコンを表示し、テーマによる切り替えクラスを削除 */}
      <Sun className="h-[0.9rem] w-[0.9rem]" /> {/* サイズを少し小さく調整 */}
      <Moon className="h-[0.9rem] w-[0.9rem]" /> {/* サイズを少し小さく調整 */}
      {/* 元のアイコン切り替えロジックは削除 */}
      {/* <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" /> */}
      {/* <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" /> */}
    </Button>
  )
}
