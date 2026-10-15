import React, { useEffect } from 'react';
import { X, Sparkles, ShieldCheck } from 'lucide-react';

interface SignalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignalInfoModal: React.FC<SignalInfoModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#170909] border border-[#2f0000] p-6 sm:p-8 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e11d48]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between pb-4 border-b border-[#2f0000] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#650000] to-[#e11d48] flex items-center justify-center shadow-md shadow-[#e11d48]/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Signal Scores Explained
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Transparent, explainable, and 100% deterministic developer telemetry.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close explanation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm">
          {/* Signal 1: Reach */}
          <div className="p-4 rounded-2xl bg-[#0f0606] border border-[#2f0000] hover:border-[#490000] transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[#fb7185] uppercase tracking-wider text-xs">
                1. Reach (Audience Size)
              </span>
              <span className="font-mono text-[11px] text-[#cbd5e1] px-2 py-0.5 rounded bg-[#200b0b] border border-[#350d0d]">
                10,000 followers = 100
              </span>
            </div>
            <p className="text-[#cbd5e1] mb-2 leading-relaxed">
              Measures developer network reach and community following. Logarithmic scaling ensures massive accounts don't distort comparative benchmarks.
            </p>
            <div className="p-2.5 rounded-xl bg-[#170909] font-mono text-xs text-[#94a3b8] border border-[#2f0000]/60">
              Formula: <span className="text-[#fb7185]">min(100, 25 × log10(followers + 1))</span>
            </div>
          </div>

          {/* Signal 2: Impact */}
          <div className="p-4 rounded-2xl bg-[#0f0606] border border-[#2f0000] hover:border-[#490000] transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[#f59e0b] uppercase tracking-wider text-xs">
                2. Impact (Owned Recognition)
              </span>
              <span className="font-mono text-[11px] text-[#cbd5e1] px-2 py-0.5 rounded bg-[#200b0b] border border-[#350d0d]">
                100,000 stars = 100
              </span>
            </div>
            <p className="text-[#cbd5e1] mb-2 leading-relaxed">
              Total stargazers accumulated across owned original repositories. <strong>Forks are strictly excluded</strong> to prevent vanity metric inflation.
            </p>
            <div className="p-2.5 rounded-xl bg-[#170909] font-mono text-xs text-[#94a3b8] border border-[#2f0000]/60">
              Formula: <span className="text-[#f59e0b]">min(100, 20 × log10(totalOwnedStars + 1))</span>
            </div>
          </div>

          {/* Signal 3: Activity */}
          <div className="p-4 rounded-2xl bg-[#0f0606] border border-[#2f0000] hover:border-[#490000] transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[#10b981] uppercase tracking-wider text-xs">
                3. Activity (Shipping Cadence)
              </span>
              <span className="font-mono text-[11px] text-[#cbd5e1] px-2 py-0.5 rounded bg-[#200b0b] border border-[#350d0d]">
                Last 90 days ratio
              </span>
            </div>
            <p className="text-[#cbd5e1] mb-2 leading-relaxed">
              Percentage of owned repositories with commits or code pushed within the last 90 days. Identifies if a developer is actively maintaining and shipping projects today.
            </p>
            <div className="p-2.5 rounded-xl bg-[#170909] font-mono text-xs text-[#94a3b8] border border-[#2f0000]/60">
              Formula: <span className="text-[#10b981]">(activeOwnedReposIn90d ÷ totalOwnedRepos) × 100</span>
            </div>
          </div>

          {/* Signal 4: Breadth */}
          <div className="p-4 rounded-2xl bg-[#0f0606] border border-[#2f0000] hover:border-[#490000] transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[#38bdf8] uppercase tracking-wider text-xs">
                4. Breadth (Polyglot Diversity)
              </span>
              <span className="font-mono text-[11px] text-[#cbd5e1] px-2 py-0.5 rounded bg-[#200b0b] border border-[#350d0d]">
                7+ languages = 100
              </span>
            </div>
            <p className="text-[#cbd5e1] mb-2 leading-relaxed">
              Number of distinct primary programming languages across owned repositories (15 points per unique language, capped at 100).
            </p>
            <div className="p-2.5 rounded-xl bg-[#170909] font-mono text-xs text-[#94a3b8] border border-[#2f0000]/60">
              Formula: <span className="text-[#38bdf8]">min(100, distinctLanguages × 15)</span>
            </div>
          </div>

          {/* Quality Guarantee Callout */}
          <div className="p-4 rounded-2xl bg-[#1f0d0d] border border-[#490000] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#fb7185] shrink-0 mt-0.5" />
            <div className="text-xs text-[#cbd5e1] leading-relaxed">
              <strong className="text-white block mb-0.5">Strict Data-Quality Protocol:</strong>
              Metrics inspect up to the first 100 owned repositories (one live GitHub API page). Missing or unresolvable data is explicitly presented as <span className="font-mono text-[#fb7185]">unavailable</span>, never as artificial zeros.
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#e11d48] hover:bg-[#ff2d55] text-xs font-semibold text-white shadow-md transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
