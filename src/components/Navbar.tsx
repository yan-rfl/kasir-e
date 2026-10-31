'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useStore } from '@/context/StoreContext';
import { bluetoothPrinter } from '@/lib/bluetoothPrinter';
import {
  UtensilsCrossed,
  Receipt,
  Settings,
  Printer,
  Wifi,
  WifiOff,
  Lock,
  MoreVertical,
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
  const { t } = useLanguage();
  const { profile, isFirebaseConfigured, user } = useAuth();
  const { cartCount } = useStore();

  const [isBtConnected, setIsBtConnected] = useState(bluetoothPrinter.isConnected());
  const [btLoading, setBtLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Sync Bluetooth connection state and run auto-reconnect
  React.useEffect(() => {
    setIsBtConnected(bluetoothPrinter.isConnected());
    const unsub = bluetoothPrinter.addConnectionListener((connected) => {
      setIsBtConnected(connected);
    });

    // Auto-reconnect if previously connected
    bluetoothPrinter.initAutoReconnect().catch(() => {});

    return () => {
      unsub();
    };
  }, []);

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

  return (
    <>
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 bg-emerald-700 text-white shadow-md select-none print:hidden w-full overflow-visible">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3 w-full">
          {/* Left: Brand & Store Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white text-emerald-700 flex items-center justify-center shadow-inner shrink-0">
              {/* Cashier Register Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700"
              >
                <rect width="18" height="12" x="3" y="9" rx="2" />
                <path d="M7 9V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" />
                <line x1="7" x2="17" y1="13" y2="13" />
                <line x1="7" x2="9" y1="17" y2="17" />
                <line x1="12" x2="14" y1="17" y2="17" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-lg sm:text-xl tracking-tight text-white whitespace-nowrap select-none">
                  Kasir-E
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-800/90 text-emerald-100 border border-emerald-600/60 truncate max-w-[140px] md:max-w-[200px]">
                  {profile.storeName || 'Toko Saya'}
                </span>
              </div>
              <div className="text-[11px] text-emerald-200 flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                <span className="sm:hidden font-bold text-white truncate max-w-[110px]">
                  {profile.storeName || 'Toko Saya'}
                </span>
                <span className="sm:hidden text-emerald-300/50">•</span>
                {isFirebaseConfigured && user ? (
                  <span className="inline-flex items-center gap-1 text-emerald-100 font-bold">
                    <Wifi className="w-3 h-3 text-emerald-300 inline shrink-0" />
                    <span>Online</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-200 font-bold">
                    <WifiOff className="w-3 h-3 text-amber-300 inline shrink-0" />
                    <span>Offline</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick Actions (Bluetooth Printer, Three-Dots Menu) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Bluetooth Thermal Printer Button */}
            <button
              type="button"
              onClick={toggleBluetooth}
              disabled={btLoading}
              title={isBtConnected ? t.printerConnected : t.connectPrinter}
              className={`h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 sm:gap-2 border whitespace-nowrap transition-all shadow-sm ${
                isBtConnected
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-emerald-800/80 text-emerald-100 border-emerald-600/50 hover:bg-emerald-800'
              }`}
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">
                {btLoading ? '...' : isBtConnected ? t.printerBtnConnected : t.printerBtnShort}
              </span>
              <span
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ${
                  isBtConnected ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'
                }`}
              />
            </button>

            {/* Three-dots Menu Button & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-emerald-100 border flex items-center justify-center transition-all shadow-sm ${
                  isMenuOpen
                    ? 'bg-emerald-900 border-emerald-400 text-white'
                    : 'bg-emerald-800/80 border-emerald-600/50 hover:bg-emerald-800'
                }`}
                title="Menu"
                aria-label="Menu"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 sm:w-60 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 text-slate-800 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Menu Navigasi
                      </p>
                    </div>
                    <div className="p-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenPinModal('menu');
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-all text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <UtensilsCrossed className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block leading-tight">{t.navMenu}</span>
                            <span className="text-[10px] text-slate-400 font-normal">Daftar & kelola menu</span>
                          </div>
                        </div>
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenPinModal('tx');
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-all text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block leading-tight">{t.navTransactions}</span>
                            <span className="text-[10px] text-slate-400 font-normal">Riwayat transaksi</span>
                          </div>
                        </div>
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenPinModal('settings');
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-all text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Settings className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block leading-tight">{t.navSettings}</span>
                            <span className="text-[10px] text-slate-400 font-normal">Pengaturan toko & PIN</span>
                          </div>
                        </div>
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
