"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Light, dark or the system setting; the choice is kept in this browser. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
