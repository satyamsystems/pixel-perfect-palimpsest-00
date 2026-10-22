import { Laptop, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ThemeMode = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("system");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as ThemeMode) || "system";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function applyTheme(mode: ThemeMode) {
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else if (mode === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // System mode
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }

  function handleSelect(mode: ThemeMode) {
    setTheme(mode);
    localStorage.setItem("theme", mode);
    applyTheme(mode);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Theme setting: currently ${theme}`}
          className="grid h-10 w-10 place-items-center rounded-xl border bg-card text-foreground transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {theme === "dark" ? (
            <Moon className="h-4 w-4" />
          ) : theme === "light" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Laptop className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-xl border bg-card p-1 shadow-soft">
        <DropdownMenuItem
          onClick={() => handleSelect("light")}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium cursor-pointer"
        >
          <Sun className="h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSelect("dark")}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium cursor-pointer"
        >
          <Moon className="h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSelect("system")}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium cursor-pointer"
        >
          <Laptop className="h-4 w-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
