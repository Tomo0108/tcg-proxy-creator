"use client";

import { MoonIcon, SunIcon } from "lucide-react"; // Use specific icons from lucide-react
import { useTheme } from "next-themes";
import { useEffect, useState } from "react"; // Use standard React imports
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  // Include systemTheme for accurate theme detection
  const { theme, systemTheme, setTheme } = useTheme();

  // useEffect only runs on the client, ensuring mounted state is accurate client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Before component mounts, render a placeholder to match server render
  if (!mounted) {
    // Using Button for consistency, adding placeholder styling
    return (
      <Button
        variant="outline"
        size="icon"
        disabled
        // Keep potentially relevant existing classes like border-gold-500 if needed
        className="border-gold-500"
        aria-label="Toggle theme (loading)"
        suppressHydrationWarning // Recommended for potential minor mismatches during loading
      >
        {/* Placeholder visual */}
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      </Button>
    );
  }

  // After mounting, determine the actual theme (considering 'system' preference)
  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  // Render the actual toggle button with the correct icon
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Set ${isDark ? "light" : "dark"} theme`}
      // Keep potentially relevant existing classes
      className="border-gold-500"
    >
      {/* Conditionally render the correct icon based on the current theme */}
      {isDark ? (
        <SunIcon className="h-5 w-5" /> // Use suggested icons and size
      ) : (
        <MoonIcon className="h-5 w-5" /> // Use suggested icons and size
      )}
    </Button>
  );
}
