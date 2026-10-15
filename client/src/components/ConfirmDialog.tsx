import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter' && !loading) {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onConfirm, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      btn: 'bg-[#e11d48] hover:bg-[#ff2d55] text-white shadow-lg shadow-[#e11d48]/25',
      iconBox: 'bg-[#350d0d] border-[#490000] text-[#e11d48]',
    },
    warning: {
      btn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/25',
      iconBox: 'bg-amber-950/50 border-amber-800 text-amber-400',
    },
    primary: {
      btn: 'bg-[#e11d48] hover:bg-[#ff2d55] text-white shadow-lg shadow-[#e11d48]/25',
      iconBox: 'bg-[#350d0d] border-[#490000] text-[#fb7185]',
    },
  }[variant];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#170909] border border-[#2f0000] p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle accent glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#e11d48]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${variantStyles.iconBox}`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <h3 id="dialog-title" className="text-base sm:text-lg font-bold text-white mb-1.5">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
              {description}
            </p>
          </div>

          <button
            onClick={onCancel}
            className="text-[#64748b] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#2f0000]">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-[#200b0b] hover:bg-[#2f0000] text-xs font-semibold text-[#94a3b8] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 ${variantStyles.btn}`}
          >
            {loading && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
