"use client"

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-1 xl:gap-2 exl:gap-4">
      <Button
        disabled={theme == "light"}
        onClick={() => setTheme("light")}
        variant="ghost"
        size="icon"
        className="round"
      >
        <Sun className="h-4 xl:h-6 exl:h-10" />
      </Button>
      <Button
        disabled={theme == "dark"}
        onClick={() => setTheme("dark")}
        variant="ghost"
        size="icon"
        className="round"
      >
        <Moon className="h-4 xl:h-6 exl:h-10" />
      </Button>
    </div>
  );
}
