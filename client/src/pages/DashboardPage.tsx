import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Users,
  GitCompare,
  Pin,
  Trash2,
  ExternalLink,
  Edit3,
  Star,
  Code2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Navbar } from '../components/Navbar.js';
import { api } from '../services/api.js';
import type { RecentViewItem, SavedComparison, PinItem } from '../types/index.js';

const QUICK_SEARCH_PICKS = [
  { username: 'torvalds', label: 'Linus Torvalds' },
  { username: 'gaearon', label: 'Dan Abramov' },
  { username: 'yyx990803', label: 'Evan You' },
  { username: 'shadcn', label: 'shadcn' },
  { username: 'sindresorhus', label: 'Sindre Sorhus' },
];

export const DashboardPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [recentViews, setRecentViews] = useState<RecentViewItem[]>([]);
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>([]);
  const [pinnedRepos, setPinnedRepos] = useState<PinItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Note editing modal/inline state
  const [editingPin, setEditingPin] = useState<{ id: string; note: string } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [updatingNote, setUpdatingNote] = useState(false);

  const navigate = useNavigate();

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [recentRes, comparisonsRes, pinsRes] = await Promise.allSettled([
        api.developers.getRecent(),
        api.compare.getSaved(),
        api.pins.list(),
      ]);

      if (recentRes.status === 'fulfilled') {
        setRecentViews(recentRes.value.recentViews || []);
      }
      if (comparisonsRes.status === 'fulfilled') {
        setSavedComparisons(comparisonsRes.value.comparisons || []);
      }
      if (pinsRes.status === 'fulfilled') {
        setPinnedRepos(pinsRes.value.pins || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/profile/${encodeURIComponent(searchTerm.trim().toLowerCase())}`);
    }
  };

  const handleDeleteComparison = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved comparison?')) return;
    try {
      await api.compare.delete(id);
      setSavedComparisons((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete comparison');
    }
  };

  const handleUnpinRepo = async (pinId: string) => {
    try {
      await api.pins.delete(pinId);
      setPinnedRepos((prev) => prev.filter((p) => p.id !== pinId));
    } catch (err: any) {
      alert(err.message || 'Failed to unpin repository');
    }
  };

  const handleSavePinNote = async () => {
    if (!editingPin) return;
    setUpdatingNote(true);
    try {
      await api.pins.update(editingPin.id, noteText.trim() || null);
      setPinnedRepos((prev) =>
        prev.map((p) => (p.id === editingPin.id ? { ...p, note: noteText.trim() || null } : p))
      );
      setEditingPin(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update note');
    } finally {
      setUpdatingNote(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-12">
        {/* Hero Search Section */}
        <section className="relative rounded-3xl bg-gradient-to-b from-[#200b0b] to-[#140606] border border-[#2f0000] p-8 sm:p-12 text-center overflow-hidden shadow-2xl">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e11d48]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#350d0d] border border-[#490000] text-xs font-semibold text-[#fb7185] mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#e11d48]" />
              INSTANT GITHUB PROFILES & SIGNAL SCORES
            </span>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
              Analyze Any <span className="text-[#e11d48]">Developer.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#94a3b8] mb-8">
              Transparent, deterministic evaluation on four key signals: Reach, Impact, Activity, and Breadth. Traceable to real public data.
            </p>

            {/* Main Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter GitHub username (e.g. torvalds, gaearon)..."
                className="w-full pl-12 pr-32 py-4 rounded-2xl bg-[#0f0606] border border-[#2f0000] text-white placeholder-[#64748b] text-base focus:outline-none focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/20 shadow-inner"
              />
              <Search className="w-5 h-5 text-[#94a3b8] absolute left-4 top-1/2 -translate-y-1/2" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-xl bg-[#e11d48] hover:bg-[#ff2d55] text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
              >
                Inspect
              </button>
            </form>

            {/* Quick Pick Chips */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-[#64748b] font-medium mr-1">Popular:</span>
              {QUICK_SEARCH_PICKS.map((pick) => (
                <button
                  key={pick.username}
                  type="button"
                  onClick={() => navigate(`/profile/${pick.username}`)}
                  className="px-2.5 py-1 rounded-lg bg-[#170909] hover:bg-[#2f0000] border border-[#2f0000] hover:border-[#490000] text-xs text-[#cbd5e1] hover:text-[#fb7185] transition-all cursor-pointer font-mono"
                >
                  @{pick.username}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 3 Main Dashboard Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Recently Viewed Developers */}
          <div className="bg-[#170909] border border-[#2f0000] rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#2f0000] mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#e11d48]" />
                <h2 className="text-base font-bold text-white">Recently Viewed</h2>
              </div>
              <span className="text-xs text-[#94a3b8] font-mono">{recentViews.length}</span>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-[#200b0b] animate-pulse" />
                ))}
              </div>
            ) : recentViews.length === 0 ? (
              <div className="text-center py-10 my-auto text-[#64748b]">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#94a3b8]" />
                <p className="text-xs">No developers viewed yet.</p>
                <p className="text-[11px] text-[#64748b] mt-1">Search any username above to inspect signals.</p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
                {recentViews.map((item) => (
                  <Link
                    key={item.developer.id}
                    to={`/profile/${item.developer.username}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#0f0606] hover:bg-[#200b0b] border border-[#2f0000] hover:border-[#490000] transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.developer.avatarUrl || 'https://github.com/identicons/stackpulse.png'}
                        alt={item.developer.username}
                        className="w-10 h-10 rounded-full border border-[#2f0000] group-hover:border-[#e11d48] transition-colors shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-[#fb7185] transition-colors">
                          {item.developer.name || item.developer.username}
                        </p>
                        <p className="text-xs text-[#94a3b8] font-mono truncate">
                          @{item.developer.username}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#64748b] group-hover:text-[#e11d48] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Saved Comparisons */}
          <div className="bg-[#170909] border border-[#2f0000] rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#2f0000] mb-4">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-[#f59e0b]" />
                <h2 className="text-base font-bold text-white">Saved Comparisons</h2>
              </div>
              <Link
                to="/compare"
                className="text-xs text-[#e11d48] hover:text-[#fb7185] font-semibold transition-colors"
              >
                + New
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-[#200b0b] animate-pulse" />
                ))}
              </div>
            ) : savedComparisons.length === 0 ? (
              <div className="text-center py-10 my-auto text-[#64748b]">
                <GitCompare className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#94a3b8]" />
                <p className="text-xs">No comparisons saved yet.</p>
                <Link
                  to="/compare"
                  className="mt-3 inline-block px-4 py-2 rounded-xl bg-[#200b0b] hover:bg-[#350d0d] border border-[#2f0000] text-xs text-[#fb7185] font-medium transition-colors"
                >
                  Create Comparison
                </Link>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
                {savedComparisons.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-3.5 rounded-xl bg-[#0f0606] border border-[#2f0000] hover:border-[#490000] transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white truncate">{comp.name}</span>
                      <button
                        onClick={() => handleDeleteComparison(comp.id)}
                        className="text-[#64748b] hover:text-red-400 transition-colors p-1"
                        title="Delete comparison"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Developer Avatar Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {comp.developers.map((dev) => (
                        <div
                          key={dev.id}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#170909] border border-[#2f0000] text-[11px] text-[#cbd5e1] font-mono"
                        >
                          <img
                            src={dev.avatarUrl || 'https://github.com/identicons/stackpulse.png'}
                            alt={dev.username}
                            className="w-3.5 h-3.5 rounded-full"
                          />
                          <span>{dev.username}</span>
                        </div>
                      ))}
                    </div>

                    <Link
                      to={`/compare?users=${comp.usernames.join(',')}`}
                      className="mt-1 w-full py-1.5 rounded-lg bg-[#200b0b] hover:bg-[#350d0d] text-center text-xs text-[#fb7185] font-semibold border border-[#2f0000] hover:border-[#490000] transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Open Comparison</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 3: Pinned Repositories with Notes */}
          <div className="bg-[#170909] border border-[#2f0000] rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#2f0000] mb-4">
              <div className="flex items-center gap-2">
                <Pin className="w-5 h-5 text-[#10b981]" />
                <h2 className="text-base font-bold text-white">Pinned Repositories</h2>
              </div>
              <span className="text-xs text-[#94a3b8] font-mono">{pinnedRepos.length}</span>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-[#200b0b] animate-pulse" />
                ))}
              </div>
            ) : pinnedRepos.length === 0 ? (
              <div className="text-center py-10 my-auto text-[#64748b]">
                <Pin className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#94a3b8]" />
                <p className="text-xs">No pinned repositories yet.</p>
                <p className="text-[11px] text-[#64748b] mt-1">Visit any developer profile to pin notable repositories.</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
                {pinnedRepos.map((pin) => (
                  <div
                    key={pin.id}
                    className="p-3.5 rounded-xl bg-[#0f0606] border border-[#2f0000] flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={pin.repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-white hover:text-[#fb7185] transition-colors truncate flex items-center gap-1"
                          >
                            <span>{pin.repo.name}</span>
                            <ExternalLink className="w-3 h-3 text-[#64748b]" />
                          </a>
                        </div>
                        {pin.repo.developer && (
                          <Link
                            to={`/profile/${pin.repo.developer.username}`}
                            className="text-[11px] text-[#94a3b8] hover:text-[#fb7185] font-mono transition-colors"
                          >
                            by @{pin.repo.developer.username}
                          </Link>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingPin({ id: pin.id, note: pin.note || '' });
                            setNoteText(pin.note || '');
                          }}
                          className="p-1 text-[#64748b] hover:text-white transition-colors"
                          title="Edit note"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleUnpinRepo(pin.id)}
                          className="p-1 text-[#64748b] hover:text-red-400 transition-colors"
                          title="Unpin repo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stats & Language */}
                    <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {pin.repo.stars.toLocaleString()}
                      </span>
                      {pin.repo.language && (
                        <span className="flex items-center gap-1">
                          <Code2 className="w-3 h-3 text-[#38bdf8]" />
                          {pin.repo.language}
                        </span>
                      )}
                    </div>

                    {/* Review Note */}
                    {pin.note ? (
                      <div className="p-2 rounded-lg bg-[#170909] border border-[#2f0000] text-xs text-[#cbd5e1] italic">
                        "{pin.note}"
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPin({ id: pin.id, note: '' });
                          setNoteText('');
                        }}
                        className="text-[11px] text-[#64748b] hover:text-[#fb7185] text-left italic transition-colors"
                      >
                        + Add a personal evaluation note...
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Edit Note Modal */}
      {editingPin && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#170909] border border-[#2f0000] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Edit Repository Note</h3>
            <p className="text-xs text-[#94a3b8] mb-4">
              Add your private assessment or review note for this repository.
            </p>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              maxLength={500}
              placeholder="e.g. Excellent architecture, clean TypeScript abstractions, used in production..."
              rows={4}
              className="w-full p-3 rounded-xl bg-[#0f0606] border border-[#2f0000] text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48]"
            />
            <div className="text-right text-[11px] text-[#64748b] mt-1 mb-4">
              {noteText.length}/500
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingPin(null)}
                className="px-4 py-2 rounded-xl bg-[#200b0b] hover:bg-[#2f0000] text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingNote}
                onClick={handleSavePinNote}
                className="px-4 py-2 rounded-xl bg-[#e11d48] hover:bg-[#ff2d55] text-xs text-white font-semibold shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {updatingNote ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
