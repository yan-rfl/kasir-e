export type MenuCategory = 'all' | 'makanan' | 'minuman' | 'cemilan' | 'lainnya' | string;

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  orderIndex: number;
  available: boolean;
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

export interface Transaction {
  id: string; // Formatted e.g. "#00001"
  counter: number; // 1, 2, 3...
  timestamp: number; // Unix timestamp in ms
  items: OrderItem[];
  totalPrice: number;
  paidAmount?: number;
  changeAmount?: number;
  note?: string;
  userId?: string;
}

export interface ReceiptOptions {
  printStoreName: boolean;
  printStoreAddress: boolean;
  printDateTime: boolean;
  printNotes: boolean;
  printFooter: boolean;
}

export interface PrintPreset {
  id: string;
  name: string; // e.g., "Rekap Kawul (Bakso)", "Rekap Total (Semua Menu)"
  filterKeywords?: string[]; // e.g. ["bakso"] or empty for all items
  category?: string; // "all" | "makanan" | "minuman" | etc.
  showItemQty: boolean; // default true
  showItemPrice: boolean; // default true
  showTotalPrice: boolean; // default true
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  storeName: string;
  ownerPin: string; // Default: "123456"
  receiptHeader?: string;
  receiptFooter?: string;
  receiptOptions?: ReceiptOptions;
  printPresets?: PrintPreset[];
  language: 'id' | 'en';
}

export interface PrintJob {
  title: string;
  content: string; // Preformatted 32-character monospace text
  rawBytes?: Uint8Array;
  type: 'receipt' | 'kawul' | 'mamah' | 'preset';
  createdAt: number;
}

