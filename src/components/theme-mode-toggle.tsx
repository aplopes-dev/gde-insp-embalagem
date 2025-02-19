"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeModeToggle() {
  const { theme, setTheme } = useTheme();
  const [enabledTheme, setEnabledTheme] = useState("light");

  useEffect(() => {
    setEnabledTheme(theme || "light")
  }, [theme]);

  return (
    <div className="flex gap-1 xl:gap-2 exl:gap-4">
      <Button
        disabled={enabledTheme == "light"}
        onClick={() => setTheme("light")}
        variant="ghost"
        size="icon"
        className="round"
      >
        <Sun className="h-4 xl:h-6 exl:h-10" />
      </Button>
      <Button
        disabled={enabledTheme == "dark"}
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
