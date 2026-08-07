"use client";

import { useEffect } from "react";

// Root layout crashes bypass app/error.tsx entirely, so this replaces the
// whole <html> document — it cannot rely on globals.css or providers loading.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0a0a0a",
          color: "#f5f5f5",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
          CortexVault hit an error
        </h1>
        <p style={{ maxWidth: 480, color: "#a3a3a3" }}>
          The app failed to load. Nothing in your vault was lost.
          {error.digest ? ` Reference: ${error.digest}` : ""}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            height: 48,
            padding: "0 1.25rem",
            borderRadius: 6,
            border: "none",
            background: "#f5f5f5",
            color: "#0a0a0a",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
