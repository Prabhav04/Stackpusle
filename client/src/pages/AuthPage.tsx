import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, ArrowRight, Eye, EyeOff, CheckCircle2, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const AuthPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const { login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      toast.warning('Please resolve form validation issues before submitting');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
        toast.success('Account created successfully! Welcome to StackPulse.');
      } else {
        await login(email, password);
        toast.success('Welcome back to StackPulse!');
      }
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-transparent relative overflow-hidden">
      {/* Ambient background glow accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#650000]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#e11d48]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Split-Card Modal (Wise/Linear inspired telemetry aesthetic) */}
      <div className="w-full max-w-4xl bg-[#170909] border border-[#2f0000] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10">
        
        {/* Left Column: Showcase Banner */}
        <div className="md:w-5/12 bg-gradient-to-br from-[#240a0a] via-[#1c0808] to-[#120505] p-8 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#2f0000] relative">
          
          {/* Top Pill Graphic */}
          <div>
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#350d0d] border border-[#490000] text-xs font-semibold tracking-wide text-[#fb7185] mb-8">
              <span className="w-2 h-2 rounded-full bg-[#e11d48] animate-pulse" />
              SIGNAL SCORE ENGINE
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight uppercase">
              Real Signals.<br />
              <span className="text-[#e11d48]">No Black Box.</span>
            </h2>

            <p className="mt-4 text-sm text-[#94a3b8] leading-relaxed">
              Compare GitHub developers side-by-side with 4 explainable, deterministic indicators: Reach, Impact, Activity, and Breadth.
            </p>
          </div>

          {/* Value Props Pill Features */}
          <div className="mt-8 space-y-3 pt-6 border-t border-[#2f0000]/80">
            <div className="flex items-center gap-2.5 text-xs text-[#cbd5e1]">
              <CheckCircle2 className="w-4 h-4 text-[#e11d48] shrink-0" />
              <span>Transparent formulas with quality labels</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#cbd5e1]">
              <CheckCircle2 className="w-4 h-4 text-[#e11d48] shrink-0" />
              <span>Forks excluded from repo impact stats</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#cbd5e1]">
              <CheckCircle2 className="w-4 h-4 text-[#e11d48] shrink-0" />
              <span>Pin repositories with custom review notes</span>
            </div>
          </div>

          {/* Bottom highlight pill */}
          <div className="mt-8 pt-4 flex items-center justify-between text-xs text-[#94a3b8]">
            <span className="font-mono text-[#fb7185]/80">STACKPULSE · 48H BUILD</span>
            <div className="w-8 h-8 rounded-full bg-[#350d0d] border border-[#490000] flex items-center justify-center text-[#e11d48]">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Right Column: Clean Auth Form */}
        <div className="md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-[#170909]">
          
          {/* Logo & Header */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#650000] to-[#e11d48] flex items-center justify-center shadow-lg shadow-[#e11d48]/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">StackPulse</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {isRegister ? 'Create an account.' : 'Welcome back.'}
          </h1>

          <p className="mt-1.5 text-sm text-[#94a3b8]">
            {isRegister ? 'Already have an account? ' : 'New to StackPulse? '}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setServerError(null);
                setFieldErrors({});
              }}
              className="text-[#e11d48] hover:text-[#fb7185] font-semibold underline underline-offset-4 cursor-pointer transition-colors"
            >
              {isRegister ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          {/* Server Error Message */}
          {serverError && (
            <div className="mt-4 p-3.5 rounded-xl bg-[#490000]/40 border border-[#650000] text-sm text-[#fecdd3] flex items-center gap-2 animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-[#e11d48] shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] mb-1.5 uppercase tracking-wider">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                  }}
                  placeholder="developer@example.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-[#0f0606] border text-white placeholder-[#64748b] text-sm focus:outline-none transition-all ${
                    fieldErrors.email
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
                      : 'border-[#2f0000] focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/20'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs text-red-400 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider">
                  Password
                </label>
                {isRegister && (
                  <span className={`text-[11px] font-mono ${password.length >= 8 ? 'text-emerald-400' : 'text-[#64748b]'}`}>
                    {password.length >= 8 ? '✓ Min length met' : 'Min 8 characters'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                  placeholder="At least 8 characters"
                  className={`w-full pl-10 pr-11 py-3 rounded-xl bg-[#0f0606] border text-white placeholder-[#64748b] text-sm focus:outline-none transition-all ${
                    fieldErrors.password
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
                      : 'border-[#2f0000] focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8] transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-red-400 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-6 rounded-full bg-[#e11d48] hover:bg-[#ff2d55] active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-[#e11d48]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Create Account' : 'Log in'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security & Architecture Note */}
          <div className="mt-8 pt-4 border-t border-[#2f0000] flex items-center justify-center gap-2 text-[11px] text-[#64748b]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
            <span>Session cookie auth · bcrypt password hashing · Zero plain text</span>
          </div>
        </div>

      </div>
    </div>
  );
};
