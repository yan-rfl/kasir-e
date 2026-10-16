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
    <header className="sticky top-0 z-30 bg-emerald-700 text-white shadow-md select-none print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Left: Brand & Store Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-emerald-700 flex items-center justify-center font-black text-xl shadow-inner shrink-0">
            168
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg leading-tight tracking-wide line-clamp-1">
              {profile.storeName || 'Pondok Bakso 168 DOI'}
            </h1>
            <p className="text-xs text-emerald-200">
              {isFirebaseConfigured && user ? (
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-emerald-300 inline" /> {user.email || t.onlineMode}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <WifiOff className="w-3 h-3 text-amber-300 inline" /> {t.demoMode}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5 bg-emerald-800/60 p-1.5 rounded-2xl border border-emerald-600/40">
          <button
            type="button"
            onClick={() => handleTabClick('pos')}
            className={`h-10 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'pos'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-emerald-100 hover:bg-emerald-700/70'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t.navPos}</span>
            {cartCount > 0 && (
              <span className="bg-amber-400 text-emerald-950 text-xs px-2 py-0.5 rounded-full font-black">
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('menu')}
            className={`h-10 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'menu'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-emerald-100 hover:bg-emerald-700/70'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>{t.navMenu}</span>
            <Lock className="w-3 h-3 text-emerald-300/80" />
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('tx')}
            className={`h-10 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'tx'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-emerald-100 hover:bg-emerald-700/70'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>{t.navTransactions}</span>
            <Lock className="w-3 h-3 text-emerald-300/80" />
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('settings')}
            className={`h-10 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'settings'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-emerald-100 hover:bg-emerald-700/70'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{t.navSettings}</span>
            <Lock className="w-3 h-3 text-emerald-300/80" />
          </button>
        </nav>

        {/* Right: Quick Actions (Printer, Language) */}
        <div className="flex items-center gap-2">
          {/* Bluetooth Thermal Printer Button */}
          <button
            type="button"
            onClick={toggleBluetooth}
            disabled={btLoading}
            title={isBtConnected ? t.printerConnected : t.connectPrinter}
            className={`h-10 px-3 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              isBtConnected
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-emerald-800/80 text-emerald-200 border-emerald-600/50 hover:bg-emerald-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">
              {btLoading ? t.searchingDevice : isBtConnected ? '58mm ON' : t.connectPrinter}
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isBtConnected ? 'bg-emerald-300 animate-pulse' : 'bg-gray-400'
              }`}
            />
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
            className="h-10 px-3 rounded-xl text-xs font-black bg-emerald-800/80 text-emerald-100 border border-emerald-600/50 hover:bg-emerald-800 flex items-center gap-1.5 transition-all"
            title="Ganti Bahasa / Switch Language"
          >
            <Languages className="w-4 h-4" />
            <span>{language.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* Bottom Bar for Mobile Screens */}
      <div className="md:hidden flex items-center justify-around bg-emerald-800 border-t border-emerald-600/40 py-1.5 px-2">
        <button
          type="button"
          onClick={() => handleTabClick('pos')}
          className={`flex-1 py-1.5 px-1 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all ${
            activeTab === 'pos' ? 'bg-emerald-700 text-white font-bold' : 'text-emerald-200'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-400 text-emerald-950 text-[10px] w-4 h-4 rounded-full font-black flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <span>{t.navPos}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('menu')}
          className={`flex-1 py-1.5 px-1 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all ${
            activeTab === 'menu' ? 'bg-emerald-700 text-white font-bold' : 'text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-0.5">
            <UtensilsCrossed className="w-5 h-5" />
            <Lock className="w-2.5 h-2.5 text-emerald-300" />
          </div>
          <span>{t.navMenu}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('tx')}
          className={`flex-1 py-1.5 px-1 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all ${
            activeTab === 'tx' ? 'bg-emerald-700 text-white font-bold' : 'text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-0.5">
            <Receipt className="w-5 h-5" />
            <Lock className="w-2.5 h-2.5 text-emerald-300" />
          </div>
          <span>{t.navTransactions}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('settings')}
          className={`flex-1 py-1.5 px-1 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all ${
            activeTab === 'settings' ? 'bg-emerald-700 text-white font-bold' : 'text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-0.5">
            <Settings className="w-5 h-5" />
            <Lock className="w-2.5 h-2.5 text-emerald-300" />
          </div>
          <span>{t.navSettings}</span>
        </button>
      </div>
    </header>
  );
};
