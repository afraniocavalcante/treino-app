export type Category = "limpeza" | "tratamento" | "hidratacao" | "protecao";

export type ProductStatus = "active" | "paused" | "finished";

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  stock: number; // 0-100
  openedAt: string; // ISO date
  shelfLifeDays: number;
  notes: string;
  status: ProductStatus;
  photoUrl: string | null;
}

export type WishlistPriority = "proxima" | "testar" | "algumdia";

export interface WishlistItem {
  id: string;
  name: string;
  brand: string;
  category: Category;
  price: string;
  link: string;
  priority: WishlistPriority;
  purchased: boolean;
  productId: string | null;
  photoUrl: string | null;
}

export type FreqMode = "todos" | "dias" | "intervalo";

export interface RoutineStep {
  id: string;
  productId: string;
  instruction: string;
}

export type RoutineStatus = "active" | "archived";

export interface Routine {
  id: string;
  name: string;
  window: string; // "manhã" | "noite" | "semanal" (free label)
  freqMode: FreqMode;
  days: number[]; // 0=domingo ... 6=sábado
  interval: number;
  stepOrder: string[]; // RoutineStep ids, in order
  status: RoutineStatus;
  sortOrder: number; // user-defined display order across routines
}

export interface Checkin {
  date: string; // YYYY-MM-DD
  note: string;
  tags: string[];
}

export interface CheckinItem {
  date: string; // YYYY-MM-DD
  stepId: string;
  done: boolean;
}

export interface SkinLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  note: string;
  tags: string[];
  productIdsInUse: string[];
  routineIdsInUse: string[];
  photoUrl: string | null;
}

export interface AppData {
  products: Product[];
  wishlist: WishlistItem[];
  routines: Routine[];
  routineSteps: RoutineStep[];
  checkins: Checkin[];
  checkinItems: CheckinItem[];
  skinLogs: SkinLogEntry[];
}

export type TabId = "hoje" | "produtos" | "rotinas" | "log" | "insights";
