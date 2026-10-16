'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Lock, X, Delete, Check } from 'lucide-react';

interface PinVerificationModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
  title?: string;
}

export const PinVerificationModal: React.FC<PinVerificationModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
  title,
}) => {
  const { verifyOwnerPin } = useAuth();
  const { t } = useLanguage();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 6) {
        checkPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const checkPin = (entered: string) => {
    if (verifyOwnerPin(entered)) {
      setPin('');
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border-2 border-slate-100">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="w-8 h-8" />
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-xl font-black text-slate-800">
          {title || t.pinRequiredTitle}
        </h3>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          {t.pinPromptDesc}
        </p>

        {/* 6-Digit PIN Display Circles */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-6 h-6 rounded-full border-2 transition-all duration-150 ${
                  error
                    ? 'border-red-500 bg-red-100'
                    : isFilled
                    ? 'border-emerald-600 bg-emerald-600 scale-110'
                    : 'border-slate-300 bg-slate-100'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-red-500 font-bold text-xs mb-4 animate-shake">
            {t.pinInvalid} (Default: 123456)
          </p>
        )}

        {/* Large Senior-Friendly Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto select-none">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-emerald-50 active:bg-emerald-200 text-2xl font-black text-slate-800 border border-slate-200/80 transition-all active:scale-95 flex items-center justify-center shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-xs font-bold text-slate-600 border border-slate-200/80 transition-all flex items-center justify-center"
          >
            C
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-emerald-50 active:bg-emerald-200 text-2xl font-black text-slate-800 border border-slate-200/80 transition-all active:scale-95 flex items-center justify-center shadow-sm"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-amber-50 active:bg-amber-100 text-amber-700 border border-slate-200/80 transition-all flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
