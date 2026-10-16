'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/context/StoreContext';
import { useLanguage } from '@/context/LanguageContext';
import { Transaction } from '@/types';
import { formatRupiah } from '@/lib/escpos';
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
} from 'lucide-react';

interface TransactionsScreenProps {
  onOpenResetPinModal: () => void;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  onOpenResetPinModal,
}) => {
  const {
    transactions,
    printSingleTransaction,
    printKawulReport,
    printMamahReport,
  } = useStore();
  const { t, language } = useLanguage();

  // Multi-select state: set of selected transaction IDs
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

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

  const handleSelectAll = () => {
    if (selectedTxIds.size === filteredTransactions.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  const selectedList = useMemo(() => {
    return transactions.filter((t) => selectedTxIds.has(t.id));
  }, [transactions, selectedTxIds]);

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
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
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
          {selectedTxIds.size > 0 && selectedTxIds.size === filteredTransactions.length ? (
            <CheckSquare className="w-5 h-5 text-emerald-600" />
          ) : (
            <Square className="w-5 h-5 text-slate-400" />
          )}
          <span>
            {selectedTxIds.size === filteredTransactions.length && filteredTransactions.length > 0
              ? t.deselectAll
              : t.selectAll}
          </span>
          {selectedTxIds.size > 0 && (
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black">
              {selectedTxIds.size} {t.selectedCount}
            </span>
          )}
        </button>

        {/* Aggregated Report Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Print Kawul (Bakso items only) */}
          <button
            type="button"
            onClick={handlePrintKawul}
            disabled={selectedTxIds.size === 0}
            className={`flex-1 sm:flex-initial h-11 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all ${
              selectedTxIds.size > 0
                ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>{t.printKawul}</span>
          </button>

          {/* Print Mamah (Full Summary) */}
          <button
            type="button"
            onClick={handlePrintMamah}
            disabled={selectedTxIds.size === 0}
            className={`flex-1 sm:flex-initial h-11 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all ${
              selectedTxIds.size > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.printMamah}</span>
          </button>
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
                            </div>
                          </div>

                          {/* Price & Single Receipt Print Button */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <span className="font-black text-emerald-700 text-base">
                              Rp {formatRupiah(tx.totalPrice)}
                            </span>

                            <button
                              onClick={() => printSingleTransaction(tx)}
                              className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition-all active:scale-95"
                              title="Cetak Struk Transaksi Ini"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{t.printReceipt}</span>
                            </button>
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
    </div>
  );
};
