"use client";

import { useEffect } from "react";

/** Registra el service worker de la PWA (solo en producción). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA best-effort: si falla el registro, la app sigue funcionando
    });
  }, []);

  return null;
}
