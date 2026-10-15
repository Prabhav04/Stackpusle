import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  id?: string;
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => string;
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DEFAULT_DURATION = 3800;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idCounter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', options?: ToastOptions): string => {
      const id = options?.id || `toast-${Date.now()}-${++idCounter.current}`;
      const duration = options?.duration ?? DEFAULT_DURATION;

      const newToast: ToastItem = {
        id,
        type,
        title: options?.title,
        message,
        duration,
        action: options?.action,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        // Keep at most 4 toasts visible, newest first
        const filtered = prev.filter((t) => t.id !== id);
        return [newToast, ...filtered].slice(0, 4);
      });

      return id;
    },
    []
  );

  const success = useCallback(
    (message: string, options?: ToastOptions) => showToast(message, 'success', options),
    [showToast]
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) =>
      showToast(message, 'error', { duration: 5000, ...options }),
    [showToast]
  );

  const warning = useCallback(
    (message: string, options?: ToastOptions) => showToast(message, 'warning', options),
    [showToast]
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) => showToast(message, 'info', options),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        success,
        error,
        warning,
        info,
        dismiss,
        clearAll,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Card with hover-pause and animated countdown bar
const ToastCard: React.FC<{
  toast: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(toast.duration);
  const startTimeRef = useRef(0);

  React.useEffect(() => {
    if (toast.duration <= 0) return;

    if (!isPaused) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        onDismiss(toast.id);
      }, remainingRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPaused, toast.id, toast.duration, onDismiss]);

  const handleMouseEnter = () => {
    if (toast.duration <= 0) return;
    setIsPaused(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    if (toast.duration <= 0) return;
    setIsPaused(false);
  };

  const config = {
    success: {
      border: 'border-emerald-500/40 hover:border-emerald-500/70',
      bgGlow: 'shadow-[0_4px_25px_-4px_rgba(16,185,129,0.25)]',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      titleColor: 'text-emerald-300',
      progressBg: 'bg-emerald-500',
      defaultTitle: 'Success',
    },
    error: {
      border: 'border-[#e11d48]/50 hover:border-[#ff2d55]/80',
      bgGlow: 'shadow-[0_4px_25px_-4px_rgba(225,29,72,0.35)]',
      icon: <AlertCircle className="w-5 h-5 text-[#ff2d55] shrink-0" />,
      titleColor: 'text-rose-300',
      progressBg: 'bg-[#e11d48]',
      defaultTitle: 'Error',
    },
    warning: {
      border: 'border-amber-500/40 hover:border-amber-500/70',
      bgGlow: 'shadow-[0_4px_25px_-4px_rgba(245,158,11,0.25)]',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      titleColor: 'text-amber-300',
      progressBg: 'bg-amber-500',
      defaultTitle: 'Notice',
    },
    info: {
      border: 'border-sky-500/40 hover:border-sky-500/70',
      bgGlow: 'shadow-[0_4px_25px_-4px_rgba(56,189,248,0.25)]',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
      titleColor: 'text-sky-300',
      progressBg: 'bg-sky-500',
      defaultTitle: 'Information',
    },
  }[toast.type];

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full max-w-sm overflow-hidden rounded-2xl bg-[#170909]/95 backdrop-blur-xl border ${config.border} ${config.bgGlow} p-4 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-3`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {config.icon}

        <div className="flex-1 min-w-0 pr-2">
          {toast.title && (
            <h4 className={`text-xs font-bold uppercase tracking-wider ${config.titleColor} mb-0.5`}>
              {toast.title}
            </h4>
          )}
          <p className="text-xs sm:text-sm text-white/95 leading-snug break-words">
            {toast.message}
          </p>

          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="mt-2.5 px-3 py-1 rounded-lg bg-[#200b0b] hover:bg-[#350d0d] border border-[#2f0000] text-xs font-semibold text-[#fb7185] hover:text-white transition-colors cursor-pointer"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={() => onDismiss(toast.id)}
          className="text-[#64748b] hover:text-white transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer shrink-0"
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Countdown progress indicator */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0f0606] overflow-hidden">
          <div
            className={`h-full ${config.progressBg} opacity-75 transition-all linear`}
            style={{
              animation: `toastCountdown ${toast.duration}ms linear forwards`,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          />
        </div>
      )}
    </div>
  );
};

// Fixed container for active toasts (top-right on desktop, top-center on mobile)
const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2.5 max-w-[calc(100vw-2rem)] sm:max-w-md pointer-events-auto"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
