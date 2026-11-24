"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { isLightOnlyPath } from "@/lib/theme/light-only";


/** Light by default; dark or the system setting can be chosen in Settings and is kept in this browser. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      forcedTheme={isLightOnlyPath(pathname) ? "light" : undefined}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
