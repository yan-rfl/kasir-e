'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/context/StoreContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Transaction, PrintPreset } from '@/types';
import { formatRupiah } from '@/lib/escpos';
import { OrderItem } from '@/types';
import {
  Receipt,
  Filter,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Printer,
  Trash2,
  Calendar,
  Search,
  X,
  FileSpreadsheet,
  Check,
  Pencil,
  Plus,
  Minus,
} from 'lucide-react';

interface TransactionsScreenProps {
  onOpenResetPinModal: () => void;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  onOpenResetPinModal,
}) => {
  const {
    transactions,
    updateTransaction,
    deleteTransaction,
    menuItems,
    printSingleTransaction,
    printPresetSummaryReport,
    printKawulReport,
    printMamahReport,
  } = useStore();
  const { profile } = useAuth();
  const { t, language } = useLanguage();

  const presets = profile.printPresets && profile.printPresets.length > 0
    ? profile.printPresets
    : [
        {
          id: 'preset-kawul',
          name: 'Rekap Kawul (Bakso)',
          filterKeywords: ['bakso'],
          showItemQty: true,
          showItemPrice: true,
          showTotalPrice: true,
        },
        {
          id: 'preset-mamah',
          name: 'Rekap Total (Semua Menu)',
          showItemQty: true,
          showItemPrice: true,
          showTotalPrice: true,
        },
      ];

  // Multi-select state: set of selected transaction IDs
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

  // Edit Transaction State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editNote, setEditNote] = useState<string>('');
  const [selectedMenuIdToAdd, setSelectedMenuIdToAdd] = useState<string>('');
  const [isCustomItemOpen, setIsCustomItemOpen] = useState<boolean>(false);
  const [customItemName, setCustomItemName] = useState<string>('');
  const [customItemPrice, setCustomItemPrice] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Filter & Sort Modal State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 'desc' = terbaru, 'asc' = terlama
  const [idFrom, setIdFrom] = useState('');
  const [idTo, setIdTo] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Expanded Date Groups Map (today expanded by default)
  const todayKey = new Date().toDateString();
  const [expandedDates, setExpandedDates] = useState<{ [dateKey: string]: boolean }>({
    [todayKey]: true,
  });

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  // Edit Handlers
  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditItems(tx.items.map((i) => ({ ...i })));
    setEditNote(tx.note || '');
    setSelectedMenuIdToAdd('');
    setIsCustomItemOpen(false);
    setCustomItemName('');
    setCustomItemPrice('');
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setEditItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], quantity: newQty };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddMenuToEdit = () => {
    if (!selectedMenuIdToAdd) return;
    const found = menuItems.find((m) => m.id === selectedMenuIdToAdd);
    if (!found) return;

    setEditItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.menuItemId === found.id);
      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: copy[existingIdx].quantity + 1,
        };
        return copy;
      }
      return [
        ...prev,
        {
          menuItemId: found.id,
          name: found.name,
          price: found.price,
          quantity: 1,
          category: found.category,
        },
      ];
    });
    setSelectedMenuIdToAdd('');
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return;
    const priceNum = parseInt(customItemPrice, 10);
    if (isNaN(priceNum) || priceNum < 0) return;

    setEditItems((prev) => [
      ...prev,
      {
        menuItemId: `custom-${Date.now()}`,
        name: customItemName.trim(),
        price: priceNum,
        quantity: 1,
        category: 'lainnya',
      },
    ]);
    setCustomItemName('');
    setCustomItemPrice('');
    setIsCustomItemOpen(false);
  };

  const editTotal = useMemo(() => {
    return editItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  }, [editItems]);

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    if (editItems.length === 0) {
      alert(t.txMustHaveItem);
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateTransaction(editingTx.id, {
        items: editItems,
        totalPrice: editTotal,
        note: editNote.trim(),
      });
      setEditingTx(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan transaksi');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteSingleTx = async () => {
    if (!editingTx) return;
    if (confirm(`Apakah Anda yakin ingin menghapus transaksi ${editingTx.id}?`)) {
      await deleteTransaction(editingTx.id);
      setEditingTx(null);
    }
  };

  // Filter & Sort Logic
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search query by item name inside transaction
    if (itemSearchQuery.trim()) {
      const q = itemSearchQuery.toLowerCase().trim();
      result = result.filter((tx) =>
        tx.items.some((item) => item.name.toLowerCase().includes(q))
      );
    }

    // ID Range bounds
    const fromNum = parseInt(idFrom, 10);
    const toNum = parseInt(idTo, 10);
    if (!isNaN(fromNum)) {
      result = result.filter((tx) => (tx.counter || 0) >= fromNum);
    }
    if (!isNaN(toNum)) {
      result = result.filter((tx) => (tx.counter || 0) <= toNum);
    }

    // Specific Date filter
    if (filterDate) {
      result = result.filter((tx) => {
        const txDate = new Date(tx.timestamp).toISOString().split('T')[0];
        return txDate === filterDate;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.timestamp - b.timestamp;
      }
      return b.timestamp - a.timestamp;
    });

    return result;
  }, [transactions, itemSearchQuery, idFrom, idTo, filterDate, sortOrder]);

  // Group by Date: key = Date string, formatted in user locale
  const groupedTransactions = useMemo(() => {
    const groups: { [dateKey: string]: { label: string; rawDate: Date; list: Transaction[] } } = {};

    filteredTransactions.forEach((tx) => {
      const d = new Date(tx.timestamp);
      const dateKey = d.toDateString();
      if (!groups[dateKey]) {
        const formattedLabel = d.toLocaleDateString(
          language === 'id' ? 'id-ID' : 'en-US',
          {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }
        );
        groups[dateKey] = {
          label: formattedLabel,
          rawDate: d,
          list: [],
        };
      }
      groups[dateKey].list.push(tx);
    });

    return groups;
  }, [filteredTransactions, language]);

  // Multi-select helpers
  const handleToggleTx = (id: string) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleGroup = (txs: Transaction[]) => {
    const allInGroupSelected = txs.every((t) => selectedTxIds.has(t.id));
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      txs.forEach((t) => {
        if (allInGroupSelected) {
          next.delete(t.id);
        } else {
          next.add(t.id);
        }
      });
      return next;
    });
  };

  // Automatically prune selections that fall outside of the current filtered transactions
  React.useEffect(() => {
    setSelectedTxIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(filteredTransactions.map((t) => t.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [filteredTransactions]);

  const isAllFilteredSelected =
    filteredTransactions.length > 0 &&
    filteredTransactions.every((t) => selectedTxIds.has(t.id));

  const handleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  const selectedList = useMemo(() => {
    return filteredTransactions.filter((t) => selectedTxIds.has(t.id));
  }, [filteredTransactions, selectedTxIds]);

  const handlePrintPreset = async (preset: PrintPreset) => {
    if (selectedList.length === 0) {
      alert('Pilih setidaknya 1 transaksi untuk rekap');
      return;
    }
    await printPresetSummaryReport(selectedList, preset);
  };

  const handlePrintKawul = async () => {
    if (selectedList.length === 0) {
      alert('Pilih setidaknya 1 transaksi untuk rekap Kawul');
      return;
    }
    await printKawulReport(selectedList);
  };

  const handlePrintMamah = async () => {
    if (selectedList.length === 0) {
      alert('Pilih setidaknya 1 transaksi untuk rekap Mamah');
      return;
    }
    await printMamahReport(selectedList);
  };

  const resetFilterForm = () => {
    setSortOrder('desc');
    setIdFrom('');
    setIdTo('');
    setFilterDate('');
    setItemSearchQuery('');
    setIsFilterModalOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-32 md:pb-24">
      {/* Top Bar Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-emerald-600" />
            {t.txTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {filteredTransactions.length} {t.txSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter & Sort Button */}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-extrabold text-sm flex items-center gap-2 shadow-sm transition-all"
          >
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>{t.sortFilterBtn}</span>
            {(itemSearchQuery || filterDate || idFrom || idTo) && (
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            )}
          </button>

          {/* Reset Transactions (PIN Protected) */}
          <button
            type="button"
            onClick={onOpenResetPinModal}
            className="h-10 px-3.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            title={t.resetTransactions}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t.resetTransactions}</span>
          </button>
        </div>
      </div>

      {/* Floating Multi-Select & Batch Print Bar */}
      <div className="bg-white rounded-2xl p-3.5 border-2 border-emerald-500/80 shadow-md mb-5 flex flex-wrap items-center justify-between gap-3">
        {/* Select All Checkbox */}
        <button
          type="button"
          onClick={handleSelectAll}
          className="flex items-center gap-2 font-black text-sm text-slate-800 hover:text-emerald-700 transition-all select-none"
        >
          {isAllFilteredSelected ? (
            <CheckSquare className="w-5 h-5 text-emerald-600" />
          ) : (
            <Square className="w-5 h-5 text-slate-400" />
          )}
          <span>
            {isAllFilteredSelected ? t.deselectAll : t.selectAll}
          </span>
          {selectedList.length > 0 && (
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black">
              {selectedList.length} {t.selectedCount}
            </span>
          )}
        </button>

        {/* Dynamic Preset Summary Report Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {presets.map((preset, index) => {
            const isFirst = index === 0;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePrintPreset(preset)}
                disabled={selectedTxIds.size === 0}
                className={`flex-1 sm:flex-initial h-11 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all whitespace-nowrap ${
                  selectedTxIds.size > 0
                    ? isFirst
                      ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
                title={`Cetak ${preset.name}`}
              >
                <Printer className="w-4 h-4" />
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transactions List Grouped by Date */}
      {Object.keys(groupedTransactions).length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md mx-auto">
          <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">{t.noTransactions}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {t.noTransactionsHint}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedTransactions).map(([dateKey, group]) => {
            const isExpanded = !!expandedDates[dateKey];
            const groupTotal = group.list.reduce((acc, t) => acc + t.totalPrice, 0);
            const allGroupSelected = group.list.every((t) => selectedTxIds.has(t.id));

            return (
              <div
                key={dateKey}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
              >
                {/* Collapsible Date Group Header */}
                <div className="bg-slate-50 p-3.5 flex items-center justify-between border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    {/* Checkbox for full date group */}
                    <button
                      type="button"
                      onClick={() => handleToggleGroup(group.list)}
                      className="text-slate-500 hover:text-emerald-700"
                    >
                      {allGroupSelected ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleDateGroup(dateKey)}
                      className="flex items-center gap-2 text-left"
                    >
                      <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="font-extrabold text-slate-900 text-sm md:text-base">
                        {group.label}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        ({group.list.length} {t.receiptsCount})
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-black text-emerald-800 text-sm md:text-base">
                      Rp {formatRupiah(groupTotal)}
                    </span>
                    <button
                      onClick={() => toggleDateGroup(dateKey)}
                      className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 transition-all"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Date Group Body: List of Transactions */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100">
                    {group.list.map((tx) => {
                      const isSelected = selectedTxIds.has(tx.id);
                      const timeStr = new Date(tx.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={tx.id}
                          className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Checkbox & ID & Time */}
                          <div className="flex items-start sm:items-center gap-3">
                            <button
                              onClick={() => handleToggleTx(tx.id)}
                              className="mt-0.5 sm:mt-0 text-slate-400 hover:text-emerald-600"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-300" />
                              )}
                            </button>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-base">
                                  {tx.id}
                                </span>
                                <span className="text-xs font-semibold text-slate-400">
                                  {timeStr}
                                </span>
                              </div>

                              {/* Item list summary */}
                              <div className="text-xs text-slate-600 mt-1 line-clamp-1">
                                {tx.items.map((i) => `${i.name} (${i.quantity}x)`).join(', ')}
                              </div>
                              {tx.note && (
                                <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mt-1 inline-block font-semibold">
                                  Catatan: {tx.note}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Price & Action Buttons */}
                          <div className="flex items-center justify-between sm:justify-end gap-2 self-stretch sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <span className="font-black text-emerald-700 text-base">
                              Rp {formatRupiah(tx.totalPrice)}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {/* Edit Transaction Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(tx)}
                                className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-xs flex items-center gap-1 border border-slate-200 transition-all active:scale-95"
                                title="Edit Transaksi Ini"
                              >
                                <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{t.editTransaction}</span>
                              </button>

                              {/* Print Button */}
                              <button
                                type="button"
                                onClick={() => printSingleTransaction(tx)}
                                className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-xs flex items-center gap-1 border border-slate-200 transition-all active:scale-95"
                                title="Cetak Struk Transaksi Ini"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden xs:inline">{t.printReceipt}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sort & Filter Dialog */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Filter className="w-5 h-5" />
                {t.filterSortTitle}
              </h3>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-emerald-700/60 hover:bg-emerald-700 text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Sort Order */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t.sortBy}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSortOrder('desc')}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all ${
                      sortOrder === 'desc'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {t.sortNewest}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortOrder('asc')}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all ${
                      sortOrder === 'asc'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {t.sortOldest}
                  </button>
                </div>
              </div>

              {/* ID Range */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t.idRange}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      value={idFrom}
                      onChange={(e) => setIdFrom(e.target.value)}
                      placeholder={t.idFrom + ' (1)'}
                      className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={idTo}
                      onChange={(e) => setIdTo(e.target.value)}
                      placeholder={t.idTo + ' (99999)'}
                      className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Specific Date Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t.dateFilter}
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>

              {/* Item Query */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t.searchItemName}
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    placeholder="Contoh: Bakso, Teh"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={resetFilterForm}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-700 text-xs"
                >
                  {t.resetFilter}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-extrabold text-white text-xs shadow-md"
                >
                  {t.applyFilter}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-emerald-600 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                  <Pencil className="w-5 h-5" />
                  {t.editTxTitle} {editingTx.id}
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  {new Date(editingTx.timestamp).toLocaleString(
                    language === 'id' ? 'id-ID' : 'en-US',
                    {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="w-8 h-8 rounded-full bg-emerald-700/60 hover:bg-emerald-700 text-white flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Items List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    {t.editTxItems} ({editItems.length})
                  </label>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Ketuk +/- untuk ubah jumlah
                  </span>
                </div>

                {editItems.length === 0 ? (
                  <div className="p-4 text-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                    {t.txMustHaveItem}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editItems.map((item, index) => (
                      <div
                        key={`${item.menuItemId}-${index}`}
                        className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                            {item.name}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-medium">
                            @ Rp {formatRupiah(item.price)}
                          </span>
                        </div>

                        {/* Stepper & Total */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(index, item.quantity - 1)}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-all"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center font-black text-xs sm:text-sm text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(index, item.quantity + 1)}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="font-black text-xs sm:text-sm text-emerald-700 min-w-[70px] text-right">
                            Rp {formatRupiah(item.price * item.quantity)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            title="Hapus Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Menu Item to this transaction */}
              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2.5">
                <div className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                  <span>{t.addItemToTx}</span>
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedMenuIdToAdd}
                    onChange={(e) => setSelectedMenuIdToAdd(e.target.value)}
                    className="flex-1 py-2 px-3 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Pilih Menu dari Katalog --</option>
                    {menuItems.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} - Rp {formatRupiah(m.price)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAddMenuToEdit}
                    disabled={!selectedMenuIdToAdd}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all shadow-sm ${
                      selectedMenuIdToAdd
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah</span>
                  </button>
                </div>

                {/* Option to add custom item not in catalog */}
                <div className="pt-1">
                  {!isCustomItemOpen ? (
                    <button
                      type="button"
                      onClick={() => setIsCustomItemOpen(true)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline"
                    >
                      + Tambah Menu Kustom (Bukan dari katalog)
                    </button>
                  ) : (
                    <div className="space-y-2 bg-white p-2.5 rounded-xl border border-emerald-200 mt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={customItemName}
                          onChange={(e) => setCustomItemName(e.target.value)}
                          placeholder="Nama menu kustom"
                          className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs"
                        />
                        <input
                          type="number"
                          value={customItemPrice}
                          onChange={(e) => setCustomItemPrice(e.target.value)}
                          placeholder="Harga (Rp)"
                          className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsCustomItemOpen(false)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleAddCustomItem}
                          disabled={!customItemName.trim() || !customItemPrice}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          Tambahkan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.customerNote}
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder={t.notePlaceholder}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Total Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-100 flex items-center justify-between border border-slate-200">
                <span className="text-xs font-bold text-slate-600">
                  {t.totalPay} Baru
                </span>
                <span className="text-lg font-black text-emerald-800">
                  Rp {formatRupiah(editTotal)}
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDeleteSingleTx}
                className="py-2.5 px-3 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1 border border-rose-200 transition-all"
                title="Hapus Transaksi Ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hapus</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || editItems.length === 0}
                  className={`py-2.5 px-5 rounded-xl font-black text-xs text-white shadow-md transition-all ${
                    isSavingEdit || editItems.length === 0
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                  }`}
                >
                  {isSavingEdit ? t.savingChanges : t.saveChanges}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
