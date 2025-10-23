"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isLight = theme === "light";
  const isDark = theme === "dark";

  return (
    <div className="flex gap-1 xl:gap-2">
      <Button
        onClick={() => setTheme("light")}
        variant="ghost"
        size="icon"
        title="Tema Claro"
        className={isLight ? "bg-gray-200 dark:bg-gray-700" : ""}
      >
        <Sun className={`h-5 w-5 ${isLight ? "text-yellow-500" : "text-gray-500"}`} />
      </Button>
      <Button
        onClick={() => setTheme("dark")}
        variant="ghost"
        size="icon"
        title="Tema Escuro"
        className={isDark ? "bg-gray-200 dark:bg-gray-700" : ""}
      >
        <Moon className={`h-5 w-5 ${isDark ? "text-blue-400" : "text-gray-500"}`} />
      </Button>
    </div>
  );
}
