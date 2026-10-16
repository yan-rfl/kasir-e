'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/context/StoreContext';
import { useLanguage } from '@/context/LanguageContext';
import { MenuItem } from '@/types';
import { formatRupiah } from '@/lib/escpos';
import {
  Plus,
  Minus,
  Search,
  ShoppingCart,
  Trash2,
  Check,
  CreditCard,
  Banknote,
  Receipt,
  X,
  Sparkles,
} from 'lucide-react';

export const PosScreen: React.FC = () => {
  const {
    menuItems,
    categories,
    cart,
    cartTotal,
    cartCount,
    addToCart,
    decrementFromCart,
    clearCart,
    checkout,
  } = useStore();
  const { t } = useLanguage();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [cashReceived, setCashReceived] = useState<string>('');
  const [customerNote, setCustomerNote] = useState<string>('');
  const [autoPrint, setAutoPrint] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.available) return false;
      const matchCat =
        selectedCategory === 'all' ||
        (item.category || '').toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const handleOpenCheckout = () => {
    if (cartCount === 0) return;
    setCashReceived(cartTotal.toString());
    setCustomerNote('');
    setIsCheckoutModalOpen(true);
  };

  const handleCashShortcut = (amount: number) => {
    setCashReceived(amount.toString());
  };

  const cashReceivedNum = parseInt(cashReceived, 10) || 0;
  const changeAmount = Math.max(0, cashReceivedNum - cartTotal);

  const handleConfirmCheckout = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await checkout(cashReceivedNum, customerNote.trim() || undefined, autoPrint);
      setIsCheckoutModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Gagal menyelesaikan transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] pb-32">
      {/* Category Tabs & Search Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-20 shadow-sm p-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Category Tabs (Large touch pills) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {t.categoryAll}
            </button>
            {categories.map((cat) => {
              const label =
                cat === 'makanan'
                  ? t.categoryFood
                  : cat === 'minuman'
                  ? t.categoryDrink
                  : cat === 'cemilan'
                  ? t.categorySnack
                  : cat === 'lainnya'
                  ? t.categoryOther
                  : cat.charAt(0).toUpperCase() + cat.slice(1);
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchMenu}
              className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Catalog Grid */}
      <div className="max-w-7xl mx-auto px-4 py-5 w-full flex-1">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">
              Tidak ada menu yang sesuai
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Coba ganti kategori atau kata pencarian
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {filteredItems.map((item) => {
              const inCart = cart[item.id];
              const qty = inCart ? inCart.quantity : 0;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-3.5 border-2 transition-all flex flex-col justify-between select-none shadow-sm ${
                    qty > 0
                      ? 'border-emerald-500 shadow-md ring-2 ring-emerald-100 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow'
                  }`}
                >
                  <div>
                    {/* Category Tag */}
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider mb-1.5">
                      {item.category || 'makanan'}
                    </span>
                    {/* Item Name */}
                    <h4 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2 min-h-[44px]">
                      {item.name}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    {/* Price */}
                    <div className="text-emerald-700 font-black text-lg mb-2.5">
                      Rp {formatRupiah(item.price)}
                    </div>

                    {/* Stepper with Large Min-48px Touch Targets */}
                    <div className="flex items-center justify-between gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200/80">
                      <button
                        onClick={() => decrementFromCart(item)}
                        disabled={qty === 0}
                        aria-label="Kurang satu"
                        className={`w-11 h-11 rounded-lg flex items-center justify-center font-black transition-all ${
                          qty > 0
                            ? 'bg-white text-rose-600 hover:bg-rose-50 shadow-sm active:scale-95'
                            : 'text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <Minus className="w-5 h-5" />
                      </button>

                      <span
                        className={`font-black text-lg px-2 min-w-[28px] text-center ${
                          qty > 0 ? 'text-emerald-800 scale-110' : 'text-slate-400'
                        }`}
                      >
                        {qty}
                      </span>

                      <button
                        onClick={() => addToCart(item)}
                        aria-label="Tambah satu"
                        className="w-11 h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center font-black shadow-sm transition-all"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar / Cart Subtotal */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-slate-200 shadow-2xl p-3 md:p-4 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Summary */}
          <div className="flex items-center gap-3">
            <button
              onClick={clearCart}
              disabled={cartCount === 0}
              className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
                cartCount > 0
                  ? 'border-slate-300 text-rose-600 hover:bg-rose-50'
                  : 'border-slate-200 text-slate-300 cursor-not-allowed'
              }`}
              title={t.clearCart}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t.clearCart}</span>
            </button>

            <div>
              <span className="text-xs text-slate-500 font-semibold block leading-tight">
                {t.totalPay} ({cartCount} {t.itemsCount})
              </span>
              <span className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                Rp {formatRupiah(cartTotal)}
              </span>
            </div>
          </div>

          {/* Right: Checkout Button (Large Prominent Action) */}
          <button
            onClick={handleOpenCheckout}
            disabled={cartCount === 0}
            className={`py-3.5 px-6 md:px-10 rounded-2xl font-black text-base md:text-lg flex items-center gap-2.5 shadow-lg transition-all active:scale-[0.98] ${
              cartCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Banknote className="w-6 h-6" />
            <span>{t.payButton}</span>
          </button>
        </div>
      </div>

      {/* Checkout Verification Dialog */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Banknote className="w-7 h-7 text-emerald-200" />
                <h3 className="text-xl font-black">{t.checkoutTitle}</h3>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="w-9 h-9 rounded-full bg-emerald-700/60 hover:bg-emerald-700 text-white flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Order Items Preview */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {t.orderSummary}
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {Object.values(cart).map((item) => (
                    <div
                      key={item.menuItemId}
                      className="flex justify-between items-center text-sm font-semibold"
                    >
                      <span className="text-slate-800">
                        {item.name} <span className="text-slate-400">x{item.quantity}</span>
                      </span>
                      <span className="text-slate-900">
                        Rp {formatRupiah(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-700">{t.totalPay}</span>
                  <span className="text-xl font-black text-emerald-700">
                    Rp {formatRupiah(cartTotal)}
                  </span>
                </div>
              </div>

              {/* Cash Input */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-1.5">
                  {t.cashReceived} (Rp)
                </label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full py-3 px-4 rounded-xl border-2 border-slate-300 text-2xl font-black text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="0"
                />

                {/* Quick Cash Shortcuts */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleCashShortcut(cartTotal)}
                    className="py-2 px-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-extrabold text-slate-700 border border-slate-200 transition-all text-center"
                  >
                    {t.exactAmount}
                  </button>
                  {[20000, 50000, 100000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleCashShortcut(val)}
                      className="py-2 px-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-extrabold text-slate-700 border border-slate-200 transition-all text-center"
                    >
                      {formatRupiah(val)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change Calculation (Large & Highly Visible) */}
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex justify-between items-center">
                <span className="font-extrabold text-emerald-900 text-base">
                  {t.changeAmount}
                </span>
                <span className="text-2xl font-black text-emerald-700">
                  Rp {formatRupiah(changeAmount)}
                </span>
              </div>

              {/* Customer Note (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  {t.customerNote}
                </label>
                <input
                  type="text"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Contoh: Meja 4 / Bungkus"
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Auto-Print Receipt Checkbox */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={(e) => setAutoPrint(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  {t.printReceiptCheck}
                </span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="flex-1 py-3.5 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition-all text-sm"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckout}
                disabled={isSubmitting || cashReceivedNum < cartTotal}
                className={`flex-1 py-3.5 rounded-xl font-black text-base flex items-center justify-center gap-2 text-white shadow-md transition-all ${
                  isSubmitting || cashReceivedNum < cartTotal
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Check className="w-5 h-5" />
                <span>{isSubmitting ? '...' : t.confirmPaymentBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
