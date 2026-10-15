import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Search, GitCompare, LayoutDashboard, LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Global '/' keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        if (window.innerWidth < 640) {
          setMobileSearchOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 50);
        } else {
          searchInputRef.current?.focus();
        }
      } else if (e.key === 'Escape' && mobileSearchOpen) {
        setMobileSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileSearchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      toast.warning('Please enter a GitHub username to inspect');
      return;
    }
    navigate(`/profile/${encodeURIComponent(query.toLowerCase())}`);
    setSearchQuery('');
    setMobileSearchOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('You have been signed out successfully');
      navigate('/auth');
    } catch {
      toast.error('Failed to log out. Please try again.');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#170909]/90 backdrop-blur-md border-b border-[#2f0000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        
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

        {/* Global Developer Search Bar (Desktop) */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
          <div className="relative group">
            <Search className="w-4 h-4 text-[#94a3b8] group-focus-within:text-[#e11d48] absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search developer (e.g. torvalds, gaearon)..."
              className="w-full pl-10 pr-10 py-2 rounded-xl bg-[#0f0606] border border-[#2f0000] text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48]/30 transition-all"
            />
            <kbd className="hidden md:inline-flex items-center absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-[#64748b] bg-[#170909] border border-[#2f0000] rounded">
              /
            </kbd>
          </div>
        </form>

        {/* Navigation & User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          
          {/* Mobile Search Toggle */}
          <button
            onClick={() => {
              setMobileSearchOpen(!mobileSearchOpen);
              if (!mobileSearchOpen) {
                setTimeout(() => mobileInputRef.current?.focus(), 50);
              }
            }}
            className="sm:hidden p-2 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#200b0b] transition-colors cursor-pointer"
            aria-label="Toggle search"
            title="Search developer"
          >
            {mobileSearchOpen ? <X className="w-4 h-4 text-[#fb7185]" /> : <Search className="w-4 h-4" />}
          </button>

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
            <div className="flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-[#2f0000]">
              <span className="text-xs text-[#94a3b8] font-mono hidden lg:inline max-w-[140px] truncate" title={user.email}>
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 rounded-lg text-[#94a3b8] hover:text-[#fb7185] hover:bg-[#200b0b] transition-colors cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Mobile Search Dropdown */}
      {mobileSearchOpen && (
        <div className="sm:hidden px-4 pb-3 pt-1 border-t border-[#2f0000]/60 bg-[#170909] animate-in fade-in slide-in-from-top-2 duration-150">
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={mobileInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search GitHub username..."
              className="w-full pl-9 pr-16 py-2 rounded-xl bg-[#0f0606] border border-[#2f0000] text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#e11d48]"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#e11d48] text-white font-semibold text-xs cursor-pointer"
            >
              Go
            </button>
          </form>
        </div>
      )}
    </header>
  );
};
