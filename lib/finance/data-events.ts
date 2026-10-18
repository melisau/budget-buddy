"use client";

import { useEffect, useState } from "react";

/**
 * A lightweight "financial data changed" signal.
 *
 * Transactions can be created from places that do not own the screen that is
 * currently showing data (for example the header's quick-add dialog while the
 * dashboard is open). Writers call `notifyFinanceDataChanged()` after a
 * successful change; screens read `useFinanceDataVersion()` and include it in
 * their data-loading effect dependencies so they refetch automatically.
 *
 * The signal also reaches other open tabs through BroadcastChannel.
 */

const EVENT_NAME = "budgetbuddy:finance-data-changed";
const CHANNEL_NAME = "budgetbuddy-finance-data";

export function notifyFinanceDataChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT_NAME));
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage("changed");
    channel.close();
  } catch {
    // BroadcastChannel is unavailable in some embedded browsers; same-tab
    // refresh still works through the window event.
  }
}

/** Increments whenever financial data changes in this or another tab. */
export function useFinanceDataVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((current) => current + 1);
    window.addEventListener(EVENT_NAME, bump);

    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener("message", bump);
    } catch {
      channel = undefined;
    }

    return () => {
      window.removeEventListener(EVENT_NAME, bump);
      channel?.close();
    };
  }, []);

  return version;
}
