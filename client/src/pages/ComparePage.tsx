import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  GitCompare,
  Plus,
  X,
  Bookmark,
  Trophy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { Navbar } from '../components/Navbar.js';
import { api } from '../services/api.js';
import type { ComparisonResponse } from '../types/index.js';

const DEVELOPER_COLORS = [
  { fill: '#f43f5e', stroke: '#e11d48', bg: 'bg-[#f43f5e]', text: 'text-[#f43f5e]' }, // Crimson
  { fill: '#f59e0b', stroke: '#d97706', bg: 'bg-[#f59e0b]', text: 'text-[#f59e0b]' }, // Amber
  { fill: '#06b6d4', stroke: '#0891b2', bg: 'bg-[#06b6d4]', text: 'text-[#06b6d4]' }, // Cyan
];

const PRESET_COMPARISONS = [
  { label: 'Frontend Pioneers', users: ['gaearon', 'yyx990803'] },
  { label: 'OSS Titans', users: ['torvalds', 'sindresorhus', 'tj'] },
  { label: 'Modern UI', users: ['shadcn', 'gaearon'] },
];

export const ComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawUsers = searchParams.get('users');
  const initialUsers = rawUsers
    ? rawUsers.split(',').map((u) => u.trim().toLowerCase()).filter(Boolean)
    : ['gaearon', 'yyx990803'];

  const [usernames, setUsernames] = useState<string[]>(initialUsers);
  const [inputUsername, setInputUsername] = useState('');
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save comparison state
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedComparisonName, setSavedComparisonName] = useState<string | null>(null);

  const runComparison = async (usersToCompare: string[]) => {
    if (usersToCompare.length < 2) {
      setError('Please add at least 2 developers to run head-to-head comparison.');
      setData(null);
      setIsSaved(false);
      setSavedComparisonName(null);
      return;
    }
    if (usersToCompare.length > 3) {
      setError('You can compare a maximum of 3 developers at once.');
      return;
    }

    setLoading(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await api.compare.get(usersToCompare);
      setData(res);
      setIsSaved(Boolean(res.isSaved));
      setSavedComparisonName(res.savedComparisonName || null);
      setSearchParams({ users: usersToCompare.join(',') });
    } catch (err: any) {
      setError(err.message || 'Failed to compare developers');
      setData(null);
      setIsSaved(false);
      setSavedComparisonName(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usernames.length >= 2) {
      runComparison(usernames);
    }
  }, []);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputUsername.trim().toLowerCase();
    if (!clean) return;

    if (usernames.includes(clean)) {
      alert('This developer is already in the comparison list');
      return;
    }

    if (usernames.length >= 3) {
      alert('Maximum 3 developers can be compared simultaneously');
      return;
    }

    const next = [...usernames, clean];
    setUsernames(next);
    setInputUsername('');
    runComparison(next);
  };

  const handleRemoveUser = (userToRemove: string) => {
    const next = usernames.filter((u) => u !== userToRemove);
    setUsernames(next);
    if (next.length >= 2) {
      runComparison(next);
    } else {
      setData(null);
      setIsSaved(false);
      setSavedComparisonName(null);
      setSearchParams(next.length > 0 ? { users: next.join(',') } : {});
    }
  };

  const handleSaveComparison = async () => {
    if (!saveName.trim() || usernames.length < 2) return;
    setSaveLoading(true);
    try {
      await api.compare.save(saveName.trim(), usernames);
      setSaveSuccess(true);
      setIsSaved(true);
      setSavedComparisonName(saveName.trim());
      setTimeout(() => {
        setIsSaving(false);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to save comparison');
    } finally {
      setSaveLoading(false);
    }
  };

  // Format Radar Data (preserving null without coercing to 0)
  const radarChartData = React.useMemo(() => {
    if (!data?.developers || data.developers.length < 2) return [];

    const signals = [
      { key: 'reach', label: 'Reach' },
      { key: 'impact', label: 'Impact' },
      { key: 'activity', label: 'Activity' },
      { key: 'breadth', label: 'Breadth' },
    ];

    return signals.map((sig) => {
      const item: Record<string, any> = { signal: sig.label };
      data.developers.forEach((d) => {
        const scoreKey = sig.key as keyof typeof d.signals;
        const val = (d.signals as any)[scoreKey]?.score;
        item[d.developer.username] = val !== null && val !== undefined ? val : null;
      });
      return item;
    });
  }, [data?.developers]);

  return (
    <div className="min-h-screen bg-transparent text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
        
        {/* Header and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#2f0000]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GitCompare className="w-5 h-5 text-[#e11d48]" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Head-to-Head Comparison
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#94a3b8]">
              Compare 2–3 GitHub developers on deterministic Signal Scores and language distributions.
            </p>
          </div>

          {/* Save Comparison Action */}
          {data?.developers && data.developers.length >= 2 && (
            isSaved ? (
              <button
                disabled
                className="px-4 py-2.5 rounded-xl bg-[#14231b] border border-emerald-500/40 text-xs font-semibold text-emerald-400 flex items-center gap-2 cursor-default shadow-sm self-start md:self-center"
                title={savedComparisonName ? `Saved as "${savedComparisonName}"` : 'Saved to dashboard'}
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Saved</span>
                {savedComparisonName && (
                  <span className="text-[11px] text-emerald-400/80 font-normal max-w-[160px] truncate">
                    ({savedComparisonName})
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  setSaveName(
                    `${data.developers.map((d) => d.developer.username).join(' vs ')}`
                  );
                  setIsSaving(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#200b0b] hover:bg-[#350d0d] border border-[#2f0000] hover:border-[#490000] text-xs font-semibold text-[#fb7185] flex items-center gap-2 transition-all cursor-pointer shadow-md self-start md:self-center"
              >
                <Bookmark className="w-4 h-4 text-[#e11d48]" />
                <span>Save Comparison</span>
              </button>
            )
          )}
        </div>

        {/* Developer Chips & Add Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-wrap bg-[#170909] p-4 rounded-2xl border border-[#2f0000]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#94a3b8] font-semibold uppercase tracking-wider mr-1">
              Comparing ({usernames.length}/3):
            </span>

            {usernames.map((u, idx) => {
              const color = DEVELOPER_COLORS[idx % DEVELOPER_COLORS.length];
              return (
                <div
                  key={u}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0f0606] border border-[#2f0000] text-xs text-white font-mono shadow-sm"
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
                  <span>@{u}</span>
                  <button
                    onClick={() => handleRemoveUser(u)}
                    className="text-[#64748b] hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add Developer Form */}
          {usernames.length < 3 && (
            <form onSubmit={handleAddUser} className="flex items-center gap-2 sm:ml-auto">
              <input
                type="text"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                placeholder="Add username..."
                className="px-3 py-1.5 rounded-xl bg-[#0f0606] border border-[#2f0000] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#e11d48]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-[#e11d48] hover:bg-[#ff2d55] text-xs font-semibold text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          )}
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-[#94a3b8]">
          <span className="text-[#64748b]">Presets:</span>
          {PRESET_COMPARISONS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setUsernames(p.users);
                runComparison(p.users);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#170909] hover:bg-[#200b0b] border border-[#2f0000] text-[#cbd5e1] hover:text-[#fb7185] transition-colors cursor-pointer font-medium"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-8 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-3xl bg-[#170909] border border-[#2f0000] p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#200b0b]" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-28 bg-[#200b0b] rounded" />
                      <div className="h-3 w-16 bg-[#200b0b] rounded" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="h-12 bg-[#200b0b] rounded-xl" />
                    <div className="h-12 bg-[#200b0b] rounded-xl" />
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="h-2.5 bg-[#200b0b] rounded-full" />
                    <div className="h-2.5 bg-[#200b0b] rounded-full" />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-80 rounded-3xl bg-[#170909] border border-[#2f0000]" />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 rounded-3xl bg-[#1a0808] border border-[#490000] text-center max-w-lg mx-auto">
            <AlertTriangle className="w-10 h-10 text-[#e11d48] mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Comparison Error</h3>
            <p className="text-sm text-[#cbd5e1] mb-2">{error}</p>
            <p className="text-xs text-[#94a3b8]">
              Verify that GitHub usernames are valid, spelled correctly, and exist.
            </p>
          </div>
        )}

        {/* Empty State when fewer than 2 developers */}
        {!loading && !error && (!data || data.developers.length < 2) && (
          <div className="p-12 text-center rounded-3xl bg-[#170909] border border-[#2f0000] max-w-xl mx-auto my-8">
            <GitCompare className="w-12 h-12 text-[#e11d48] mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-white mb-1">Add Developers to Compare</h3>
            <p className="text-xs text-[#94a3b8] mb-6">
              Enter at least 2 GitHub usernames above or pick a preset to see deterministic Signal Scores and language distributions side by side.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {PRESET_COMPARISONS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setUsernames(p.users);
                    runComparison(p.users);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#200b0b] hover:bg-[#350d0d] border border-[#2f0000] text-xs font-semibold text-[#fb7185] transition-colors cursor-pointer"
                >
                  Load {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loaded Comparison Content */}
        {!loading && data && data.developers.length >= 2 && (
          <div className="space-y-10">
            
            {/* Stat Cards with Leader Highlighting */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.developers.map((d, idx) => {
                const color = DEVELOPER_COLORS[idx % DEVELOPER_COLORS.length];
                const isReachLeader = data.leaders.reach.username === d.developer.username;
                const isImpactLeader = data.leaders.impact.username === d.developer.username;
                const isActivityLeader = data.leaders.activity.username === d.developer.username;
                const isBreadthLeader = data.leaders.breadth.username === d.developer.username;

                return (
                  <div
                    key={d.developer.id}
                    className="p-6 rounded-3xl bg-[#170909] border border-[#2f0000] flex flex-col justify-between shadow-xl relative overflow-hidden"
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: color.stroke }}
                    />

                    <div>
                      {/* Avatar & Username */}
                      <div className="flex items-center gap-3.5 mb-5">
                        <img
                          src={d.developer.avatarUrl || 'https://github.com/identicons/stackpulse.png'}
                          alt={d.developer.username}
                          className="w-14 h-14 rounded-2xl border border-[#2f0000] object-cover"
                        />
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-white truncate">
                            {d.developer.name || d.developer.username}
                          </h3>
                          <span className={`text-xs font-mono ${color.text}`}>
                            @{d.developer.username}
                          </span>
                        </div>
                      </div>

                      {/* Key Metric Highlights */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-[#0f0606] border border-[#2f0000]">
                          <span className="text-[11px] text-[#94a3b8] block">Followers</span>
                          <span className="text-lg font-bold text-white font-mono">
                            {d.developer.followers.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-[#0f0606] border border-[#2f0000]">
                          <span className="text-[11px] text-[#94a3b8] block">Owned Stars</span>
                          <span className="text-lg font-bold text-white font-mono">
                            {d.signals.summary.totalStars.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* 4 Signals Bar Breakdown */}
                      <div className="space-y-3 pt-4 border-t border-[#2f0000]">
                        
                        {/* Reach */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#94a3b8] flex items-center gap-1">
                              Reach {isReachLeader && <Trophy className="w-3 h-3 text-[#f43f5e]" />}
                            </span>
                            <span className="font-mono font-bold text-white">
                              {d.signals.reach.score !== null ? (
                                d.signals.reach.score
                              ) : (
                                <span className="text-xs text-[#94a3b8] font-normal italic">N/A</span>
                              )}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#0f0606] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${d.signals.reach.score ?? 0}%`, backgroundColor: color.stroke }}
                            />
                          </div>
                        </div>

                        {/* Impact */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#94a3b8] flex items-center gap-1">
                              Impact {isImpactLeader && <Trophy className="w-3 h-3 text-[#f59e0b]" />}
                            </span>
                            <span className="font-mono font-bold text-white">
                              {d.signals.impact.score !== null ? (
                                d.signals.impact.score
                              ) : (
                                <span className="text-xs text-[#94a3b8] font-normal italic">N/A</span>
                              )}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#0f0606] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${d.signals.impact.score ?? 0}%`, backgroundColor: color.stroke }}
                            />
                          </div>
                        </div>

                        {/* Activity */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#94a3b8] flex items-center gap-1">
                              Activity {isActivityLeader && <Trophy className="w-3 h-3 text-[#10b981]" />}
                            </span>
                            <span className="font-mono font-bold text-white">
                              {d.signals.activity.score !== null ? (
                                `${d.signals.activity.score}%`
                              ) : (
                                <span className="text-xs text-[#94a3b8] font-normal italic">N/A</span>
                              )}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#0f0606] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${d.signals.activity.score ?? 0}%`, backgroundColor: color.stroke }}
                            />
                          </div>
                        </div>

                        {/* Breadth */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#94a3b8] flex items-center gap-1">
                              Breadth {isBreadthLeader && <Trophy className="w-3 h-3 text-[#38bdf8]" />}
                            </span>
                            <span className="font-mono font-bold text-white">
                              {d.signals.breadth.score !== null ? (
                                d.signals.breadth.score
                              ) : (
                                <span className="text-xs text-[#94a3b8] font-normal italic">N/A</span>
                              )}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#0f0606] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${d.signals.breadth.score ?? 0}%`, backgroundColor: color.stroke }}
                            />
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="mt-6 pt-3 border-t border-[#2f0000] text-[11px] text-[#64748b] font-mono flex items-center justify-between">
                      <span>{d.signals.summary.dataQualityNote}</span>
                      <button
                        onClick={() => navigate(`/profile/${d.developer.username}`)}
                        className="text-[#fb7185] hover:underline"
                      >
                        Profile →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Transparent Signal Score Formulas Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#170909] border border-[#2f0000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#e11d48] block mb-0.5">
                  Signature Feature · Explainable Signal Formulas
                </span>
                <span className="text-xs text-[#94a3b8]">
                  Deterministic heuristics calculated from owned repos (forks excluded):
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto font-mono text-[11px]">
                <div className="p-2 rounded-xl bg-[#0f0606] border border-[#2f0000]">
                  <span className="text-[#fb7185] font-bold block">Reach</span>
                  <span className="text-[#94a3b8]">min(100, 25×log10)</span>
                </div>
                <div className="p-2 rounded-xl bg-[#0f0606] border border-[#2f0000]">
                  <span className="text-[#f59e0b] font-bold block">Impact</span>
                  <span className="text-[#94a3b8]">min(100, 20×log10)</span>
                </div>
                <div className="p-2 rounded-xl bg-[#0f0606] border border-[#2f0000]">
                  <span className="text-[#10b981] font-bold block">Activity</span>
                  <span className="text-[#94a3b8]">% pushed in 90d</span>
                </div>
                <div className="p-2 rounded-xl bg-[#0f0606] border border-[#2f0000]">
                  <span className="text-[#38bdf8] font-bold block">Breadth</span>
                  <span className="text-[#94a3b8]">min(100, count×15)</span>
                </div>
              </div>
            </div>

            {/* Radar Chart Section */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#170909] border border-[#2f0000] shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Signal Score Radar</h2>
                  <p className="text-xs text-[#94a3b8]">
                    Normalized comparison across all 4 signal dimensions (0 to 100)
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  {data.developers.map((d, idx) => (
                    <div key={d.developer.id} className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: DEVELOPER_COLORS[idx % DEVELOPER_COLORS.length].stroke }}
                      />
                      <span>@{d.developer.username}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radar Visualization */}
              <div className="w-full h-80 sm:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarChartData}>
                    <PolarGrid stroke="#2f0000" />
                    <PolarAngleAxis dataKey="signal" stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 13 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#490000" tick={{ fill: '#64748b' }} />
                    {data.developers.map((d, idx) => {
                      const color = DEVELOPER_COLORS[idx % DEVELOPER_COLORS.length];
                      return (
                        <Radar
                          key={d.developer.id}
                          name={`@${d.developer.username}`}
                          dataKey={d.developer.username}
                          stroke={color.stroke}
                          fill={color.fill}
                          fillOpacity={0.25}
                        />
                      );
                    })}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#170909',
                        borderColor: '#2f0000',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(value: any) => [
                        value === null || value === undefined ? 'Unavailable' : `${value}/100`,
                        '',
                      ]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Primary Language Distribution Chart */}
            {data.languageBreakdown && data.languageBreakdown.length > 0 && (
              <div className="p-6 sm:p-8 rounded-3xl bg-[#170909] border border-[#2f0000] shadow-xl">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Language Comparison</h2>
                  <p className="text-xs text-[#94a3b8]">
                    Number of owned repositories by primary programming language
                  </p>
                </div>

                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.languageBreakdown.slice(0, 8)}>
                      <XAxis dataKey="language" stroke="#64748b" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#170909',
                          borderColor: '#2f0000',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      {data.developers.map((d, idx) => (
                        <Bar
                          key={d.developer.id}
                          dataKey={d.developer.username}
                          fill={DEVELOPER_COLORS[idx % DEVELOPER_COLORS.length].stroke}
                          radius={[6, 6, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      {/* Save Comparison Modal */}
      {isSaving && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#170909] border border-[#2f0000] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Save Comparison</h3>
            <p className="text-xs text-[#94a3b8] mb-4">
              Save this head-to-head comparison to reopen it anytime from your dashboard.
            </p>

            {saveSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Comparison saved successfully to your dashboard!</span>
              </div>
            ) : (
              <>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1.5 uppercase">
                  Comparison Name
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  maxLength={60}
                  placeholder="e.g. React vs Vue Architects"
                  className="w-full p-3 rounded-xl bg-[#0f0606] border border-[#2f0000] text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#e11d48]"
                />

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsSaving(false)}
                    className="px-4 py-2 rounded-xl bg-[#200b0b] hover:bg-[#2f0000] text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saveLoading || !saveName.trim()}
                    onClick={handleSaveComparison}
                    className="px-4 py-2 rounded-xl bg-[#e11d48] hover:bg-[#ff2d55] text-xs text-white font-semibold shadow-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {saveLoading ? 'Saving...' : 'Save Comparison'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
