"use client";

import { ClerkProvider } from "@clerk/react";
import type { ReactNode } from "react";

export function ClerkClientProvider({
  children,
  publishableKey,
}: {
  children: ReactNode;
  publishableKey?: string;
}) {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}
