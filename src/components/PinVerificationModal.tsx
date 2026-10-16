'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Lock, X, Check, KeyRound } from 'lucide-react';

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      // Auto focus native device keypad
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(val);
    setError(false);

    if (val.length === 6) {
      if (verifyOwnerPin(val)) {
        setPin('');
        setError(false);
        onSuccess();
      } else {
        setError(true);
        setPin('');
      }
    }
  };

  const handleManualVerify = () => {
    if (verifyOwnerPin(pin)) {
      setPin('');
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border-2 border-slate-100 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="w-8 h-8" />
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-xl font-black text-slate-800">
          {title || t.pinRequiredTitle}
        </h3>
        <p className="text-xs text-slate-500 mt-1 mb-2">
          {t.pinPromptDesc}
        </p>

        {/* PIN Default Badge */}
        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 mb-5">
          {t.defaultPinHint}
        </span>

        {/* Hidden but focused native keypad input */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pin}
          onChange={handleChange}
          className="sr-only"
          autoFocus
          aria-label={t.pinPlaceholder}
        />

        {/* Interactive 6-Digit Display Boxes (Tapping brings up device keypad) */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex justify-center gap-2.5 mb-5 cursor-pointer py-2 select-none"
        >
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const digit = pin[idx];
            const isCurrent = pin.length === idx;
            return (
              <div
                key={idx}
                className={`w-11 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
                  error
                    ? 'border-red-500 bg-red-50 text-red-600'
                    : digit
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                    : isCurrent
                    ? 'border-emerald-500 bg-white ring-2 ring-emerald-200 scale-105'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                {digit ? '•' : ''}
              </div>
            );
          })}
        </div>

        {error && (
          <p className="text-red-500 font-bold text-xs mb-4 animate-shake">
            {t.pinInvalid} (123456)
          </p>
        )}

        <p className="text-[11px] text-slate-400 mb-5">
          Gunakan keyboard / papan ketik angka di perangkat Anda
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-sm transition-all"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleManualVerify}
            disabled={pin.length < 4}
            className={`flex-1 py-3 rounded-xl font-black text-sm text-white shadow-md transition-all ${
              pin.length >= 4
                ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {t.verifyPin}
          </button>
        </div>
      </div>
    </div>
  );
};
