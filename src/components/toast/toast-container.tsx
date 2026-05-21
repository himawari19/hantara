"use client";

import { useEffect } from "react";
import { useToastStore, Toast } from "@/store/toast-store";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="pointer-events-none fixed bottom-8 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (!toast.duration) return;
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const iconMap = {
    success: <CheckCircle size={14} className="text-[var(--success)]" />,
    error: <XCircle size={14} className="text-[var(--error)]" />,
    warning: <AlertTriangle size={14} className="text-[var(--warning)]" />,
    info: <Info size={14} className="text-[var(--accent)]" />,
  };

  const borderMap = {
    success: "border-l-[var(--success)]",
    error: "border-l-[var(--error)]",
    warning: "border-l-[var(--warning)]",
    info: "border-l-[var(--accent)]",
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2 rounded border border-[var(--border)] border-l-2 ${borderMap[toast.type]} bg-[var(--bg-primary)] px-3 py-2 shadow-lg animate-in slide-in-from-right-5 fade-in duration-200`}
      role="alert"
    >
      {iconMap[toast.type]}
      <span className="text-xs text-[var(--text-primary)]">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}
