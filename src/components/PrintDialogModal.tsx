'use client';

import React from 'react';
import { useStore } from '@/context/StoreContext';
import { useLanguage } from '@/context/LanguageContext';
import { Printer, RotateCcw, X, CheckCircle2, FileText } from 'lucide-react';

export const PrintDialogModal: React.FC = () => {
  const {
    activePrintModalJob,
    closePrintModal,
    reprintLastJob,
    triggerBrowserPrint,
  } = useStore();
  const { t } = useLanguage();

  if (!activePrintModalJob) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-200" />
            <div>
              <h3 className="font-bold text-base leading-tight">
                {activePrintModalJob.title}
              </h3>
              <p className="text-xs text-emerald-100">
                Format Thermal 58mm (32 Karakter)
              </p>
            </div>
          </div>
          <button
            onClick={closePrintModal}
            className="w-8 h-8 rounded-full bg-emerald-700/60 hover:bg-emerald-700 text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 58mm Monospace Paper Preview */}
        <div className="p-4 bg-slate-100 overflow-y-auto flex-1 flex justify-center">
          <div className="bg-white w-[290px] p-4 shadow-md rounded border border-slate-300 font-mono text-[12px] leading-relaxed text-slate-900 select-all whitespace-pre">
            {activePrintModalJob.content}
          </div>
        </div>

        {/* Action Buttons (Elderly-Friendly Big Touch Targets) */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-2.5">
          {/* Print Ulang Button (Immediate re-print for paper refill) */}
          <button
            onClick={reprintLastJob}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            <span>{t.reprintBtn}</span>
          </button>

          {/* Browser Print Fallback */}
          <button
            onClick={() => triggerBrowserPrint(activePrintModalJob.content)}
            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 transition-all border border-slate-300/80"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>{t.browserPrint}</span>
          </button>

          {/* Close */}
          <button
            onClick={closePrintModal}
            className="w-full py-2.5 text-center text-slate-500 font-bold text-sm hover:text-slate-800 transition-all"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
