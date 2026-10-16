'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Lock, LogIn, Mail, KeyRound, Sparkles, CheckCircle2, ShieldCheck, Languages } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const {
    loginWithEmail,
    registerWithEmail,
    loginDemo,
    isFirebaseConfigured,
  } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [email, setEmail] = useState('ryan.rafael2004@gmail.com');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Email dan password wajib diisi');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (isFirebaseConfigured) {
        if (isRegisterMode) {
          await registerWithEmail(email.trim(), password);
        } else {
          await loginWithEmail(email.trim(), password);
        }
      } else {
        // Fallback demo/offline login
        loginDemo();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk akun. Silakan periksa kembali email & password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      {/* Language Switcher Top Right */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
          className="h-10 px-3.5 rounded-xl text-xs font-black bg-white text-slate-800 border border-slate-200 shadow-sm hover:bg-slate-50 flex items-center gap-1.5 transition-all"
        >
          <Languages className="w-4 h-4 text-emerald-600" />
          <span>{language.toUpperCase()}</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 sm:p-8 border border-slate-200">
        {/* Brand & Store Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-2xl mx-auto mb-3 shadow-md">
            168
          </div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">
            Pondok Bakso 168 DOI
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t.loginSubtitle}
          </p>
        </div>

        {/* Notice */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 mb-5 flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          <p className="text-xs text-emerald-900 font-semibold leading-relaxed">
            {t.loginRequiredNotice}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl mb-4">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.emailLabel}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ryan.rafael2004@gmail.com"
                className="w-full h-12 pl-10 pr-3.5 rounded-xl border border-slate-300 font-semibold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 pl-10 pr-3.5 rounded-xl border border-slate-300 font-semibold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] font-black text-white text-base shadow-md transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            <span>
              {loading
                ? '...'
                : isRegisterMode
                ? t.registerBtn
                : t.loginBtn}
            </span>
          </button>
        </form>

        {/* Toggle Register / Login */}
        {isFirebaseConfigured && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              {isRegisterMode
                ? 'Sudah punya akun? Masuk di sini'
                : 'Belum punya akun? Buat akun baru'}
            </button>
          </div>
        )}

        {/* Offline / Demo Direct Login */}
        <div className="mt-5 pt-5 border-t border-slate-200">
          <button
            type="button"
            onClick={loginDemo}
            className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-200"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>{t.demoBypassBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
