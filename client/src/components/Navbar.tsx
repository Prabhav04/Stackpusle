import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Search, GitCompare, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/profile/${encodeURIComponent(query.toLowerCase())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#170909]/90 backdrop-blur-md border-b border-[#2f0000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#650000] to-[#e11d48] flex items-center justify-center shadow-md shadow-[#e11d48]/20 group-hover:scale-105 transition-transform">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            StackPulse
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#350d0d] text-[#fb7185] border border-[#490000]">
              v1.0
            </span>
          </span>
        </Link>

        {/* Global Developer Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any GitHub developer (e.g. torvalds, gaearon)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0f0606] border border-[#2f0000] text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48]/30 transition-all"
            />
          </div>
        </form>

        {/* Navigation & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/dashboard"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
              location.pathname === '/dashboard'
                ? 'bg-[#350d0d] text-[#fb7185] border border-[#490000]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#200b0b]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>

          <Link
            to="/compare"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
              location.pathname.startsWith('/compare')
                ? 'bg-[#350d0d] text-[#fb7185] border border-[#490000]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#200b0b]'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>Compare</span>
          </Link>

          {/* User Email & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#2f0000]">
              <span className="text-xs text-[#94a3b8] font-mono hidden lg:inline max-w-[140px] truncate">
                {user.email}
              </span>
              <button
                onClick={logout}
                title="Log out"
                className="p-2 rounded-lg text-[#94a3b8] hover:text-[#fb7185] hover:bg-[#200b0b] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
