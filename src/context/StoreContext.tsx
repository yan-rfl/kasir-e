'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MenuItem, OrderItem, Transaction, PrintJob } from '@/types';
import { useAuth } from './AuthContext';
import { initFirebase } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import {
  generateSingleReceiptText,
  generateKawulReceiptText,
  generateMamahReceiptText,
  textToEscPosBytes,
} from '@/lib/escpos';
import { bluetoothPrinter } from '@/lib/bluetoothPrinter';

interface StoreContextType {
  menuItems: MenuItem[];
  categories: string[];
  transactions: Transaction[];
  cart: { [id: string]: OrderItem };
  cartTotal: number;
  cartCount: number;
  lastPrintJob: PrintJob | null;
  activePrintModalJob: PrintJob | null;
  isLoading: boolean;
  
  // Cart Actions
  addToCart: (item: MenuItem) => void;
  decrementFromCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  
  // Checkout & Transactions
  checkout: (paidAmount?: number, note?: string, autoPrint?: boolean) => Promise<Transaction>;
  resetAllTransactions: () => Promise<void>;
  
  // Menu Actions
  addMenuItem: (item: Omit<MenuItem, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'orderIndex'>) => Promise<void>;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  moveMenuItem: (id: string, direction: 'up' | 'down') => Promise<void>;

  // Printing Actions
  printSingleTransaction: (tx: Transaction) => Promise<void>;
  printKawulReport: (selectedTxs: Transaction[]) => Promise<void>;
  printMamahReport: (selectedTxs: Transaction[]) => Promise<void>;
  reprintLastJob: () => Promise<void>;
  closePrintModal: () => void;
  triggerBrowserPrint: (text: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEY_MENU = 'kasire_menu_catalog_v2';
const STORAGE_KEY_TX = 'kasire_transactions_v2';
const STORAGE_KEY_COUNTER = 'kasire_tx_counter_v2';

const SEED_MENU_ITEMS: Omit<MenuItem, 'userId'>[] = [
  {
    id: 'm-1',
    name: 'Bakso Urat Komplit',
    price: 18000,
    category: 'makanan',
    orderIndex: 0,
    available: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'm-2',
    name: 'Bakso Telur Puyuh',
    price: 16000,
    category: 'makanan',
    orderIndex: 1,
    available: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'm-3',
    name: 'Mie Ayam Bakso',
    price: 15000,
    category: 'makanan',
    orderIndex: 2,
    available: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'm-4',
    name: 'Mie Ayam Ceker',
    price: 14000,
    category: 'makanan',
    orderIndex: 3,
    available: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'm-5',
    name: 'Es Teh Manis',
    price: 4000,
    category: 'minuman',
    orderIndex: 4,
    available: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'm-6',
    name: 'Es Jeruk Peras',
    price: 6000,
    category: 'minuman',
    orderIndex: 5,
    available: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'm-7',
    name: 'Kerupuk Putih Kaleng',
    price: 2000,
    category: 'cemilan',
    orderIndex: 6,
    available: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'm-8',
    name: 'Pangsit Goreng Crispy',
    price: 3000,
    category: 'cemilan',
    orderIndex: 7,
    available: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isFirebaseConfigured } = useAuth();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txCounter, setTxCounter] = useState<number>(1);
  const [cart, setCart] = useState<{ [id: string]: OrderItem }>({});
  const [lastPrintJob, setLastPrintJob] = useState<PrintJob | null>(null);
  const [activePrintModalJob, setActivePrintModalJob] = useState<PrintJob | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const currentUserId = user ? user.uid : 'local-owner';

  // Load Initial Data (Firestore or LocalStorage)
  useEffect(() => {
    let unsubMenu: (() => void) | null = null;
    let unsubTx: (() => void) | null = null;

    if (isFirebaseConfigured && user) {
      const { db } = initFirebase();
      if (db) {
        setIsLoading(true);
        // Menu Items snapshot
        const menuCol = collection(db, 'users', user.uid, 'menu');
        const qMenu = query(menuCol, orderBy('orderIndex', 'asc'));
        unsubMenu = onSnapshot(qMenu, (snap) => {
          if (!snap.empty) {
            const items = snap.docs.map((d) => d.data() as MenuItem);
            setMenuItems(items);
          } else {
            // Seed initial menu items to firestore
            const batch = writeBatch(db);
            const seeded = SEED_MENU_ITEMS.map((item) => ({ ...item, userId: user.uid }));
            seeded.forEach((item) => {
              const ref = doc(db, 'users', user.uid, 'menu', item.id);
              batch.set(ref, item);
            });
            batch.commit().catch(console.error);
            setMenuItems(seeded);
          }
        });

        // Transactions snapshot
        const txCol = collection(db, 'users', user.uid, 'transactions');
        const qTx = query(txCol, orderBy('timestamp', 'desc'));
        unsubTx = onSnapshot(qTx, (snap) => {
          const list = snap.docs.map((d) => d.data() as Transaction);
          setTransactions(list);
          if (list.length > 0) {
            const maxCounter = Math.max(...list.map((t) => t.counter || 0), 0);
            setTxCounter(maxCounter + 1);
          } else {
            setTxCounter(1);
          }
          setIsLoading(false);
        });
      }
    } else {
      // Local Storage Fallback
      try {
        const savedMenu = localStorage.getItem(STORAGE_KEY_MENU);
        if (savedMenu) {
          setMenuItems(JSON.parse(savedMenu));
        } else {
          const seeded = SEED_MENU_ITEMS.map((item) => ({ ...item, userId: 'local-owner' }));
          setMenuItems(seeded);
          localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(seeded));
        }

        const savedTx = localStorage.getItem(STORAGE_KEY_TX);
        if (savedTx) {
          const parsed = JSON.parse(savedTx);
          setTransactions(parsed);
        }

        const savedCounter = localStorage.getItem(STORAGE_KEY_COUNTER);
        if (savedCounter) {
          setTxCounter(parseInt(savedCounter, 10));
        }
      } catch (err) {
        console.error('Error loading local storage data', err);
      }
      setIsLoading(false);
    }

    return () => {
      if (unsubMenu) unsubMenu();
      if (unsubTx) unsubTx();
    };
  }, [user, isFirebaseConfigured]);

  // Derived categories
  const categories = React.useMemo(() => {
    const defaultCats = ['makanan', 'minuman', 'cemilan', 'lainnya'];
    const customCats = Array.from(new Set(menuItems.map((m) => (m.category || 'lainnya').toLowerCase())));
    const set = new Set([...defaultCats, ...customCats]);
    return Array.from(set);
  }, [menuItems]);

  // Cart Calculations
  const cartItemsList = Object.values(cart);
  const cartTotal = cartItemsList.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartCount = cartItemsList.reduce((acc, item) => acc + item.quantity, 0);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev[item.id];
      const quantity = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [item.id]: {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity,
          category: item.category,
        },
      };
    });
  };

  const decrementFromCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev[item.id];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return {
        ...prev,
        [item.id]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  // Printing Helper
  const dispatchPrintJob = async (job: PrintJob) => {
    setLastPrintJob(job);
    setActivePrintModalJob(job);

    // If bluetooth is connected, send raw bytes
    if (bluetoothPrinter.isConnected() && job.rawBytes) {
      try {
        await bluetoothPrinter.printBytes(job.rawBytes);
      } catch (err) {
        console.warn('Bluetooth print failed, modal keeps print ulang option available', err);
      }
    }
  };

  const reprintLastJob = async () => {
    if (!lastPrintJob) return;
    if (bluetoothPrinter.isConnected() && lastPrintJob.rawBytes) {
      try {
        await bluetoothPrinter.printBytes(lastPrintJob.rawBytes);
        return;
      } catch (err) {
        console.warn('Reprint via bluetooth failed', err);
      }
    }
    // Fallback to browser print
    triggerBrowserPrint(lastPrintJob.content);
  };

  const closePrintModal = () => {
    setActivePrintModalJob(null);
  };

  const triggerBrowserPrint = (text: string) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk Kasir-E</title>
          <style>
            @page { size: 58mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              line-height: 1.25;
              width: 58mm;
              margin: 0;
              padding: 6px 4px;
              color: #000;
              white-space: pre-wrap;
              word-break: break-all;
            }
          </style>
        </head>
        <body>${text}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Checkout Action
  const checkout = async (
    paidAmount?: number,
    note?: string,
    autoPrint: boolean = true
  ): Promise<Transaction> => {
    const items = Object.values(cart);
    if (items.length === 0) {
      throw new Error('Keranjang belanja kosong');
    }

    const currentCounter = txCounter;
    // Format 5-digit zero padded (e.g. #00001)
    const formattedId = `#${currentCounter.toString().padStart(5, '0')}`;
    const paid = paidAmount !== undefined ? paidAmount : cartTotal;
    const change = Math.max(0, paid - cartTotal);

    const newTx: Transaction = {
      id: formattedId,
      counter: currentCounter,
      userId: currentUserId,
      timestamp: Date.now(),
      items,
      totalPrice: cartTotal,
      paidAmount: paid,
      changeAmount: change,
      note,
    };

    // Save to Firestore or LocalStorage
    if (isFirebaseConfigured && user) {
      const { db } = initFirebase();
      if (db) {
        const txDoc = doc(db, 'users', user.uid, 'transactions', formattedId);
        await setDoc(txDoc, newTx);
      }
    } else {
      const updatedList = [newTx, ...transactions];
      setTransactions(updatedList);
      localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(updatedList));
      localStorage.setItem(STORAGE_KEY_COUNTER, (currentCounter + 1).toString());
    }

    setTxCounter((prev) => prev + 1);
    clearCart();

    // Generate print text and raw ESC/POS bytes
    const receiptText = generateSingleReceiptText(
      newTx,
      profile.storeName,
      profile.receiptHeader,
      profile.receiptFooter
    );
    const rawBytes = textToEscPosBytes(receiptText);

    const job: PrintJob = {
      title: `Struk ${formattedId}`,
      content: receiptText,
      rawBytes,
      type: 'receipt',
      createdAt: Date.now(),
    };

    if (autoPrint) {
      await dispatchPrintJob(job);
    } else {
      setLastPrintJob(job);
    }

    return newTx;
  };

  // Reset All Transactions
  const resetAllTransactions = async () => {
    if (isFirebaseConfigured && user) {
      const { db } = initFirebase();
      if (db) {
        const batch = writeBatch(db);
        for (const t of transactions) {
          const ref = doc(db, 'users', user.uid, 'transactions', t.id);
          batch.delete(ref);
        }
        await batch.commit();
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_TX);
      localStorage.setItem(STORAGE_KEY_COUNTER, '1');
    }

    setTransactions([]);
    setTxCounter(1);
  };

  // Menu CRUD
  const addMenuItem = async (
    itemData: Omit<MenuItem, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'orderIndex'>
  ) => {
    const newId = `m-${Date.now()}`;
    const newItem: MenuItem = {
      ...itemData,
      id: newId,
      userId: currentUserId,
      orderIndex: menuItems.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const nextItems = [...menuItems, newItem];
    setMenuItems(nextItems);

    if (isFirebaseConfigured && user) {
      const { db } = initFirebase();
      if (db) {
        const ref = doc(db, 'users', user.uid, 'menu', newId);
        await setDoc(ref, newItem);
      }
    } else {
      localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(nextItems));
    }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    const nextItems = menuItems.map((item) =>
      item.id === id ? { ...item, ...updates, updatedAt: Date.now() } : item
    );
    setMenuItems(nextItems);

    if (isFirebaseConfigured && user) {
      const { db } = initFirebase();
      if (db) {
        const ref = doc(db, 'users', user.uid, 'menu', id);
        await setDoc(ref, { ...updates, updatedAt: Date.now() }, { merge: true });
      }
    } else {
      localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(nextItems));
    }
  };

  const deleteMenuItem = async (id: string) => {
    const nextItems = menuItems.filter((item) => item.id !== id);
    setMenuItems(nextItems);

    if (isFirebaseConfigured && user) {
      const { db } = initFirebase();
      if (db) {
        const ref = doc(db, 'users', user.uid, 'menu', id);
        await deleteDoc(ref);
      }
    } else {
      localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(nextItems));
    }
  };

  const moveMenuItem = async (id: string, direction: 'up' | 'down') => {
    const idx = menuItems.findIndex((m) => m.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === menuItems.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = [...menuItems];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    // re-assign orderIndex
    const updated = reordered.map((item, i) => ({ ...item, orderIndex: i }));
    setMenuItems(updated);

    if (isFirebaseConfigured && user) {
      const { db } = initFirebase();
      if (db) {
        const batch = writeBatch(db);
        updated.forEach((item) => {
          const ref = doc(db, 'users', user.uid, 'menu', item.id);
          batch.update(ref, { orderIndex: item.orderIndex });
        });
        await batch.commit();
      }
    } else {
      localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(updated));
    }
  };

  // Custom Reports
  const printSingleTransaction = async (tx: Transaction) => {
    const text = generateSingleReceiptText(
      tx,
      profile.storeName,
      profile.receiptHeader,
      profile.receiptFooter
    );
    const bytes = textToEscPosBytes(text);
    await dispatchPrintJob({
      title: `Struk Transaksi ${tx.id}`,
      content: text,
      rawBytes: bytes,
      type: 'receipt',
      createdAt: Date.now(),
    });
  };

  const printKawulReport = async (selectedTxs: Transaction[]) => {
    const text = generateKawulReceiptText(selectedTxs, profile.storeName);
    const bytes = textToEscPosBytes(text);
    await dispatchPrintJob({
      title: 'Rekap Print Kawul (Bakso)',
      content: text,
      rawBytes: bytes,
      type: 'kawul',
      createdAt: Date.now(),
    });
  };

  const printMamahReport = async (selectedTxs: Transaction[]) => {
    const text = generateMamahReceiptText(selectedTxs, profile.storeName);
    const bytes = textToEscPosBytes(text);
    await dispatchPrintJob({
      title: 'Rekap Print Mamah (Total)',
      content: text,
      rawBytes: bytes,
      type: 'mamah',
      createdAt: Date.now(),
    });
  };

  return (
    <StoreContext.Provider
      value={{
        menuItems,
        categories,
        transactions,
        cart,
        cartTotal,
        cartCount,
        lastPrintJob,
        activePrintModalJob,
        isLoading,
        addToCart,
        decrementFromCart,
        removeFromCart,
        clearCart,
        checkout,
        resetAllTransactions,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        moveMenuItem,
        printSingleTransaction,
        printKawulReport,
        printMamahReport,
        reprintLastJob,
        closePrintModal,
        triggerBrowserPrint,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
