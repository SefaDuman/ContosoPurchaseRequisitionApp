/**
 * App-wide state: the cart, the active company, and the selected requester.
 *
 * Implemented with React context (no extra dependency). The cart is the source
 * of truth for the Cart/Create-requisition screen.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CartLine, Product, Worker } from '../models';
import {
  DEFAULT_COMPANY,
  DEFAULT_PREPARER_PERSONNEL_NUMBER,
  getCurrentEmployee,
  getCurrentUserInfo,
  getCurrentUserPhoto,
  inferUserCompany,
} from '../services';

let lineSeq = 0;
const nextId = () => `cl-${Date.now()}-${lineSeq++}`;

/** Selected product dimension values passed when adding a catalog item. */
export type Dimensions = {
  color?: string;
  size?: string;
  configuration?: string;
  style?: string;
};

export interface AppState {
  company: string;
  setCompany: (value: string) => void;
  cart: CartLine[];
  cartCount: number;
  cartTotal: number;
  /** Personnel number of the selected requester/preparer. */
  requesterPersonnelNumber: string;
  setRequesterPersonnelNumber: (value: string) => void;
  /** Worker resolved from the signed-in user's email, when available. */
  currentWorker?: Worker;
  /** Signed-in user's display name from the host context (avatar/name fallback). */
  userFullName?: string;
  /** Signed-in user's photo as a data URI (Office 365 Users `UserPhoto_V2`). */
  userPhotoUrl?: string;
  /** True while the signed-in user is being resolved on startup. */
  resolvingUser: boolean;
  addCatalogItem: (
    product: Product,
    quantity: number,
    categoryName: string,
    dimensions?: Dimensions,
  ) => void;
  addNonCatalogItem: (description: string, categoryName: string, quantity: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeLine: (id: string) => void;
  clearCart: () => void;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [company, setCompany] = useState(DEFAULT_COMPANY);
  const [requesterPersonnelNumber, setRequesterPersonnelNumber] = useState(
    DEFAULT_PREPARER_PERSONNEL_NUMBER,
  );
  const [currentWorker, setCurrentWorker] = useState<Worker>();
  const [userFullName, setUserFullName] = useState<string>();
  const [userPhotoUrl, setUserPhotoUrl] = useState<string>();
  const [resolvingUser, setResolvingUser] = useState(true);

  // Resolve the signed-in user to an F&O employee via the party-number chain
  // (email → DirPersonUser.PartyNumber → HcmEmployeeV2), then point the requester
  // at that employee so "My requisitions" shows their related records.
  useEffect(() => {
    let active = true;
    getCurrentUserInfo()
      .then((info) => {
        if (active) setUserFullName(info.fullName);
      })
      .catch(() => {});
    getCurrentUserPhoto()
      .then((url) => {
        if (active) setUserPhotoUrl(url);
      })
      .catch(() => {});
    getCurrentEmployee()
      .then(async (worker) => {
        if (!active) return;
        setCurrentWorker(worker);
        if (worker?.personnelNumber) {
          setRequesterPersonnelNumber(worker.personnelNumber);
          // Default the active company to the one the user buys for most often.
          const inferred = await inferUserCompany(worker.personnelNumber);
          if (active && inferred) setCompany(inferred);
        }
      })
      .catch(() => {
        // Keep the default requester/company when resolution fails (e.g. dev mode).
      })
      .finally(() => {
        if (active) setResolvingUser(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AppState>(() => {
    const addCatalogItem = (
      product: Product,
      quantity: number,
      categoryName: string,
      dimensions?: Dimensions,
    ) => {
      setCart((prev) => {
        // Merge only when it's the same product AND the same dimension selection.
        const existing = prev.find(
          (l) =>
            !l.isNonCatalog &&
            l.product?.productNumber === product.productNumber &&
            l.color === dimensions?.color &&
            l.size === dimensions?.size &&
            l.configuration === dimensions?.configuration &&
            l.style === dimensions?.style,
        );
        if (existing) {
          return prev.map((l) =>
            l.id === existing.id ? { ...l, quantity: l.quantity + quantity } : l,
          );
        }
        return [
          ...prev,
          {
            id: nextId(),
            product,
            description: product.name,
            categoryName: categoryName || product.categoryName || '',
            quantity,
            indicativePrice: product.indicativePrice,
            unit: product.unit,
            isNonCatalog: false,
            color: dimensions?.color,
            size: dimensions?.size,
            configuration: dimensions?.configuration,
            style: dimensions?.style,
          },
        ];
      });
    };

    const addNonCatalogItem = (description: string, categoryName: string, quantity: number) => {
      setCart((prev) => [
        ...prev,
        {
          id: nextId(),
          description,
          categoryName,
          quantity,
          indicativePrice: 0,
          unit: 'ea',
          isNonCatalog: true,
        },
      ]);
    };

    const updateQuantity = (id: string, quantity: number) =>
      setCart((prev) =>
        prev.map((l) => (l.id === id ? { ...l, quantity: Math.max(1, quantity) } : l)),
      );

    const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));
    const clearCart = () => setCart([]);

    return {
      company,
      setCompany,
      cart,
      cartCount: cart.reduce((n, l) => n + l.quantity, 0),
      cartTotal: cart.reduce((sum, l) => sum + l.indicativePrice * l.quantity, 0),
      requesterPersonnelNumber,
      setRequesterPersonnelNumber,
      currentWorker,
      userFullName,
      userPhotoUrl,
      resolvingUser,
      addCatalogItem,
      addNonCatalogItem,
      updateQuantity,
      removeLine,
      clearCart,
    };
  }, [cart, company, requesterPersonnelNumber, currentWorker, userFullName, userPhotoUrl, resolvingUser]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider');
  return ctx;
}
