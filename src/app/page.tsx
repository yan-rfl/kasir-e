'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { PosScreen } from '@/components/PosScreen';
import { MenuScreen } from '@/components/MenuScreen';
import { TransactionsScreen } from '@/components/TransactionsScreen';
import { SettingsScreen } from '@/components/SettingsScreen';
import { PinVerificationModal } from '@/components/PinVerificationModal';
import { useStore } from '@/context/StoreContext';
import { useLanguage } from '@/context/LanguageContext';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'pos' | 'menu' | 'tx' | 'settings'>('pos');
  const [pinModalAction, setPinModalAction] = useState<'menu' | 'reset' | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  const { resetAllTransactions } = useStore();
  const { t } = useLanguage();

  const handleOpenPin = (action: 'menu' | 'reset') => {
    setPinModalAction(action);
  };

  const handlePinSuccess = () => {
    if (pinModalAction === 'menu') {
      setActiveTab('menu');
      setPinModalAction(null);
    } else if (pinModalAction === 'reset') {
      setPinModalAction(null);
      setIsResetConfirmOpen(true);
    }
  };

  const handleExecuteReset = async () => {
    await resetAllTransactions();
    setIsResetConfirmOpen(false);
    alert('Seluruh transaksi berhasil direset. Nomor transaksi kembali ke #00001.');
  };

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPinModal={handleOpenPin}
      />

      <div className="flex-1">
        {activeTab === 'pos' && <PosScreen />}
        {activeTab === 'menu' && <MenuScreen />}
        {activeTab === 'tx' && (
          <TransactionsScreen
            onOpenResetPinModal={() => handleOpenPin('reset')}
          />
        )}
        {activeTab === 'settings' && <SettingsScreen />}
      </div>

      {/* Owner PIN Verification Modal */}
      <PinVerificationModal
        isOpen={pinModalAction !== null}
        onClose={() => setPinModalAction(null)}
        onSuccess={handlePinSuccess}
        title={
          pinModalAction === 'menu'
            ? 'Buka Manajemen Menu'
            : 'Reset Seluruh Transaksi'
        }
      />

      {/* Reset Confirmation Modal (After PIN Verification) */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border-2 border-rose-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">
              Konfirmasi Reset Total
            </h3>
            <p className="text-xs text-rose-700 font-semibold mb-6 leading-relaxed">
              {t.confirmResetTx}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 text-sm"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleExecuteReset}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 font-black text-white text-sm shadow-md"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
