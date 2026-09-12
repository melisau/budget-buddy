"use client";

import { ClerkProvider, useAuth } from "@clerk/react";
import { useEffect, type ReactNode } from "react";
import { clearClerkSessionCookie, setClerkSessionCookie } from "@/lib/auth/clerk-session-cookie";

function ClerkSessionBridge() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      clearClerkSessionCookie();
      return;
    }

    let active = true;
    const sync = async () => {
      const token = await getToken();
      if (active && token) setClerkSessionCookie(token);
    };

    void sync();
    const interval = window.setInterval(() => void sync(), 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [getToken, isLoaded, isSignedIn]);

  return null;
}

export function ClerkClientProvider({
  children,
  publishableKey,
}: {
  children: ReactNode;
  publishableKey?: string;
}) {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ClerkSessionBridge />
      {children}
    </ClerkProvider>
  );
}
