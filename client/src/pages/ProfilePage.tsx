import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Star,
  BookOpen,
  Code2,
  Pin,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  GitCompare,
} from 'lucide-react';
import { Navbar } from '../components/Navbar.js';
import { api } from '../services/api.js';
import type { DeveloperProfileResponse, Repo } from '../types/index.js';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<DeveloperProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Repo sorting: 'stars' | 'activity'
  const [sortBy, setSortBy] = useState<'stars' | 'activity'>('stars');

  // Pinning modal state
  const [pinningRepo, setPinningRepo] = useState<Repo | null>(null);
  const [pinNote, setPinNote] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const fetchProfile = async (forceRefresh = false) => {
    if (!username) return;
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.developers.get(username, forceRefresh);
      setData(res);
    } catch (err: any) {
      setError({
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message || 'Failed to load profile for this developer',
      });
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile(false);
  }, [username]);

  const handleTogglePin = async (repo: Repo) => {
    if (repo.isPinned && repo.pinId) {
      // Unpin immediately
      try {
        await api.pins.delete(repo.pinId);
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            repos: prev.repos.map((r) =>
              r.id === repo.id ? { ...r, isPinned: false, pinId: null, pinNote: null } : r
            ),
          };
        });
      } catch (err: any) {
        alert(err.message || 'Failed to unpin repository');
      }
    } else {
      // Open note modal to pin
      setPinningRepo(repo);
      setPinNote('');
    }
  };

  const handleConfirmPin = async () => {
    if (!pinningRepo) return;
    setPinLoading(true);
    try {
      const res = await api.pins.create(pinningRepo.id, pinNote.trim() || undefined);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          repos: prev.repos.map((r) =>
            r.id === pinningRepo.id
              ? { ...r, isPinned: true, pinId: res.pin.id, pinNote: res.pin.note }
              : r
          ),
        };
      });
      setPinningRepo(null);
    } catch (err: any) {
      alert(err.message || 'Failed to pin repository');
    } finally {
      setPinLoading(false);
    }
  };

  // Sort repos
  const sortedRepos = React.useMemo(() => {
    if (!data?.repos) return [];
    return [...data.repos].sort((a, b) => {
      if (sortBy === 'stars') {
        return b.stars - a.stars;
      }
      const dateA = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
      const dateB = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [data?.repos, sortBy]);

  // Language count calculation for breakdown chart
  const languageStats = React.useMemo(() => {
    if (!data?.repos) return [];
    const counts: Record<string, number> = {};
    const owned = data.repos.filter((r) => !r.isFork);
    owned.forEach((r) => {
      if (r.language) {
        counts[r.language] = (counts[r.language] || 0) + 1;
      }
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .map(([lang, count]) => ({
        language: lang,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data?.repos]);

  return (
    <div className="min-h-screen bg-transparent text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        
        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-6">
            <div className="h-48 rounded-3xl bg-[#170909] animate-pulse border border-[#2f0000]" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-[#170909] animate-pulse border border-[#2f0000]" />
              ))}
            </div>
          </div>
        )}

        {/* Error States according to PRD error codes */}
        {!loading && error && (
          <div className="p-8 rounded-3xl bg-[#1a0808] border border-[#490000] text-center max-w-xl mx-auto my-12">
            <div className="w-12 h-12 rounded-full bg-[#350d0d] border border-[#650000] flex items-center justify-center mx-auto mb-4 text-[#e11d48]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              {error.code === 'USER_NOT_FOUND' && 'Developer Not Found'}
              {error.code === 'RATE_LIMITED' && 'GitHub API Rate Limit Reached'}
              {error.code === 'GITHUB_UNAVAILABLE' && 'GitHub Service Unavailable'}
              {!['USER_NOT_FOUND', 'RATE_LIMITED', 'GITHUB_UNAVAILABLE'].includes(error.code) && 'Unable to Load Profile'}
            </h2>

            <p className="text-sm text-[#94a3b8] mb-6">{error.message}</p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 rounded-xl bg-[#200b0b] hover:bg-[#2f0000] text-xs font-semibold text-[#cbd5e1] transition-colors"
              >
                Back to Dashboard
              </button>
              {error.code !== 'USER_NOT_FOUND' && (
                <button
                  onClick={() => fetchProfile(true)}
                  className="px-4 py-2 rounded-xl bg-[#e11d48] hover:bg-[#ff2d55] text-xs font-semibold text-white shadow-md transition-colors"
                >
                  Retry Request
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loaded Profile Content */}
        {!loading && data && (
          <>
            {/* Stale Cache Notice Banner (PRD Section 9 requirement) */}
            {data.stale && (
              <div className="p-4 rounded-2xl bg-[#200b0b] border border-[#f59e0b]/50 text-amber-200 text-xs sm:text-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0" />
                  <span>
                    <strong>Showing cached data:</strong> {data.staleReason || 'GitHub is temporarily unavailable or rate-limited.'}
                  </span>
                </div>
                <button
                  onClick={() => fetchProfile(true)}
                  disabled={refreshing}
                  className="px-3 py-1 rounded-lg bg-[#350d0d] hover:bg-[#490000] border border-[#f59e0b]/30 text-xs font-medium text-amber-300 transition-colors shrink-0 cursor-pointer"
                >
                  {refreshing ? 'Refreshing...' : 'Try Live Refresh'}
                </button>
              </div>
            )}

            {/* Header Hero Profile Card */}
            <div className="rounded-3xl bg-[#170909] border border-[#2f0000] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-5 sm:gap-6 min-w-0">
                <img
                  src={data.developer.avatarUrl || 'https://github.com/identicons/stackpulse.png'}
                  alt={data.developer.username}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-[#2f0000] object-cover shrink-0 shadow-lg"
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      {data.developer.name || data.developer.username}
                    </h1>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#200b0b] border border-[#350d0d] text-[#fb7185] font-mono">
                      @{data.developer.username}
                    </span>
                  </div>

                  {data.developer.bio && (
                    <p className="mt-2 text-sm text-[#94a3b8] max-w-2xl line-clamp-2">
                      {data.developer.bio}
                    </p>
                  )}

                  {/* Public stats row */}
                  <div className="mt-3.5 flex items-center gap-4 sm:gap-6 text-xs text-[#cbd5e1] font-mono flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#fb7185]" />
                      <strong>{data.developer.followers.toLocaleString()}</strong> followers
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <strong>{data.developer.publicRepos}</strong> public repos
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-[#f59e0b] fill-[#f59e0b]" />
                      <strong>{data.signals.summary.totalStars.toLocaleString()}</strong> stars (owned)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end pt-4 md:pt-0 border-t md:border-t-0 border-[#2f0000]">
                <button
                  onClick={() => fetchProfile(true)}
                  disabled={refreshing}
                  title="Refetch live data from GitHub"
                  className="p-2.5 rounded-xl bg-[#200b0b] hover:bg-[#2f0000] border border-[#2f0000] text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#e11d48]' : ''}`} />
                </button>

                <a
                  href={`https://github.com/${data.developer.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#200b0b] hover:bg-[#2f0000] border border-[#2f0000] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                >
                  <span>GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#94a3b8]" />
                </a>

                <button
                  onClick={() => navigate(`/compare?users=${data.developer.username}`)}
                  className="px-4 py-2.5 rounded-xl bg-[#e11d48] hover:bg-[#ff2d55] text-xs font-semibold text-white flex items-center gap-1.5 shadow-md shadow-[#e11d48]/20 transition-all cursor-pointer"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Compare</span>
                </button>
              </div>
            </div>

            {/* Signature Feature: The 4 Signal Scores */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48] animate-pulse" />
                    <h2 className="text-lg font-bold text-white tracking-tight">Signal Scores</h2>
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    Deterministic indicators (0–100) computed from owned repos. Heuristics, not absolute rankings.
                  </p>
                </div>

                <span className="text-[11px] font-mono text-[#fb7185] px-2.5 py-1 rounded-md bg-[#200b0b] border border-[#350d0d]">
                  {data.signals.summary.dataQualityNote}
                </span>
              </div>

              {/* 4 Score Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Reach */}
                <div className="p-5 rounded-2xl bg-[#170909] border border-[#2f0000] relative group hover:border-[#490000] transition-all">
                  <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-2">
                    <span className="font-semibold uppercase tracking-wider text-[#fb7185]">Reach</span>
                    <span className="text-xs font-mono">{data.signals.reach.raw.toLocaleString()} followers</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-black text-white">{data.signals.reach.score}</span>
                    <span className="text-xs text-[#64748b]">/100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0f0606] overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#650000] to-[#e11d48]"
                      style={{ width: `${data.signals.reach.score}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-tight mb-2">
                    {data.signals.reach.description}
                  </p>
                  <div className="pt-2 border-t border-[#2f0000] text-[10px] text-[#64748b] font-mono">
                    Formula: {data.signals.reach.formula}
                  </div>
                </div>

                {/* 2. Impact */}
                <div className="p-5 rounded-2xl bg-[#170909] border border-[#2f0000] relative group hover:border-[#490000] transition-all">
                  <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-2">
                    <span className="font-semibold uppercase tracking-wider text-[#f59e0b]">Impact</span>
                    <span className="text-xs font-mono">{data.signals.impact.raw.toLocaleString()} stars</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-black text-white">{data.signals.impact.score}</span>
                    <span className="text-xs text-[#64748b]">/100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0f0606] overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#92400e] to-[#f59e0b]"
                      style={{ width: `${data.signals.impact.score}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-tight mb-2">
                    {data.signals.impact.description}
                  </p>
                  <div className="pt-2 border-t border-[#2f0000] text-[10px] text-[#64748b] font-mono truncate" title={data.signals.impact.qualityLabel}>
                    {data.signals.impact.qualityLabel}
                  </div>
                </div>

                {/* 3. Activity */}
                <div className="p-5 rounded-2xl bg-[#170909] border border-[#2f0000] relative group hover:border-[#490000] transition-all">
                  <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-2">
                    <span className="font-semibold uppercase tracking-wider text-[#10b981]">Activity</span>
                    <span className="text-xs font-mono">{data.signals.activity.raw} pushed</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-black text-white">{data.signals.activity.score}%</span>
                    <span className="text-xs text-[#64748b]">/100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0f0606] overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#065f46] to-[#10b981]"
                      style={{ width: `${data.signals.activity.score}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-tight mb-2">
                    {data.signals.activity.description}
                  </p>
                  <div className="pt-2 border-t border-[#2f0000] text-[10px] text-[#64748b] font-mono">
                    {data.signals.activity.qualityLabel}
                  </div>
                </div>

                {/* 4. Breadth */}
                <div className="p-5 rounded-2xl bg-[#170909] border border-[#2f0000] relative group hover:border-[#490000] transition-all">
                  <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-2">
                    <span className="font-semibold uppercase tracking-wider text-[#38bdf8]">Breadth</span>
                    <span className="text-xs font-mono">{data.signals.breadth.raw} languages</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-black text-white">{data.signals.breadth.score}</span>
                    <span className="text-xs text-[#64748b]">/100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0f0606] overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0369a1] to-[#38bdf8]"
                      style={{ width: `${data.signals.breadth.score}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-tight mb-2">
                    {data.signals.breadth.description}
                  </p>
                  <div className="pt-2 border-t border-[#2f0000] text-[10px] text-[#64748b] font-mono">
                    Formula: min(100, distinct × 15)
                  </div>
                </div>

              </div>
            </section>

            {/* Language Distribution Breakdown */}
            {languageStats.length > 0 && (
              <section className="p-6 rounded-2xl bg-[#170909] border border-[#2f0000]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#38bdf8]" />
                    <h3 className="text-sm font-bold text-white">Language Distribution</h3>
                  </div>
                  <span className="text-[11px] text-[#64748b]">
                    Primary language by repository count (excluding forks)
                  </span>
                </div>

                <div className="space-y-2.5">
                  {languageStats.slice(0, 6).map((item) => (
                    <div key={item.language} className="flex items-center gap-3 text-xs">
                      <span className="w-24 font-mono font-medium text-[#cbd5e1] truncate">
                        {item.language}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[#0f0606] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#e11d48]"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="w-16 text-right font-mono text-[#94a3b8]">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Sortable Repositories Table */}
            <section className="rounded-2xl bg-[#170909] border border-[#2f0000] overflow-hidden">
              <div className="p-5 border-b border-[#2f0000] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">Repositories</h3>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    Showing {sortedRepos.length} repositories ({data.signals.summary.totalOwnedRepos} owned, {sortedRepos.filter(r => r.isFork).length} forks)
                  </p>
                </div>

                {/* Sort Toggle Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#64748b]">Sort by:</span>
                  <div className="inline-flex rounded-xl bg-[#0f0606] p-1 border border-[#2f0000]">
                    <button
                      onClick={() => setSortBy('stars')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        sortBy === 'stars'
                          ? 'bg-[#350d0d] text-[#fb7185] border border-[#490000]'
                          : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      Most Stars
                    </button>
                    <button
                      onClick={() => setSortBy('activity')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        sortBy === 'activity'
                          ? 'bg-[#350d0d] text-[#fb7185] border border-[#490000]'
                          : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      Recent Activity
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0f0606] text-xs uppercase tracking-wider text-[#94a3b8] border-b border-[#2f0000]">
                    <tr>
                      <th className="py-3 px-5 font-semibold">Repository</th>
                      <th className="py-3 px-4 font-semibold">Language</th>
                      <th className="py-3 px-4 font-semibold">Stars</th>
                      <th className="py-3 px-4 font-semibold">Last Pushed</th>
                      <th className="py-3 px-5 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2f0000]/60">
                    {sortedRepos.map((repo) => (
                      <tr
                        key={repo.id}
                        className={`hover:bg-[#200b0b]/50 transition-colors ${
                          repo.isPinned ? 'bg-[#200b0b]/30' : ''
                        }`}
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <a
                              href={repo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-white hover:text-[#fb7185] flex items-center gap-1.5 transition-colors"
                            >
                              <span>{repo.name}</span>
                              <ExternalLink className="w-3 h-3 text-[#64748b]" />
                            </a>
                            {repo.isFork && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#200b0b] text-[#94a3b8] border border-[#350d0d]">
                                Fork
                              </span>
                            )}
                            {repo.isPinned && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#350d0d] text-[#fb7185] border border-[#490000] flex items-center gap-1">
                                <Pin className="w-2.5 h-2.5 fill-current" />
                                Pinned
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-xs text-[#94a3b8] mt-1 line-clamp-1 max-w-xl">
                              {repo.description}
                            </p>
                          )}
                          {repo.pinNote && (
                            <p className="text-xs text-[#fb7185] mt-1 italic">
                              Note: "{repo.pinNote}"
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-[#cbd5e1]">
                          {repo.language || <span className="text-[#64748b]">—</span>}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-white">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            {repo.stars.toLocaleString()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-[#94a3b8]">
                          {repo.pushedAt
                            ? new Date(repo.pushedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => handleTogglePin(repo)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto transition-all cursor-pointer ${
                              repo.isPinned
                                ? 'bg-[#350d0d] text-[#fb7185] border border-[#490000] hover:bg-red-950/60'
                                : 'bg-[#0f0606] text-[#94a3b8] hover:text-white border border-[#2f0000] hover:border-[#490000]'
                            }`}
                          >
                            <Pin className={`w-3.5 h-3.5 ${repo.isPinned ? 'fill-current' : ''}`} />
                            <span>{repo.isPinned ? 'Pinned' : 'Pin'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Pin with Note Modal */}
      {pinningRepo && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#170909] border border-[#2f0000] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Pin <span className="text-[#fb7185] font-mono">{pinningRepo.name}</span>
            </h3>
            <p className="text-xs text-[#94a3b8] mb-4">
              Pinned repos appear on your dashboard. You can add an optional evaluation note.
            </p>

            <textarea
              value={pinNote}
              onChange={(e) => setPinNote(e.target.value)}
              placeholder="e.g. Great implementation of WebSocket syncing; clean TypeScript types..."
              rows={3}
              maxLength={500}
              className="w-full p-3 rounded-xl bg-[#0f0606] border border-[#2f0000] text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48]"
            />

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setPinningRepo(null)}
                className="px-4 py-2 rounded-xl bg-[#200b0b] hover:bg-[#2f0000] text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pinLoading}
                onClick={handleConfirmPin}
                className="px-4 py-2 rounded-xl bg-[#e11d48] hover:bg-[#ff2d55] text-xs text-white font-semibold shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {pinLoading ? 'Pinning...' : 'Confirm Pin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
