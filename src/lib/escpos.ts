import { OrderItem, Transaction, ReceiptOptions, PrintPreset, MenuItem } from "@/types";

export const LINE_WIDTH = 32;

/**
 * Sorts order or aggregated items based on the order defined in the Menu list (menuItems).
 * If an item is not found in menuItems, it is placed at the end sorted alphabetically by name.
 */
export function sortItemsByMenuOrder<T extends { name: string; menuItemId?: string }>(
  items: T[],
  menuItems?: MenuItem[]
): T[] {
  if (!menuItems || menuItems.length === 0) {
    return items;
  }

  const idMap = new Map<string, number>();
  const nameMap = new Map<string, number>();

  menuItems.forEach((m, idx) => {
    if (m.id) idMap.set(m.id, idx);
    if (m.name) nameMap.set(m.name.trim().toLowerCase(), idx);
  });

  return [...items].sort((a, b) => {
    let indexA = a.menuItemId ? idMap.get(a.menuItemId) : undefined;
    if (indexA === undefined) {
      indexA = nameMap.get(a.name.trim().toLowerCase());
    }

    let indexB = b.menuItemId ? idMap.get(b.menuItemId) : undefined;
    if (indexB === undefined) {
      indexB = nameMap.get(b.name.trim().toLowerCase());
    }

    const posA = indexA !== undefined ? indexA : Number.MAX_SAFE_INTEGER;
    const posB = indexB !== undefined ? indexB : Number.MAX_SAFE_INTEGER;

    if (posA !== posB) {
      return posA - posB;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Format currency to Indonesian Rupiah standard string (e.g. 15.000)
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

/**
 * Pad string to center
 */
export function padCenter(text: string, width: number = LINE_WIDTH): string {
  if (text.length >= width) return text.slice(0, width);
  const leftPadding = Math.floor((width - text.length) / 2);
  const rightPadding = width - text.length - leftPadding;
  return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding);
}

/**
 * Align left and right columns (e.g. "TOTAL", "30.000")
 */
export function padLeftRight(left: string, right: string, width: number = LINE_WIDTH): string {
  const spaceNeeded = width - left.length - right.length;
  if (spaceNeeded <= 0) {
    // If text exceeds width, truncate left
    const truncatedLeft = left.slice(0, Math.max(0, width - right.length - 1));
    return truncatedLeft + ' ' + right;
  }
  return left + ' '.repeat(spaceNeeded) + right;
}

/**
 * Format separator line
 */
export function separator(char: string = '-', width: number = LINE_WIDTH): string {
  return char.repeat(width);
}

/**
 * Generate 32-column text receipt for a single transaction
 */
export function generateSingleReceiptText(
  tx: Transaction,
  storeName: string = 'Pondok Bakso 168 DOI',
  header?: string,
  footer?: string,
  options?: ReceiptOptions,
  menuItems?: MenuItem[]
): string {
  const lines: string[] = [];
  const opts: ReceiptOptions = {
    printStoreName: options?.printStoreName ?? true,
    printStoreAddress: options?.printStoreAddress ?? true,
    printDateTime: options?.printDateTime ?? true,
    printNotes: options?.printNotes ?? true,
    printFooter: options?.printFooter ?? true,
  };

  // Header
  if (opts.printStoreName) {
    lines.push(padCenter(storeName));
  }
  if (opts.printStoreAddress && header) {
    lines.push(padCenter(header));
  }
  if (opts.printStoreName || (opts.printStoreAddress && header)) {
    lines.push(separator('='));
  }

  // Info
  if (opts.printDateTime) {
    const dateStr = new Date(tx.timestamp).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    lines.push(padLeftRight(`No: ${tx.id}`, dateStr));
  } else {
    lines.push(`No: ${tx.id}`);
  }
  lines.push(separator('-'));

  // Items sorted by menu order
  const sortedItems = sortItemsByMenuOrder(tx.items, menuItems);
  for (const item of sortedItems) {
    lines.push(item.name);
    const qtyPrice = ` ${item.quantity} x ${formatRupiah(item.price)}`;
    const subtotal = formatRupiah(item.price * item.quantity);
    lines.push(padLeftRight(qtyPrice, subtotal));
  }

  lines.push(separator('-'));

  // Totals
  lines.push(padLeftRight('TOTAL', `Rp ${formatRupiah(tx.totalPrice)}`));
  if (tx.paidAmount !== undefined && tx.paidAmount > 0) {
    lines.push(padLeftRight('TUNAI', `Rp ${formatRupiah(tx.paidAmount)}`));
    lines.push(padLeftRight('KEMBALI', `Rp ${formatRupiah(tx.changeAmount || 0)}`));
  }

  if (opts.printNotes && tx.note) {
    lines.push(separator('-'));
    lines.push(`Ket: ${tx.note}`);
  }

  if (opts.printFooter) {
    lines.push(separator('='));
    lines.push(padCenter(footer || 'Terima Kasih Atas Kunjungan Anda'));
    lines.push(padCenter('Selamat Menikmati'));
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate Kawul aggregated receipt: strictly filters items containing "Bakso"
 */
export function generateKawulReceiptText(
  transactions: Transaction[],
  storeName: string = 'KASIR-E',
  menuItems?: MenuItem[]
): string {
  const lines: string[] = [];
  lines.push(padCenter(storeName));
  lines.push(padCenter('*** REKAP KAWUL (BAKSO) ***'));
  lines.push(separator('='));

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  lines.push(padLeftRight('Tanggal:', dateStr));
  lines.push(padLeftRight('Total Transaksi:', `${transactions.length} struk`));
  lines.push(separator('-'));

  // Aggregate items with "bakso" in name (case-insensitive)
  const itemMap = new Map<string, { menuItemId?: string; name: string; quantity: number; subtotal: number }>();
  let filteredBaksoSubtotal = 0;
  let totalBaksoItems = 0;

  for (const tx of transactions) {
    for (const item of tx.items) {
      if (item.name.toLowerCase().includes('bakso')) {
        const key = item.menuItemId || item.name.trim();
        const existing = itemMap.get(key) || { menuItemId: item.menuItemId, name: item.name.trim(), quantity: 0, subtotal: 0 };
        existing.quantity += item.quantity;
        existing.subtotal += item.price * item.quantity;
        itemMap.set(key, existing);

        filteredBaksoSubtotal += item.price * item.quantity;
        totalBaksoItems += item.quantity;
      }
    }
  }

  if (itemMap.size === 0) {
    lines.push(padCenter('(Tidak ada menu bakso)'));
  } else {
    const sortedItems = sortItemsByMenuOrder(Array.from(itemMap.values()), menuItems);
    for (const item of sortedItems) {
      lines.push(item.name);
      const qtyStr = ` ${item.quantity} porsi`;
      const subtotalStr = formatRupiah(item.subtotal);
      lines.push(padLeftRight(qtyStr, subtotalStr));
    }
  }

  // Full grand total of all items in the selected transactions
  const transactionGrandTotal = transactions.reduce((acc, tx) => acc + (tx.totalPrice || 0), 0);

  lines.push(separator('-'));
  if (filteredBaksoSubtotal > 0 && filteredBaksoSubtotal !== transactionGrandTotal) {
    lines.push(padLeftRight(`Subtotal Bakso (${totalBaksoItems})`, `Rp ${formatRupiah(filteredBaksoSubtotal)}`));
    lines.push(padLeftRight('TOTAL TRANSAKSI', `Rp ${formatRupiah(transactionGrandTotal)}`));
  } else {
    lines.push(padLeftRight(`TOTAL (${totalBaksoItems} item)`, `Rp ${formatRupiah(transactionGrandTotal)}`));
  }
  lines.push(separator('='));
  lines.push(padCenter('Rekap Selesai'));
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate Mamah aggregated receipt: complete aggregation of all sold items
 */
export function generateMamahReceiptText(
  transactions: Transaction[],
  storeName: string = 'KASIR-E',
  menuItems?: MenuItem[]
): string {
  const lines: string[] = [];
  lines.push(padCenter(storeName));
  lines.push(padCenter('*** REKAP MAMAH (TOTAL) ***'));
  lines.push(separator('='));

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  lines.push(padLeftRight('Tanggal:', dateStr));
  lines.push(padLeftRight('Total Transaksi:', `${transactions.length} struk`));
  lines.push(separator('-'));

  // Aggregate all items
  const itemMap = new Map<string, { menuItemId?: string; name: string; quantity: number; subtotal: number }>();
  let grandTotal = 0;
  let totalQty = 0;

  for (const tx of transactions) {
    for (const item of tx.items) {
      const key = item.menuItemId || item.name.trim();
      const existing = itemMap.get(key) || { menuItemId: item.menuItemId, name: item.name.trim(), quantity: 0, subtotal: 0 };
      existing.quantity += item.quantity;
      existing.subtotal += item.price * item.quantity;
      itemMap.set(key, existing);

      grandTotal += item.price * item.quantity;
      totalQty += item.quantity;
    }
  }

  if (itemMap.size === 0) {
    lines.push(padCenter('(Tidak ada transaksi dipilih)'));
  } else {
    const sortedItems = sortItemsByMenuOrder(Array.from(itemMap.values()), menuItems);
    for (const item of sortedItems) {
      lines.push(item.name);
      const qtyStr = ` ${item.quantity}x`;
      const subtotalStr = formatRupiah(item.subtotal);
      lines.push(padLeftRight(qtyStr, subtotalStr));
    }
  }

  lines.push(separator('-'));
  lines.push(padLeftRight(`GRAND TOTAL (${totalQty})`, `Rp ${formatRupiah(grandTotal)}`));
  lines.push(separator('='));
  lines.push(padCenter('Rekap Harian Sukses'));
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate configurable aggregated summary receipt based on user-defined PrintPreset
 */
export function generatePresetSummaryReceiptText(
  transactions: Transaction[],
  preset: PrintPreset,
  storeName: string = 'KASIR-E',
  headerAddress?: string,
  footerNote?: string,
  menuItems?: MenuItem[]
): string {
  const lines: string[] = [];

  // Header option: check preset.printStoreHeader !== false
  const shouldPrintHeader = preset.printStoreHeader !== false;
  if (shouldPrintHeader) {
    lines.push(padCenter(storeName));
    if (preset.customHeader && preset.customHeader.trim()) {
      lines.push(padCenter(preset.customHeader.trim()));
    } else if (headerAddress && headerAddress.trim()) {
      lines.push(padCenter(headerAddress.trim()));
    }
  }

  lines.push(padCenter(`*** ${preset.name.toUpperCase()} ***`));
  lines.push(separator('='));

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  lines.push(padLeftRight('Tanggal:', dateStr));
  lines.push(padLeftRight('Total Transaksi:', `${transactions.length} struk`));
  lines.push(separator('-'));

  const keywords = (preset.filterKeywords || []).map((k) => k.toLowerCase().trim()).filter(Boolean);
  const targetCategory = (preset.category || 'all').toLowerCase();

  const itemMap = new Map<string, { menuItemId?: string; name: string; quantity: number; subtotal: number }>();
  let filteredItemsSubtotal = 0;
  let totalItemsCount = 0;

  for (const tx of transactions) {
    for (const item of tx.items) {
      // Filter category if specified
      if (targetCategory !== 'all' && (item.category || '').toLowerCase() !== targetCategory) {
        continue;
      }
      // Filter keyword if specified
      if (keywords.length > 0) {
        const matchesKeyword = keywords.some((kw) => item.name.toLowerCase().includes(kw));
        if (!matchesKeyword) continue;
      }

      const key = item.menuItemId || item.name.trim();
      const existing = itemMap.get(key) || { menuItemId: item.menuItemId, name: item.name.trim(), quantity: 0, subtotal: 0 };
      existing.quantity += item.quantity;
      existing.subtotal += item.price * item.quantity;
      itemMap.set(key, existing);

      filteredItemsSubtotal += item.price * item.quantity;
      totalItemsCount += item.quantity;
    }
  }

  if (itemMap.size === 0) {
    lines.push(padCenter('(Tidak ada menu yang sesuai filter)'));
  } else {
    const sortedItems = sortItemsByMenuOrder(Array.from(itemMap.values()), menuItems);
    for (const item of sortedItems) {
      lines.push(item.name);
      const qtyPart = preset.showItemQty ? ` ${item.quantity}x` : '';
      const subtotalPart = preset.showItemPrice ? formatRupiah(item.subtotal) : '';
      if (qtyPart || subtotalPart) {
        lines.push(padLeftRight(qtyPart, subtotalPart));
      }
    }
  }

  // Calculate totals
  const transactionsGrandTotal = transactions.reduce((acc, tx) => acc + (tx.totalPrice || 0), 0);
  const shouldShowSubtotal = preset.showSubtotal !== false;
  const shouldShowGrandTotal = preset.showTotalPrice !== false;
  const hasFilter = filteredItemsSubtotal > 0 && filteredItemsSubtotal !== transactionsGrandTotal;

  if (shouldShowSubtotal || shouldShowGrandTotal) {
    lines.push(separator('-'));
    if (hasFilter) {
      if (shouldShowSubtotal) {
        lines.push(padLeftRight(`Subtotal Item (${totalItemsCount})`, `Rp ${formatRupiah(filteredItemsSubtotal)}`));
      }
      if (shouldShowGrandTotal) {
        lines.push(padLeftRight('TOTAL TRANSAKSI', `Rp ${formatRupiah(transactionsGrandTotal)}`));
      }
    } else {
      lines.push(padLeftRight(`TOTAL (${totalItemsCount} item)`, `Rp ${formatRupiah(transactionsGrandTotal)}`));
    }
  }

  // Footer option: check preset.printFooter !== false
  const shouldPrintFooter = preset.printFooter !== false;
  if (shouldPrintFooter) {
    lines.push(separator('='));
    if (preset.customFooter && preset.customFooter.trim()) {
      lines.push(padCenter(preset.customFooter.trim()));
    } else if (footerNote && footerNote.trim()) {
      lines.push(padCenter(footerNote.trim()));
    } else {
      lines.push(padCenter('Rekap Selesai'));
    }
    lines.push('');
  } else {
    lines.push(separator('='));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Convert 32-character monospace string into raw ESC/POS byte sequence
 * Matching the exact Android RFCOMM specifications:
 * - Fixed 1x font scale, standard text (no bold)
 * - Line feed bottom padding: 0x1B, 0x64, 0x02
 */
export function textToEscPosBytes(text: string): Uint8Array {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text + '\n');

  // ESC/POS Command sequences:
  // ESC @: Init printer (0x1B, 0x40)
  // ESC ! 0: Select standard character font, regular weight (0x1B, 0x21, 0x00)
  const initCommands = new Uint8Array([0x1b, 0x40, 0x1b, 0x21, 0x00]);

  // Feed 2 lines bottom margin (0x1B, 0x64, 0x02) for clean, compact tear-off (2-3 lines total)
  const endCommands = new Uint8Array([0x1b, 0x64, 0x02]);

  // Combine into a single byte stream
  const totalLength = initCommands.length + textBytes.length + endCommands.length;
  const result = new Uint8Array(totalLength);

  result.set(initCommands, 0);
  result.set(textBytes, initCommands.length);
  result.set(endCommands, initCommands.length + textBytes.length);

  return result;
}
