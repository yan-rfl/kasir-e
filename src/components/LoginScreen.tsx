'use client';

import React, { useState } from 'react';
import { useAuth, getDefaultStoreNameForUser } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { LogIn, Mail, KeyRound, Sparkles, ShieldCheck, Languages, Store, UserPlus } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const {
    loginWithEmail,
    registerWithEmail,
    loginDemo,
    isFirebaseConfigured,
  } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeNameInput, setStoreNameInput] = useState('');
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
          const finalStoreName = storeNameInput.trim() || getDefaultStoreNameForUser(email.trim());
          await registerWithEmail(email.trim(), password, finalStoreName);
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
        {/* Brand & Cashier Logo Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            {/* Cashier Register Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-9 h-9 text-white"
            >
              <rect width="18" height="12" x="3" y="9" rx="2" />
              <path d="M7 9V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" />
              <line x1="7" x2="17" y1="13" y2="13" />
              <line x1="7" x2="9" y1="17" y2="17" />
              <line x1="12" x2="14" y1="17" y2="17" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 leading-tight">
            Kasir-E
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isRegisterMode ? 'Daftarkan Toko / Cabang Baru' : t.loginSubtitle}
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
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Custom Store Name on Register */}
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Toko / Usaha (Opsional)
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={storeNameInput}
                  onChange={(e) => setStoreNameInput(e.target.value)}
                  placeholder="Contoh: Rumah Makan / Toko Berkah"
                  className="w-full h-12 pl-10 pr-3.5 rounded-xl border border-slate-300 font-semibold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

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
                placeholder="nama@email.com"
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
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] font-black text-white text-base shadow-md transition-all flex items-center justify-center gap-2 mt-2"
          >
            {isRegisterMode ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
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
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setErrorMsg(null);
              }}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              {isRegisterMode
                ? 'Sudah punya akun? Masuk di sini'
                : 'Belum punya akun? Buat akun toko baru'}
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
