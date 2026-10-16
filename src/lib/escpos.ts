import { OrderItem, Transaction } from "@/types";

export const LINE_WIDTH = 32;

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
  storeName: string = 'KASIR-E',
  header?: string,
  footer?: string
): string {
  const lines: string[] = [];

  // Header
  lines.push(padCenter(storeName));
  if (header) {
    lines.push(padCenter(header));
  }
  lines.push(separator('='));

  // Info
  const dateStr = new Date(tx.timestamp).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  lines.push(padLeftRight(`No: ${tx.id}`, dateStr));
  lines.push(separator('-'));

  // Items
  for (const item of tx.items) {
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

  if (tx.note) {
    lines.push(separator('-'));
    lines.push(`Ket: ${tx.note}`);
  }

  lines.push(separator('='));
  lines.push(padCenter(footer || 'Terima Kasih Atas Kunjungan Anda'));
  lines.push(padCenter('Selamat Menikmati'));
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate Kawul aggregated receipt: strictly filters items containing "Bakso"
 */
export function generateKawulReceiptText(
  transactions: Transaction[],
  storeName: string = 'KASIR-E'
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
  const itemMap = new Map<string, { name: string; quantity: number; subtotal: number }>();
  let grandTotal = 0;
  let totalBaksoItems = 0;

  for (const tx of transactions) {
    for (const item of tx.items) {
      if (item.name.toLowerCase().includes('bakso')) {
        const key = item.name.trim();
        const existing = itemMap.get(key) || { name: key, quantity: 0, subtotal: 0 };
        existing.quantity += item.quantity;
        existing.subtotal += item.price * item.quantity;
        itemMap.set(key, existing);

        grandTotal += item.price * item.quantity;
        totalBaksoItems += item.quantity;
      }
    }
  }

  if (itemMap.size === 0) {
    lines.push(padCenter('(Tidak ada menu bakso)'));
  } else {
    for (const item of Array.from(itemMap.values())) {
      lines.push(item.name);
      const qtyStr = ` ${item.quantity} porsi`;
      const subtotalStr = formatRupiah(item.subtotal);
      lines.push(padLeftRight(qtyStr, subtotalStr));
    }
  }

  lines.push(separator('-'));
  lines.push(padLeftRight(`TOTAL (${totalBaksoItems} item)`, `Rp ${formatRupiah(grandTotal)}`));
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
  storeName: string = 'KASIR-E'
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
  const itemMap = new Map<string, { name: string; quantity: number; subtotal: number }>();
  let grandTotal = 0;
  let totalQty = 0;

  for (const tx of transactions) {
    for (const item of tx.items) {
      const key = item.name.trim();
      const existing = itemMap.get(key) || { name: key, quantity: 0, subtotal: 0 };
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
    for (const item of Array.from(itemMap.values())) {
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

  // Feed 2 lines bottom margin (0x1B, 0x64, 0x02) followed by 3 newlines for clean tear-off
  const endCommands = new Uint8Array([0x1b, 0x64, 0x02, 0x0a, 0x0a, 0x0a]);

  // Combine into a single byte stream
  const totalLength = initCommands.length + textBytes.length + endCommands.length;
  const result = new Uint8Array(totalLength);

  result.set(initCommands, 0);
  result.set(textBytes, initCommands.length);
  result.set(endCommands, initCommands.length + textBytes.length);

  return result;
}
