'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useStore } from '@/context/StoreContext';
import { bluetoothPrinter } from '@/lib/bluetoothPrinter';
import { textToEscPosBytes } from '@/lib/escpos';
import { getStoredFirebaseConfig, saveStoredFirebaseConfig } from '@/lib/firebase';
import { ReceiptOptions, PrintPreset } from '@/types';
import {
  Settings,
  Store,
  KeyRound,
  Printer,
  Globe,
  Cloud,
  LogOut,
  Check,
  Sliders,
  Download,
  Laptop,
  Smartphone,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  Layers,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const {
    user,
    profile,
    isFirebaseConfigured,
    updateProfileData,
    updateOwnerPin,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    deleteCurrentStoreAndAccount,
    logout,
    reloadFirebase,
  } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { triggerBrowserPrint, categories } = useStore();

  // Store Info Form
  const [storeName, setStoreName] = useState(profile.storeName || 'Kasir-E POS');
  const [receiptHeader, setReceiptHeader] = useState(profile.receiptHeader || '');
  const [receiptFooter, setReceiptFooter] = useState(profile.receiptFooter || '');
  const [isSavedStore, setIsSavedStore] = useState(false);

  // Receipt Options Form
  const defaultReceiptOpts: ReceiptOptions = {
    printStoreName: profile.receiptOptions?.printStoreName ?? true,
    printStoreAddress: profile.receiptOptions?.printStoreAddress ?? true,
    printDateTime: profile.receiptOptions?.printDateTime ?? true,
    printNotes: profile.receiptOptions?.printNotes ?? true,
    printFooter: profile.receiptOptions?.printFooter ?? true,
  };
  const [receiptOpts, setReceiptOpts] = useState<ReceiptOptions>(defaultReceiptOpts);
  const [isSavedReceiptOpts, setIsSavedReceiptOpts] = useState(false);

  // Preset Summary Print State
  const defaultPresets: PrintPreset[] = [
    {
      id: 'preset-kawul',
      name: 'Rekap Kawul (Bakso)',
      filterKeywords: ['bakso'],
      category: 'all',
      showItemQty: true,
      showItemPrice: true,
      showTotalPrice: true,
    },
    {
      id: 'preset-mamah',
      name: 'Rekap Total (Semua Menu)',
      filterKeywords: [],
      category: 'all',
      showItemQty: true,
      showItemPrice: true,
      showTotalPrice: true,
    },
  ];

  const presets = profile.printPresets && profile.printPresets.length > 0
    ? profile.printPresets
    : defaultPresets;

  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PrintPreset | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetKeyword, setPresetKeyword] = useState('');
  const [presetCategory, setPresetCategory] = useState('all');
  const [presetShowQty, setPresetShowQty] = useState(true);
  const [presetShowPrice, setPresetShowPrice] = useState(true);
  const [presetShowTotal, setPresetShowTotal] = useState(true);

  // PIN Change Form
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Bluetooth State
  const [isBtConnected, setIsBtConnected] = useState(bluetoothPrinter.isConnected());
  const [btLoading, setBtLoading] = useState(false);
  const [btDeviceName, setBtDeviceName] = useState<string | null>(bluetoothPrinter.getDeviceName());

  // Firebase Auth Form
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Firebase Config Modal
  const [isFirebaseConfigModalOpen, setIsFirebaseConfigModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [appId, setAppId] = useState('');

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(standalone);
      setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      alert(t.iosInstallHint);
    } else {
      alert(`${t.desktopInstallHint}\n\n${t.iosInstallHint}`);
    }
  };

  const handleSaveStoreInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfileData({
      storeName: storeName.trim(),
      receiptHeader: receiptHeader.trim(),
      receiptFooter: receiptFooter.trim(),
    });
    setIsSavedStore(true);
    setTimeout(() => setIsSavedStore(false), 2500);
  };

  const handleToggleReceiptOpt = async (key: keyof ReceiptOptions) => {
    const updated = {
      ...receiptOpts,
      [key]: !receiptOpts[key],
    };
    setReceiptOpts(updated);
    await updateProfileData({ receiptOptions: updated });
    setIsSavedReceiptOpts(true);
    setTimeout(() => setIsSavedReceiptOpts(false), 2000);
  };

  // Preset Handlers
  const handleOpenAddPreset = () => {
    setEditingPreset(null);
    setPresetName('');
    setPresetKeyword('');
    setPresetCategory('all');
    setPresetShowQty(true);
    setPresetShowPrice(true);
    setPresetShowTotal(true);
    setIsPresetModalOpen(true);
  };

  const handleOpenEditPreset = (p: PrintPreset) => {
    setEditingPreset(p);
    setPresetName(p.name);
    setPresetKeyword((p.filterKeywords || []).join(', '));
    setPresetCategory(p.category || 'all');
    setPresetShowQty(p.showItemQty ?? true);
    setPresetShowPrice(p.showItemPrice ?? true);
    setPresetShowTotal(p.showTotalPrice ?? true);
    setIsPresetModalOpen(true);
  };

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetName.trim()) {
      alert('Nama preset rekap wajib diisi');
      return;
    }
    const keywords = presetKeyword
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    let updatedList: PrintPreset[];
    if (editingPreset) {
      updatedList = presets.map((p) =>
        p.id === editingPreset.id
          ? {
              ...p,
              name: presetName.trim(),
              filterKeywords: keywords,
              category: presetCategory,
              showItemQty: presetShowQty,
              showItemPrice: presetShowPrice,
              showTotalPrice: presetShowTotal,
            }
          : p
      );
    } else {
      const newPreset: PrintPreset = {
        id: `preset-${Date.now()}`,
        name: presetName.trim(),
        filterKeywords: keywords,
        category: presetCategory,
        showItemQty: presetShowQty,
        showItemPrice: presetShowPrice,
        showTotalPrice: presetShowTotal,
      };
      updatedList = [...presets, newPreset];
    }

    await updateProfileData({ printPresets: updatedList });
    setIsPresetModalOpen(false);
  };

  const handleDeletePreset = async (id: string) => {
    if (presets.length <= 1) {
      alert('Minimal harus ada 1 preset cetak rekap');
      return;
    }
    const filtered = presets.filter((p) => p.id !== id);
    await updateProfileData({ printPresets: filtered });
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPin !== (profile.ownerPin || '123456')) {
      setPinMessage({ text: t.pinInvalid, error: true });
      return;
    }
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setPinMessage({ text: 'PIN harus 6 digit angka!', error: true });
      return;
    }
    await updateOwnerPin(newPin);
    setPinMessage({ text: 'PIN Pemilik berhasil diganti!', error: false });
    setOldPin('');
    setNewPin('');
    setTimeout(() => setPinMessage(null), 3000);
  };

  const handleConnectBt = async () => {
    setBtLoading(true);
    try {
      const res = await bluetoothPrinter.connect();
      setIsBtConnected(true);
      setBtDeviceName(res.name);
    } catch (err: any) {
      alert(err.message || 'Gagal menyambungkan Bluetooth');
    } finally {
      setBtLoading(false);
    }
  };

  const handleDisconnectBt = async () => {
    await bluetoothPrinter.disconnect();
    setIsBtConnected(false);
    setBtDeviceName(null);
  };

  const handleTestPrint = async () => {
    const testContent = `================================
       ${profile.storeName || 'KASIR-E POS'}
        TES CETAK THERMAL       
================================
Waktu : ${new Date().toLocaleTimeString('id-ID')}
Karakter per baris : 32 kolom   
12345678901234567890123456789012
--------------------------------
Printer berfungsi dengan baik!  
================================
`;
    if (bluetoothPrinter.isConnected()) {
      const bytes = textToEscPosBytes(testContent);
      await bluetoothPrinter.printBytes(bytes);
    } else {
      triggerBrowserPrint(testContent);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      await loginWithEmail(authEmail, authPassword);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Gagal masuk akun');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!authEmail || !authPassword) {
      setAuthError('Email dan password wajib diisi');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      await registerWithEmail(authEmail, authPassword);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Gagal mendaftar');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !projectId) {
      alert('API Key dan Project ID wajib diisi');
      return;
    }
    saveStoredFirebaseConfig({
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      appId: appId.trim(),
    });
    reloadFirebase();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-32 space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-7 h-7 text-emerald-600" />
          {t.settingsTitle}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {t.settingsSubtitle}
        </p>
      </div>

      {/* Balanced 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* ================= LEFT COLUMN ================= */}
        <div className="space-y-6">
          {/* Card 1: Store Information & Receipt Header */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-base md:text-lg flex items-center gap-2 mb-3">
              <Store className="w-5 h-5 text-emerald-600" />
              {t.storeInfo}
            </h3>

            <form onSubmit={handleSaveStoreInfo} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.storeName}
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.receiptHeader}
                </label>
                <input
                  type="text"
                  value={receiptHeader}
                  onChange={(e) => setReceiptHeader(e.target.value)}
                  placeholder="Jl. Raya No. 168 - Telp: 08123456789"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.receiptFooter}
                </label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="Terima Kasih - Selamat Menikmati"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-extrabold text-white text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all mt-2"
              >
                {isSavedStore ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Tersimpan!</span>
                  </>
                ) : (
                  <span>{t.save} {t.storeInfo}</span>
                )}
              </button>
            </form>
          </div>

          {/* Card 2: Preset Cetak Rekap (Manage Printed Summary Presets) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base md:text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  Preset Cetak Rekap Transaksi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atur tombol preset ringkasan penjualan yang muncul di tab Transaksi
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddPreset}
                className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm truncate">
                        {preset.name}
                      </span>
                      {preset.filterKeywords && preset.filterKeywords.length > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">
                          Kata: {preset.filterKeywords.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>Kategori: <b>{preset.category || 'Semua'}</b></span>
                      <span>•</span>
                      <span>Qty: <b>{preset.showItemQty ? 'Ya' : 'Tidak'}</b></span>
                      <span>•</span>
                      <span>Subtotal: <b>{preset.showItemPrice ? 'Ya' : 'Tidak'}</b></span>
                      <span>•</span>
                      <span>Total: <b>{preset.showTotalPrice ? 'Ya' : 'Tidak'}</b></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPreset(preset)}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-200 transition-all"
                      title="Edit Preset"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(preset.id)}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-rose-50 text-rose-600 flex items-center justify-center border border-slate-200 transition-all"
                      title="Hapus Preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Change Owner PIN */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-base md:text-lg flex items-center gap-2 mb-3">
              <KeyRound className="w-5 h-5 text-emerald-600" />
              {t.ownerPinSetting}
            </h3>

            <form onSubmit={handleUpdatePin} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.oldPinLabel}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value)}
                    placeholder="123456"
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 font-black text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.newPinLabel}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="6 digit"
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 font-black text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {pinMessage && (
                <p
                  className={`text-xs font-bold ${
                    pinMessage.error ? 'text-red-500' : 'text-emerald-700'
                  }`}
                >
                  {pinMessage.text}
                </p>
              )}

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black font-extrabold text-white text-xs transition-all shadow-sm flex items-center justify-center"
              >
                {t.changePinBtn}
              </button>
            </form>
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="space-y-6">
          {/* Card 4: Language Selection & Download App (placed side-by-side as requested) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-base md:text-lg flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-emerald-600" />
              {t.languageSetting} & Aplikasi
            </h3>

            <div className="space-y-4">
              {/* Language Switcher Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Bahasa / Choose Language:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLanguage('id')}
                    className={`h-11 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                      language === 'id'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🇮🇩 Bahasa Indonesia
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`h-11 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                      language === 'en'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>

              {/* Simplified Download App Button (Right next to language as requested) */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Aplikasi Desktop / Mobile (PWA):
                </label>
                {isInstalled ? (
                  <div className="h-11 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-2 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Aplikasi Sudah Terpasang</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className="w-full h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-1">
                      <Laptop className="w-4 h-4" />
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <span>{language === 'id' ? 'Pasang / Download Aplikasi' : 'Download / Install App'}</span>
                  </button>
                )}
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Bisa dipasang langsung di Komputer (Mac/Windows) atau Smartphone tanpa perlu membuka browser.
                </p>
              </div>
            </div>
          </div>

          {/* Card 5: Receipt Print Options */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-slate-900 text-base md:text-lg flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                {t.receiptOptionsTitle}
              </h3>
              {isSavedReceiptOpts && (
                <span className="text-xs font-black text-emerald-700 flex items-center gap-1 animate-fadeIn">
                  <Check className="w-3.5 h-3.5" /> Tersimpan
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              {t.receiptOptionsSubtitle}
            </p>

            <div className="space-y-2">
              {[
                { key: 'printStoreName' as const, label: t.optPrintStoreName },
                { key: 'printStoreAddress' as const, label: t.optPrintStoreAddress },
                { key: 'printDateTime' as const, label: t.optPrintDateTime },
                { key: 'printNotes' as const, label: t.optPrintNotes },
                { key: 'printFooter' as const, label: t.optPrintFooter },
              ].map(({ key, label }) => {
                const isChecked = !!receiptOpts[key];
                return (
                  <label
                    key={key}
                    onClick={() => handleToggleReceiptOpt(key)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-emerald-50/60 border-emerald-300 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <span className="text-xs font-bold">{label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Card 6: 58mm Bluetooth Thermal Printer */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-base md:text-lg flex items-center gap-2 mb-3">
              <Printer className="w-5 h-5 text-emerald-600" />
              {t.printerStatus}
            </h3>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Status:</span>
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    isBtConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isBtConnected ? t.printerConnected : t.printerDisconnected}
                </span>
              </div>
              {btDeviceName && (
                <div className="text-xs text-slate-700 font-semibold mt-1.5">
                  {t.deviceLabel}: <span className="font-black text-slate-900">{btDeviceName}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {isBtConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnectBt}
                  className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all flex items-center justify-center"
                >
                  {t.disconnectPrinter}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectBt}
                  disabled={btLoading}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>{btLoading ? t.searchingDevice : t.connectPrinter}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleTestPrint}
                className="w-full h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-all flex items-center justify-center"
              >
                {t.testPrint}
              </button>
            </div>
          </div>

          {/* Card 7: Cloud Sync (Firebase) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-base md:text-lg flex items-center gap-2 mb-2">
              <Cloud className="w-5 h-5 text-emerald-600" />
              {t.cloudSyncTitle}
            </h3>

            {isFirebaseConfigured && user ? (
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-semibold">{t.firebaseConnected}:</span>
                  <span className="text-xs font-black text-emerald-800">{user.email}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={logout}
                    className="h-10 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t.logoutBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Yakin ingin menghapus toko & akun ini secara permanen untuk mulai dari awal?')) {
                        await deleteCurrentStoreAndAccount();
                      }
                    }}
                    className="h-10 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus & Reset Toko</span>
                  </button>
                </div>
              </div>
            ) : isFirebaseConfigured ? (
              <form onSubmit={handleLogin} className="space-y-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    setAuthLoading(true);
                    setAuthError(null);
                    try {
                      await loginWithGoogle();
                    } catch (err: any) {
                      setAuthError(err.message || 'Gagal masuk dengan Google');
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  disabled={authLoading}
                  className="w-full h-10 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-800 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 mb-2"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Masuk dengan Google</span>
                </button>

                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder={t.emailLabel}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-semibold"
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder={t.passwordLabel}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-semibold"
                />
                {authError && (
                  <p className="text-xs text-rose-600 font-bold">{authError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center"
                  >
                    {authLoading ? '...' : t.loginBtn}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={authLoading}
                    className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 flex items-center justify-center"
                  >
                    {t.registerBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs text-amber-900 font-semibold mb-2">
                  {t.firebaseNotConfigured}
                </p>
                <button
                  type="button"
                  onClick={() => setIsFirebaseConfigModalOpen(true)}
                  className="w-full h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-sm transition-all flex items-center justify-center"
                >
                  {t.firebaseConfigureBtn}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preset Modal (Add / Edit) */}
      {isPresetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Layers className="w-5 h-5" />
                {editingPreset ? 'Edit Preset Rekap' : 'Tambah Preset Rekap Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPresetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-emerald-700/60 hover:bg-emerald-700 text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePreset} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Preset
                </label>
                <input
                  type="text"
                  required
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Contoh: Rekap Dapur / Rekap Minuman"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Filter Kata Kunci Menu (Pisahkan koma, kosongkan untuk semua)
                </label>
                <input
                  type="text"
                  value={presetKeyword}
                  onChange={(e) => setPresetKeyword(e.target.value)}
                  placeholder="Contoh: bakso, urat (opsional)"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Filter Kategori Menu
                </label>
                <select
                  value={presetCategory}
                  onChange={(e) => setPresetCategory(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700">
                  Opsi Tampilan pada Struk Ringkasan:
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                  <span className="text-xs font-semibold text-slate-800">
                    Cetak Jumlah Item (Qty)
                  </span>
                  <input
                    type="checkbox"
                    checked={presetShowQty}
                    onChange={(e) => setPresetShowQty(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                  <span className="text-xs font-semibold text-slate-800">
                    Cetak Subtotal Harga per Item
                  </span>
                  <input
                    type="checkbox"
                    checked={presetShowPrice}
                    onChange={(e) => setPresetShowPrice(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                  <span className="text-xs font-semibold text-slate-800">
                    Cetak Total Keseluruhan (Grand Total)
                  </span>
                  <input
                    type="checkbox"
                    checked={presetShowTotal}
                    onChange={(e) => setPresetShowTotal(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPresetModalOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 font-bold text-slate-700 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-white text-xs shadow-md"
                >
                  Simpan Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Firebase Config Modal */}
      {isFirebaseConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              {t.firebaseConfigureBtn}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Masukkan konfigurasi proyek Firebase Anda untuk sinkronisasi cloud:
            </p>

            <form onSubmit={handleSaveFirebaseConfig} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project ID
                </label>
                <input
                  type="text"
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="kasire-pos"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Auth Domain (Opsional)
                </label>
                <input
                  type="text"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  placeholder="kasire-pos.firebaseapp.com"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  App ID (Opsional)
                </label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="1:123456789:web:abcdef"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFirebaseConfigModalOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 font-bold text-slate-700 text-xs"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-white text-xs shadow-md"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
