import React, { useState } from 'react';
import {
  Zap,
  Mail,
  Lock,
  User as UserIcon,
  Building,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Instagram,
  ShieldCheck,
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { User } from '../../shared/types';

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const res = await ApiClient.signUp({
          email: email.trim(),
          password: password.trim(),
          fullName: fullName.trim() || undefined,
          companyName: companyName.trim() || undefined,
        });
        if (res.success && res.user) {
          setSuccessMessage('Account created successfully! Loading your dashboard...');
          setTimeout(() => {
            onAuthSuccess(res.user);
          }, 800);
        }
      } else {
        const res = await ApiClient.signIn({
          email: email.trim(),
          password: password.trim(),
        });
        if (res.success && res.user) {
          setSuccessMessage('Welcome back! Loading your workspace...');
          setTimeout(() => {
            onAuthSuccess(res.user);
          }, 600);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await ApiClient.signIn({
        email: 'thevelocityexports@gmail.com',
        password: 'password123',
      });
      if (res.success && res.user) {
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to sign in with demo credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#f8fafc] text-slate-800 font-sans select-none">
      {/* LEFT BRAND PANEL (Highlights & Manychat aesthetic) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#0066ff]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#e11d48]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0066ff] to-[#00d2ff] flex items-center justify-center shadow-lg shadow-[#0066ff]/30 text-white font-black text-xl tracking-tighter">
            <Zap className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white">instaflow</span>
            <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white/10 text-sky-300 rounded-md">
              PRO
            </span>
          </div>
        </div>

        {/* Center Feature Highlights */}
        <div className="relative z-10 space-y-8 max-w-lg my-auto">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-sky-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Dedicated Customer Database
            </span>
            <h1 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight">
              Automate Instagram Comments into High-Converting DMs
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every account gets an isolated, persistent cloud database to safely store Instagram tokens, reels, comment keyword triggers, and live DM flows.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">100% Data Isolation</p>
                <p className="text-slate-400">Your connected Instagram tokens and automations are strictly separated in your personal customer database.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                <Instagram className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Permanent Live Reel Sync</p>
                <p className="text-slate-400">Synced reels and post thumbnails never reset across tab changes, browser refreshes, or serverless deployments.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom footer */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between border-t border-white/10 pt-6">
          <span>© 2026 InstaFlow Inc. All rights reserved.</span>
          <span className="text-slate-500">Official Meta Graph API Integration</span>
        </div>
      </div>

      {/* RIGHT AUTH FORM PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="lg:hidden flex items-center justify-center sm:justify-start gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0066ff] flex items-center justify-center text-white font-bold text-lg">
                <Zap className="w-4 h-4 fill-white text-white" />
              </div>
              <span className="text-lg font-black text-slate-900">instaflow</span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              {mode === 'signup' ? 'Create your InstaFlow account' : 'Sign in to your workspace'}
            </h2>
            <p className="text-xs text-slate-500">
              {mode === 'signup'
                ? 'Sign up with your email to create a dedicated customer database.'
                : 'Enter your email and password to access your live automations.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign Up (New Customer)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
          </div>

          {/* Status Alerts */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0066ff] shadow-2xs transition-all"
                    />
                  </div>
                </div>

                {/* Company / Brand Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Business / Brand Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Panchaloha Jewels"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0066ff] shadow-2xs transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0066ff] shadow-2xs transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                {mode === 'signin' && (
                  <span className="text-[11px] text-[#0066ff] hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0066ff] shadow-2xs transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Customer Database & Sign Up' : 'Sign In to Workspace'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[#f8fafc] px-2 text-slate-400 font-semibold tracking-wider">
                Or Quick Start
              </span>
            </div>
          </div>

          {/* Demo Login Button */}
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={isLoading}
            className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Sign In as Admin Demo Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
