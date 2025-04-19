"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button"; // Assuming Button is still needed

export function ThemeToggle() {
  // ―― 1) まず「マウント済みか」を持つ
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Note: The feedback uses `theme` directly, but since enableSystem is false,
  // `theme` should reliably be 'light' or 'dark' after mount.
  // Keeping the original logic that used systemTheme might be redundant now,
  // but let's stick to the feedback's simpler `theme === 'dark'` check for now.
  const { theme, setTheme } = useTheme();

  // ―― 2) マウント前は *必ず同じ要素* を返す
  if (!mounted) {
    return (
      <Button
        variant="outline" // Keep variant/size if desired
        size="icon"
        aria-label="Toggle theme"
        // Apply suggested classes, potentially merging with existing ones if needed
        className="justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none border-gold-500" // Merged classes
        suppressHydrationWarning // ← 警告だけ抑制
        disabled // Disable button during placeholder state
      >
        {/* ここは span など “絶対に変わらない静的要素” */}
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
      </Button>
    );
  }

  // ―― 3) マウント後は本来の SVG
  const isDark = theme === "dark"; // Simplified check as per feedback example
  return (
    <Button
      variant="outline" // Keep variant/size
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Set ${isDark ? "light" : "dark"} theme`}
      // Apply suggested classes, potentially merging
      className="justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none border-gold-500" // Merged classes
    >
      {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </Button>
  );
}
