'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useStore } from '@/context/StoreContext';
import { bluetoothPrinter } from '@/lib/bluetoothPrinter';
import { textToEscPosBytes } from '@/lib/escpos';
import { getStoredFirebaseConfig, saveStoredFirebaseConfig } from '@/lib/firebase';
import {
  Settings,
  Store,
  KeyRound,
  Printer,
  Globe,
  Cloud,
  LogOut,
  LogIn,
  UserPlus,
  Check,
  AlertCircle,
  HelpCircle,
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
    logout,
    reloadFirebase,
  } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { triggerBrowserPrint } = useStore();

  // Store Info Form
  const [storeName, setStoreName] = useState(profile.storeName || '');
  const [receiptHeader, setReceiptHeader] = useState(profile.receiptHeader || '');
  const [receiptFooter, setReceiptFooter] = useState(profile.receiptFooter || '');
  const [isSavedStore, setIsSavedStore] = useState(false);

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

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPin !== (profile.ownerPin || '123456')) {
      setPinMessage({ text: 'PIN Lama salah!', error: true });
      return;
    }
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setPinMessage({ text: 'PIN baru harus 6 digit angka!', error: true });
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
          KASIR-E POS           
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
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-7 h-7 text-emerald-600" />
          {t.settingsTitle}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Atur informasi rumah makan, printer struk, PIN pemilik, dan akun cloud
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Store Information & Receipt */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2 mb-3">
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
                className="w-full py-2 px-3 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                placeholder="Alamat & Telepon"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                placeholder="Pesan ucapan terima kasih"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-extrabold text-white text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              {isSavedStore ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <span>{t.save} Informasi Toko</span>
              )}
            </button>
          </form>
        </div>

        {/* Card 2: 58mm Bluetooth Thermal Printer */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2 mb-3">
              <Printer className="w-5 h-5 text-emerald-600" />
              {t.printerStatus}
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Status:</span>
                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-full ${
                    isBtConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isBtConnected ? t.printerConnected : t.printerDisconnected}
                </span>
              </div>
              {btDeviceName && (
                <div className="text-xs text-slate-700 font-semibold mt-2">
                  Perangkat: <span className="font-black text-slate-900">{btDeviceName}</span>
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Mendukung printer thermal 57/58mm via Bluetooth ESC/POS (Putian POS, GOOJPRT, dll) & Browser Print.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {isBtConnected ? (
              <button
                onClick={handleDisconnectBt}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all"
              >
                {t.disconnectPrinter}
              </button>
            ) : (
              <button
                onClick={handleConnectBt}
                disabled={btLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>{btLoading ? 'Mencari Perangkat...' : t.connectPrinter}</span>
              </button>
            )}

            <button
              onClick={handleTestPrint}
              className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-all"
            >
              {t.testPrint}
            </button>
          </div>
        </div>

        {/* Card 3: Change Owner PIN */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2 mb-3">
            <KeyRound className="w-5 h-5 text-emerald-600" />
            {t.ownerPinSetting}
          </h3>

          <form onSubmit={handleUpdatePin} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                PIN Lama (Default: 123456)
              </label>
              <input
                type="password"
                maxLength={6}
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                placeholder="6 digit PIN lama"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 font-black text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                PIN Baru (6 Digit)
              </label>
              <input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="6 digit PIN baru"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 font-black text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
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
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 font-bold text-white text-xs transition-all"
            >
              Ubah PIN Pemilik
            </button>
          </form>
        </div>

        {/* Card 4: Language & Cloud Sync */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-emerald-600" />
              {t.languageSetting}
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setLanguage('id')}
                className={`py-2.5 rounded-xl text-xs font-black border transition-all ${
                  language === 'id'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                🇮🇩 Bahasa Indonesia (Default)
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`py-2.5 rounded-xl text-xs font-black border transition-all ${
                  language === 'en'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                🇬🇧 English
              </button>
            </div>

            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2 mb-2">
              <Cloud className="w-5 h-5 text-emerald-600" />
              {t.cloudSyncTitle}
            </h3>

            {isFirebaseConfigured && user ? (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-semibold">Tersambung:</span>
                  <span className="text-xs font-black text-emerald-800">{user.email}</span>
                </div>
                <button
                  onClick={logout}
                  className="w-full py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t.logoutBtn}</span>
                </button>
              </div>
            ) : isFirebaseConfigured ? (
              <form onSubmit={handleLogin} className="space-y-2">
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold"
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold"
                />
                {authError && (
                  <p className="text-xs text-rose-600 font-bold">{authError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    {authLoading ? '...' : t.loginBtn}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={authLoading}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300"
                  >
                    {t.registerBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs text-amber-900 font-semibold mb-2">
                  {t.firebaseNotConfigured}
                </p>
                <button
                  type="button"
                  onClick={() => setIsFirebaseConfigModalOpen(true)}
                  className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-sm transition-all"
                >
                  {t.firebaseConfigureBtn}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Firebase Config Modal */}
      {isFirebaseConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              Konfigurasi Kunci Firebase
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Masukkan konfigurasi proyek Firebase Anda untuk sinkronisasi cloud multi-device & login akun.
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
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-mono"
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
                  placeholder="kasire-pos-123"
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-mono"
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
                  placeholder="kasire-pos-123.firebaseapp.com"
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-mono"
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
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFirebaseConfigModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-700 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-white text-xs shadow-md"
                >
                  Simpan & Hubungkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
