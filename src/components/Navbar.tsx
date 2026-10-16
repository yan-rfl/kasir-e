'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useStore } from '@/context/StoreContext';
import { bluetoothPrinter } from '@/lib/bluetoothPrinter';
import {
  ShoppingBag,
  UtensilsCrossed,
  Receipt,
  Settings,
  Printer,
  Wifi,
  WifiOff,
  Languages,
  Lock,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'pos' | 'menu' | 'tx' | 'settings';
  setActiveTab: (tab: 'pos' | 'menu' | 'tx' | 'settings') => void;
  onOpenPinModal: (action: 'menu' | 'tx' | 'settings' | 'reset') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenPinModal,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { profile, isFirebaseConfigured, user } = useAuth();
  const { cartCount } = useStore();

  const [isBtConnected, setIsBtConnected] = useState(bluetoothPrinter.isConnected());
  const [btLoading, setBtLoading] = useState(false);

  const toggleBluetooth = async () => {
    if (bluetoothPrinter.isConnected()) {
      await bluetoothPrinter.disconnect();
      setIsBtConnected(false);
    } else {
      setBtLoading(true);
      try {
        await bluetoothPrinter.connect();
        setIsBtConnected(true);
      } catch (err: any) {
        alert(err.message || 'Gagal menyambungkan Bluetooth');
      } finally {
        setBtLoading(false);
      }
    }
  };

  const handleTabClick = (tab: 'pos' | 'menu' | 'tx' | 'settings') => {
    if (tab === 'pos') {
      setActiveTab('pos');
    } else {
      onOpenPinModal(tab);
    }
  };

  return (
    <>
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 bg-emerald-700 text-white shadow-md select-none print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
          {/* Left: Brand & Store Name (guaranteed no line-wrap on Kasir-E) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white text-emerald-700 flex items-center justify-center shadow-inner shrink-0">
              {/* Cashier Register Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6 text-emerald-700"
              >
                <rect width="18" height="12" x="3" y="9" rx="2" />
                <path d="M7 9V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" />
                <line x1="7" x2="17" y1="13" y2="13" />
                <line x1="7" x2="9" y1="17" y2="17" />
                <line x1="12" x2="14" y1="17" y2="17" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-nowrap">
                <span className="font-black text-xl tracking-tight text-white whitespace-nowrap select-none">
                  Kasir-E
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-800/90 text-emerald-100 border border-emerald-600/60 truncate max-w-[140px] md:max-w-[200px] whitespace-nowrap">
                  {profile.storeName || 'Toko Saya'}
                </span>
              </div>
              <div className="text-[11px] text-emerald-200 flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                <span className="sm:hidden font-bold text-white truncate max-w-[120px]">
                  {profile.storeName || 'Toko Saya'} •
                </span>
                {isFirebaseConfigured && user ? (
                  <span className="flex items-center gap-1 truncate max-w-[120px] sm:max-w-[180px]">
                    <Wifi className="w-3 h-3 text-emerald-300 inline shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <WifiOff className="w-3 h-3 text-amber-300 inline shrink-0" />
                    <span>{t.demoMode}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs (Consistent Sizing & Clean Alignment) */}
          <nav className="hidden md:flex items-center gap-1 bg-emerald-800/70 p-1 rounded-2xl border border-emerald-600/50 shrink-0">
            <button
              type="button"
              onClick={() => handleTabClick('pos')}
              className={`h-10 px-4 rounded-xl text-xs lg:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                activeTab === 'pos'
                  ? 'bg-white text-emerald-900 shadow-md font-black border border-white'
                  : 'text-emerald-100 hover:bg-emerald-700/80 border border-transparent'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t.navPos}</span>
              {cartCount > 0 && (
                <span className="bg-amber-400 text-emerald-950 text-xs px-2 py-0.5 rounded-full font-black ml-0.5">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('menu')}
              className={`h-10 px-4 rounded-xl text-xs lg:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                activeTab === 'menu'
                  ? 'bg-white text-emerald-900 shadow-md font-black border border-white'
                  : 'text-emerald-100 hover:bg-emerald-700/80 border border-transparent'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>{t.navMenu}</span>
              <Lock className="w-3 h-3 text-emerald-300/80" />
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('tx')}
              className={`h-10 px-4 rounded-xl text-xs lg:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                activeTab === 'tx'
                  ? 'bg-white text-emerald-900 shadow-md font-black border border-white'
                  : 'text-emerald-100 hover:bg-emerald-700/80 border border-transparent'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>{t.navTransactions}</span>
              <Lock className="w-3 h-3 text-emerald-300/80" />
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('settings')}
              className={`h-10 px-4 rounded-xl text-xs lg:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                activeTab === 'settings'
                  ? 'bg-white text-emerald-900 shadow-md font-black border border-white'
                  : 'text-emerald-100 hover:bg-emerald-700/80 border border-transparent'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{t.navSettings}</span>
              <Lock className="w-3 h-3 text-emerald-300/80" />
            </button>
          </nav>

          {/* Right: Quick Actions (Printer, Language) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Bluetooth Thermal Printer Button (Uniform h-10, no line breaks) */}
            <button
              type="button"
              onClick={toggleBluetooth}
              disabled={btLoading}
              title={isBtConnected ? t.printerConnected : t.connectPrinter}
              className={`h-10 px-3 sm:px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border whitespace-nowrap transition-all shadow-sm ${
                isBtConnected
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-emerald-800/80 text-emerald-100 border-emerald-600/50 hover:bg-emerald-800'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">
                {btLoading ? '...' : isBtConnected ? t.printerBtnConnected : t.printerBtnShort}
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isBtConnected ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'
                }`}
              />
            </button>

            {/* Language Switcher (Uniform h-10) */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
              className="h-10 px-3 rounded-xl text-xs font-black bg-emerald-800/80 text-emerald-100 border border-emerald-600/50 hover:bg-emerald-800 flex items-center gap-1.5 whitespace-nowrap transition-all shadow-sm"
              title="Ganti Bahasa / Switch Language"
            >
              <Languages className="w-4 h-4 text-emerald-300" />
              <span>{language.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Bar for Mobile & Small Tablets (< md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1 px-2 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => handleTabClick('pos')}
          className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
            activeTab === 'pos'
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[10px] w-4 h-4 rounded-full font-black flex items-center justify-center shadow-sm">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5">{t.navPos}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('menu')}
          className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
            activeTab === 'menu'
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-0.5">
            <UtensilsCrossed className="w-5 h-5" />
            <Lock className="w-2.5 h-2.5 text-slate-400" />
          </div>
          <span className="text-[11px] mt-0.5">{t.navMenu}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('tx')}
          className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
            activeTab === 'tx'
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-0.5">
            <Receipt className="w-5 h-5" />
            <Lock className="w-2.5 h-2.5 text-slate-400" />
          </div>
          <span className="text-[11px] mt-0.5">{t.navTransactions}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('settings')}
          className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
            activeTab === 'settings'
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-0.5">
            <Settings className="w-5 h-5" />
            <Lock className="w-2.5 h-2.5 text-slate-400" />
          </div>
          <span className="text-[11px] mt-0.5">{t.navSettings}</span>
        </button>
      </nav>
    </>
  );
};
