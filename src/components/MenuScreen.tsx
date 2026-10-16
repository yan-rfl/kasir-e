'use client';

import React, { useState } from 'react';
import { useStore } from '@/context/StoreContext';
import { useLanguage } from '@/context/LanguageContext';
import { MenuItem } from '@/types';
import { formatRupiah } from '@/lib/escpos';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  X,
  Check,
  UtensilsCrossed,
  Tag,
} from 'lucide-react';

export const MenuScreen: React.FC = () => {
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem, moveMenuItem } = useStore();
  const { t } = useLanguage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('makanan');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [available, setAvailable] = useState(true);

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setPrice('');
    setCategory('makanan');
    setCustomCategory('');
    setIsCustomCategory(false);
    setAvailable(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price.toString());
    const isStandard = ['makanan', 'minuman', 'cemilan'].includes(item.category.toLowerCase());
    if (isStandard) {
      setCategory(item.category.toLowerCase());
      setIsCustomCategory(false);
    } else {
      setCategory('custom');
      setCustomCategory(item.category);
      setIsCustomCategory(true);
    }
    setAvailable(item.available);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama menu wajib diisi');
      return;
    }
    const priceNum = parseInt(price, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Harga harus berupa angka yang valid');
      return;
    }

    const finalCategory = isCustomCategory
      ? (customCategory.trim() || 'lainnya').toLowerCase()
      : category.toLowerCase();

    if (editingItem) {
      await updateMenuItem(editingItem.id, {
        name: name.trim(),
        price: priceNum,
        category: finalCategory,
        available,
      });
    } else {
      await addMenuItem({
        name: name.trim(),
        price: priceNum,
        category: finalCategory,
        available,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMenuItem(id);
    setDeletingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <UtensilsCrossed className="w-7 h-7 text-emerald-600" />
            {t.menuTitle}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola daftar menu, kategori makanan/minuman, dan urutan tampil di kasir
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm md:text-base flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>{t.addMenu}</span>
        </button>
      </div>

      {/* Menu List */}
      <div className="space-y-3">
        {menuItems.map((item, index) => (
          <div
            key={item.id}
            className={`bg-white rounded-2xl p-4 border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
              item.available ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50'
            }`}
          >
            {/* Info */}
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-extrabold text-sm flex items-center justify-center shrink-0">
                {index + 1}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-slate-900 text-lg leading-snug">
                    {item.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                    {item.category || 'makanan'}
                  </span>
                  {!item.available && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700">
                      Habis
                    </span>
                  )}
                </div>
                <p className="text-emerald-700 font-black text-base mt-0.5">
                  Rp {formatRupiah(item.price)}
                </p>
              </div>
            </div>

            {/* Actions: Reordering & Editing */}
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              {/* Move Up */}
              <button
                onClick={() => moveMenuItem(item.id, 'up')}
                disabled={index === 0}
                title={t.moveUp}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-all"
              >
                <ArrowUp className="w-5 h-5" />
              </button>

              {/* Move Down */}
              <button
                onClick={() => moveMenuItem(item.id, 'down')}
                disabled={index === 0 && menuItems.length <= 1 || index === menuItems.length - 1}
                title={t.moveDown}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-all"
              >
                <ArrowDown className="w-5 h-5" />
              </button>

              {/* Edit */}
              <button
                onClick={() => handleOpenEdit(item)}
                title={t.editMenu}
                className="w-10 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-all ml-1"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              {/* Delete */}
              <button
                onClick={() => setDeletingId(item.id)}
                title={t.deleteMenu}
                className="w-10 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
              <h3 className="text-xl font-black">
                {editingItem ? t.editMenu : t.addMenu}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-emerald-700/60 hover:bg-emerald-700 text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Menu Name */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  {t.menuName}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Bakso Urat Jumbo"
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Menu Price */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  {t.menuPrice}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="15000"
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg"
                />
              </div>

              {/* Menu Category Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  {t.menuCategory}
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {[
                    { id: 'makanan', label: t.categoryFood },
                    { id: 'minuman', label: t.categoryDrink },
                    { id: 'cemilan', label: t.categorySnack },
                    { id: 'custom', label: '+ Kategori Lain' },
                  ].map((cat) => {
                    const isSelected =
                      cat.id === 'custom' ? isCustomCategory : category === cat.id && !isCustomCategory;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (cat.id === 'custom') {
                            setIsCustomCategory(true);
                          } else {
                            setIsCustomCategory(false);
                            setCategory(cat.id);
                          }
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {isCustomCategory && (
                  <input
                    type="text"
                    required={isCustomCategory}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Ketik kategori baru (contoh: paket, kopi, dll)"
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* Available Toggle */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span className="text-sm font-bold text-slate-800">
                  Menu Tersedia / Masih Ada Stok
                </span>
              </label>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 text-sm"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-extrabold text-white text-sm shadow-md"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-lg mb-2">
              {t.deleteMenu}
            </h4>
            <p className="text-xs text-slate-600 mb-6">
              {t.confirmDeleteMenu}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 text-sm"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 font-extrabold text-white text-sm shadow-md"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
