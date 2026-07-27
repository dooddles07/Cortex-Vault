"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { STORAGE_KEY, useTheme, type Theme } from "@/lib/theme";

const VALID: readonly Theme[] = ["light", "dark", "system"];

/**
 * Reconciles the account's theme_preference with this device's local choice.
 * On first load with no local override, adopts the server's preference so
 * switching devices (or clearing localStorage) restores it. Otherwise the
 * device's explicit choice wins, and is pushed back to the account so it
 * catches up rather than the two staying permanently out of sync.
 */
export function ThemeAccountSync() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const adopted = React.useRef(false);
  const skipNextPush = React.useRef(false);

  React.useEffect(() => {
    if (!user || adopted.current) return;
    adopted.current = true;
    const local = localStorage.getItem(STORAGE_KEY);
    const pref = user.theme_preference;
    if (!local && pref && VALID.includes(pref as Theme)) {
      skipNextPush.current = true;
      setTheme(pref as Theme);
    }
  }, [user, setTheme]);

  React.useEffect(() => {
    if (!user) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    if (user.theme_preference === theme) return;
    api.updateMe({ theme_preference: theme }).catch(() => {});
  }, [theme, user]);

  return null;
}
