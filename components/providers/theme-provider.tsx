"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { isLightOnlyPath } from "@/lib/theme/light-only";


/** Follows the device by default; light or dark can be chosen in Settings and is kept in this browser. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      forcedTheme={isLightOnlyPath(pathname) ? "light" : undefined}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
