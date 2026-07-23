"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

// Ported from client/src/components/ConfirmModal.jsx.
export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  loadingLabel = "Submitting…",
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** When true, keeps the modal open and fills the confirm button green while an async action is in flight, instead of closing immediately on click. */
  loading?: boolean;
  loadingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, loading, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
            onClick={loading ? undefined : onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative card-tactile bg-white w-full max-w-sm z-10 p-6"
          >
            <div className="flex items-start gap-3 mb-4">
              {danger && <AlertTriangle size={22} className="text-coral shrink-0 mt-0.5" />}
              <div>
                <h2 className="text-lg font-medium">{title}</h2>
                {message && <p className="text-sm font-sans text-ink/75 mt-1">{message}</p>}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={onCancel} disabled={loading} className="btn-tactile bg-cream-alt text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                onClick={onConfirm}
                disabled={loading}
                className={`liquid-fill-btn btn-tactile text-sm text-white disabled:cursor-not-allowed ${danger ? "bg-coral" : "bg-ink"}`}
              >
                {loading && <span className="liquid-fill" />}
                <span>{loading ? loadingLabel : confirmLabel}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
