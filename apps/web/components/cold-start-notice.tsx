"use client";

import { useEffect } from "react";
import { onColdStart } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

/** Warns the user once a request runs long enough to look like the free-tier Render host waking up. */
export function ColdStartNotice() {
  const toast = useToast();

  useEffect(() => {
    return onColdStart(() => {
      toast(
        "Waking up the server - this can take up to a minute on the free tier.",
        "info",
      );
    });
  }, [toast]);

  return null;
}
