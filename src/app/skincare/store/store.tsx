"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  Category,
  Checkin,
  CheckinItem,
  Product,
  Routine,
  RoutineStep,
  SkinLogEntry,
  WishlistItem,
  WishlistPriority,
} from "../lib/types";
import { todayISO } from "../lib/dates";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function uuid(): string {
  return crypto.randomUUID();
}

// --- row <-> app-model mapping (DB columns are snake_case) ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Supabase row, shape is asserted below field by field
function productFromRow(r: any): Product {
  return {
    id: r.id,
    name: r.name,
    brand: r.brand,
    category: r.category,
    stock: r.stock,
    openedAt: r.opened_at,
    shelfLifeDays: r.shelf_life_days,
    notes: r.notes,
    status: r.status,
    photoUrl: r.photo_url,
  };
}
function productToRow(p: Product) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    stock: p.stock,
    opened_at: p.openedAt,
    shelf_life_days: p.shelfLifeDays,
    notes: p.notes,
    status: p.status,
    photo_url: p.photoUrl,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Supabase row, shape is asserted below field by field
function wishlistFromRow(r: any): WishlistItem {
  return {
    id: r.id,
    name: r.name,
    brand: r.brand,
    category: r.category,
    price: r.price,
    link: r.link,
    priority: r.priority,
    purchased: r.purchased,
    productId: r.product_id,
    photoUrl: r.photo_url,
  };
}
function wishlistToRow(w: WishlistItem) {
  return {
    id: w.id,
    name: w.name,
    brand: w.brand,
    category: w.category,
    price: w.price,
    link: w.link,
    priority: w.priority,
    purchased: w.purchased,
    product_id: w.productId,
    photo_url: w.photoUrl,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Supabase row, shape is asserted below field by field
function routineFromRow(r: any): Routine {
  return {
    id: r.id,
    name: r.name,
    window: r.window_label,
    freqMode: r.freq_mode,
    days: r.days ?? [],
    interval: r.interval,
    stepOrder: r.step_order ?? [],
    status: r.status ?? "active",
    sortOrder: r.sort_order ?? 0,
  };
}
function routineToRow(r: Routine) {
  return {
    id: r.id,
    name: r.name,
    window_label: r.window,
    freq_mode: r.freqMode,
    days: r.days,
    interval: r.interval,
    step_order: r.stepOrder,
    status: r.status,
    sort_order: r.sortOrder,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Supabase row, shape is asserted below field by field
function stepFromRow(r: any): RoutineStep {
  return { id: r.id, productId: r.product_id, instruction: r.instruction };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Supabase row, shape is asserted below field by field
function checkinFromRow(r: any): Checkin {
  return { date: r.date, note: r.note, tags: r.tags ?? [] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Supabase row, shape is asserted below field by field
function checkinItemFromRow(r: any): CheckinItem {
  return { date: r.date, stepId: r.step_id, done: r.done };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Supabase row, shape is asserted below field by field
function skinLogFromRow(r: any): SkinLogEntry {
  return {
    id: r.id,
    date: r.date,
    note: r.note,
    tags: r.tags ?? [],
    productIdsInUse: r.product_ids_in_use ?? [],
    routineIdsInUse: r.routine_ids_in_use ?? [],
    photoUrl: r.photo_url,
  };
}
function skinLogToRow(l: SkinLogEntry) {
  return {
    id: l.id,
    date: l.date,
    note: l.note,
    tags: l.tags,
    product_ids_in_use: l.productIdsInUse,
    routine_ids_in_use: l.routineIdsInUse,
    photo_url: l.photoUrl,
  };
}

async function fetchAppData(): Promise<AppData> {
  const [products, wishlist, routines, routineSteps, checkins, checkinItems, skinLogs] =
    await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("wishlist_items").select("*").order("created_at", { ascending: false }),
      supabase.from("routines").select("*").order("sort_order", { ascending: true }),
      supabase.from("routine_steps").select("*"),
      supabase.from("checkins").select("*"),
      supabase.from("checkin_items").select("*"),
      supabase.from("skin_logs").select("*").order("date", { ascending: false }),
    ]);

  for (const res of [products, wishlist, routines, routineSteps, checkins, checkinItems, skinLogs]) {
    if (res.error) throw res.error;
  }

  return {
    products: (products.data ?? []).map(productFromRow),
    wishlist: (wishlist.data ?? []).map(wishlistFromRow),
    routines: (routines.data ?? []).map(routineFromRow),
    routineSteps: (routineSteps.data ?? []).map(stepFromRow),
    checkins: (checkins.data ?? []).map(checkinFromRow),
    checkinItems: (checkinItems.data ?? []).map(checkinItemFromRow),
    skinLogs: (skinLogs.data ?? []).map(skinLogFromRow),
  };
}

interface StoreValue {
  data: AppData;
  status: "loading" | "ready" | "error";
  refetch: () => void;
  toggleStep: (date: string, stepId: string) => void;
  setNote: (date: string, note: string) => void;
  toggleNoteTag: (date: string, tag: string) => void;
  setStock: (productId: string, value: number) => void;
  archiveProduct: (productId: string) => void;
  unarchiveProduct: (productId: string) => void;
  deleteProduct: (productId: string) => void;
  addProduct: (input: {
    name: string;
    brand: string;
    category: Category;
    openedAt: string;
    shelfLifeDays: number;
    stock?: number;
    photoUrl?: string | null;
  }) => Product;
  addWishlistItem: (input: {
    name: string;
    brand: string;
    category: Category;
    price: string;
    link: string;
    priority: WishlistPriority;
    photoUrl?: string | null;
  }) => void;
  markPurchased: (wishlistId: string, openedAt?: string) => void;
  deleteWishlistItem: (wishlistId: string) => void;
  addSkinLog: (input: {
    date: string;
    note: string;
    tags: string[];
    photoUrl?: string | null;
  }) => void;
  saveRoutine: (routine: Routine) => void;
  createRoutine: (input: { name: string; window: string }) => string;
  deleteRoutine: (routineId: string) => void;
  archiveRoutine: (routineId: string) => void;
  unarchiveRoutine: (routineId: string) => void;
  reorderRoutines: (orderedIds: string[]) => void;
  addRoutineStep: (routineId: string, productId: string) => string;
  deleteRoutineStep: (stepId: string) => void;
  setStepInstruction: (stepId: string, instruction: string) => void;
  resetData: () => void;
}

const EMPTY_DATA: AppData = {
  products: [],
  wishlist: [],
  routines: [],
  routineSteps: [],
  checkins: [],
  checkinItems: [],
  skinLogs: [],
};

const StoreContext = createContext<StoreValue | null>(null);

function logError(context: string, err: unknown) {
  console.error(`[skincare] ${context}`, err);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(() => {
    setStatus("loading");
    fetchAppData()
      .then((fetched) => {
        setData(fetched);
        setStatus("ready");
      })
      .catch((err) => {
        logError("failed to load data", err);
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() only sets state inside its async .then/.catch, not synchronously here
    load();
  }, [load]);

  const value = useMemo<StoreValue>(() => {
    function ensureCheckin(d: AppData, date: string): AppData {
      if (d.checkins.some((c) => c.date === date)) return d;
      return { ...d, checkins: [...d.checkins, { date, note: "", tags: [] }] };
    }

    return {
      data,
      status,
      refetch: load,

      toggleStep(date, stepId) {
        const existing = data.checkinItems.find(
          (ci) => ci.date === date && ci.stepId === stepId,
        );
        const nextDone = !existing?.done;
        setData((d) => {
          const has = d.checkinItems.some((ci) => ci.date === date && ci.stepId === stepId);
          const checkinItems = has
            ? d.checkinItems.map((ci) =>
                ci.date === date && ci.stepId === stepId ? { ...ci, done: nextDone } : ci,
              )
            : [...d.checkinItems, { date, stepId, done: nextDone }];
          return { ...d, checkinItems };
        });
        supabase
          .from("checkin_items")
          .upsert({ date, step_id: stepId, done: nextDone }, { onConflict: "user_id,date,step_id" })
          .then(({ error }) => error && logError("toggleStep", error));
      },

      setNote(date, note) {
        setData((d) => {
          const next = ensureCheckin(d, date);
          return {
            ...next,
            checkins: next.checkins.map((c) => (c.date === date ? { ...c, note } : c)),
          };
        });
        supabase
          .from("checkins")
          .upsert({ date, note }, { onConflict: "user_id,date" })
          .then(({ error }) => error && logError("setNote", error));
      },

      toggleNoteTag(date, tag) {
        let nextTags: string[] = [];
        setData((d) => {
          const next = ensureCheckin(d, date);
          const updated = next.checkins.map((c) => {
            if (c.date !== date) return c;
            const has = c.tags.includes(tag);
            nextTags = has ? c.tags.filter((t) => t !== tag) : [...c.tags, tag];
            return { ...c, tags: nextTags };
          });
          return { ...next, checkins: updated };
        });
        queueMicrotask(() => {
          supabase
            .from("checkins")
            .upsert({ date, tags: nextTags }, { onConflict: "user_id,date" })
            .then(({ error }) => error && logError("toggleNoteTag", error));
        });
      },

      setStock(productId, value) {
        const clamped = Math.max(0, Math.min(100, Math.round(value)));
        setData((d) => ({
          ...d,
          products: d.products.map((p) => (p.id === productId ? { ...p, stock: clamped } : p)),
        }));
        supabase
          .from("products")
          .update({ stock: clamped })
          .eq("id", productId)
          .then(({ error }) => error && logError("setStock", error));
      },

      archiveProduct(productId) {
        setData((d) => ({
          ...d,
          products: d.products.map((p) => (p.id === productId ? { ...p, status: "paused" } : p)),
        }));
        supabase
          .from("products")
          .update({ status: "paused" })
          .eq("id", productId)
          .then(({ error }) => error && logError("archiveProduct", error));
      },

      unarchiveProduct(productId) {
        setData((d) => ({
          ...d,
          products: d.products.map((p) => (p.id === productId ? { ...p, status: "active" } : p)),
        }));
        supabase
          .from("products")
          .update({ status: "active" })
          .eq("id", productId)
          .then(({ error }) => error && logError("unarchiveProduct", error));
      },

      deleteProduct(productId) {
        const removedStepIds = data.routineSteps
          .filter((s) => s.productId === productId)
          .map((s) => s.id);
        const affectedRoutines = data.routines.filter((r) =>
          r.stepOrder.some((id) => removedStepIds.includes(id)),
        );

        setData((d) => ({
          ...d,
          products: d.products.filter((p) => p.id !== productId),
          routineSteps: d.routineSteps.filter((s) => s.productId !== productId),
          routines: d.routines.map((r) =>
            r.stepOrder.some((id) => removedStepIds.includes(id))
              ? { ...r, stepOrder: r.stepOrder.filter((id) => !removedStepIds.includes(id)) }
              : r,
          ),
        }));

        // routine_steps cascade-deletes in the DB via the product FK, but
        // step_order is a plain array column (no FK), so each affected
        // routine's stored order needs its own update to drop the dangling id.
        for (const r of affectedRoutines) {
          const nextOrder = r.stepOrder.filter((id) => !removedStepIds.includes(id));
          supabase
            .from("routines")
            .update({ step_order: nextOrder })
            .eq("id", r.id)
            .then(({ error }) => error && logError("deleteProduct:stepOrder", error));
        }

        supabase
          .from("products")
          .delete()
          .eq("id", productId)
          .then(({ error }) => error && logError("deleteProduct", error));
      },

      addProduct(input) {
        const product: Product = {
          id: uuid(),
          name: input.name,
          brand: input.brand,
          category: input.category,
          stock: input.stock ?? 100,
          openedAt: input.openedAt,
          shelfLifeDays: input.shelfLifeDays,
          notes: "",
          status: "active",
          photoUrl: input.photoUrl ?? null,
        };
        setData((d) => ({ ...d, products: [product, ...d.products] }));
        supabase
          .from("products")
          .insert(productToRow(product))
          .then(({ error }) => error && logError("addProduct", error));
        return product;
      },

      addWishlistItem(input) {
        const item: WishlistItem = {
          id: uuid(),
          name: input.name,
          brand: input.brand,
          category: input.category,
          price: input.price,
          link: input.link,
          priority: input.priority,
          purchased: false,
          productId: null,
          photoUrl: input.photoUrl ?? null,
        };
        setData((d) => ({ ...d, wishlist: [item, ...d.wishlist] }));
        supabase
          .from("wishlist_items")
          .insert(wishlistToRow(item))
          .then(({ error }) => error && logError("addWishlistItem", error));
      },

      deleteWishlistItem(wishlistId) {
        setData((d) => ({ ...d, wishlist: d.wishlist.filter((w) => w.id !== wishlistId) }));
        supabase
          .from("wishlist_items")
          .delete()
          .eq("id", wishlistId)
          .then(({ error }) => error && logError("deleteWishlistItem", error));
      },

      markPurchased(wishlistId, openedAt) {
        const item = data.wishlist.find((w) => w.id === wishlistId);
        if (!item) return;
        const product: Product = {
          id: uuid(),
          name: item.name,
          brand: item.brand,
          category: item.category,
          stock: 100,
          openedAt: openedAt ?? todayISO(),
          shelfLifeDays: 180,
          notes: "",
          status: "active",
          photoUrl: item.photoUrl,
        };
        setData((d) => ({
          ...d,
          products: [product, ...d.products],
          wishlist: d.wishlist.map((w) =>
            w.id === wishlistId ? { ...w, purchased: true, productId: product.id } : w,
          ),
        }));
        supabase
          .from("products")
          .insert(productToRow(product))
          .then(({ error }) => error && logError("markPurchased:insert", error));
        supabase
          .from("wishlist_items")
          .update({ purchased: true, product_id: product.id })
          .eq("id", wishlistId)
          .then(({ error }) => error && logError("markPurchased:update", error));
      },

      addSkinLog(input) {
        const activeProductIds = data.products.filter((p) => p.status === "active").map((p) => p.id);
        const activeRoutineIds = data.routines
          .filter((r) => r.status === "active" && r.stepOrder.length > 0)
          .map((r) => r.id);
        const entry: SkinLogEntry = {
          id: uuid(),
          date: input.date,
          note: input.note,
          tags: input.tags,
          productIdsInUse: activeProductIds,
          routineIdsInUse: activeRoutineIds,
          photoUrl: input.photoUrl ?? null,
        };
        setData((d) => ({
          ...d,
          skinLogs: [entry, ...d.skinLogs].sort((a, b) => (a.date < b.date ? 1 : -1)),
        }));
        supabase
          .from("skin_logs")
          .insert(skinLogToRow(entry))
          .then(({ error }) => error && logError("addSkinLog", error));
      },

      saveRoutine(routine) {
        setData((d) => ({
          ...d,
          routines: d.routines.map((r) => (r.id === routine.id ? routine : r)),
        }));
        supabase
          .from("routines")
          .update(routineToRow(routine))
          .eq("id", routine.id)
          .then(({ error }) => error && logError("saveRoutine", error));
      },

      createRoutine(input) {
        const maxSort = data.routines.reduce((m, r) => Math.max(m, r.sortOrder), -1);
        const routine: Routine = {
          id: uid("r"),
          name: input.name,
          window: input.window,
          freqMode: "todos",
          days: [0, 1, 2, 3, 4, 5, 6],
          interval: 1,
          stepOrder: [],
          status: "active",
          sortOrder: maxSort + 1,
        };
        setData((d) => ({ ...d, routines: [...d.routines, routine] }));
        supabase
          .from("routines")
          .insert(routineToRow(routine))
          .then(({ error }) => error && logError("createRoutine", error));
        return routine.id;
      },

      deleteRoutine(routineId) {
        setData((d) => ({
          ...d,
          routines: d.routines.filter((r) => r.id !== routineId),
          routineSteps: d.routineSteps.filter(
            (s) => !d.routines.find((r) => r.id === routineId)?.stepOrder.includes(s.id),
          ),
        }));
        supabase
          .from("routines")
          .delete()
          .eq("id", routineId)
          .then(({ error }) => error && logError("deleteRoutine", error));
      },

      archiveRoutine(routineId) {
        setData((d) => ({
          ...d,
          routines: d.routines.map((r) => (r.id === routineId ? { ...r, status: "archived" } : r)),
        }));
        supabase
          .from("routines")
          .update({ status: "archived" })
          .eq("id", routineId)
          .then(({ error }) => error && logError("archiveRoutine", error));
      },

      unarchiveRoutine(routineId) {
        setData((d) => ({
          ...d,
          routines: d.routines.map((r) => (r.id === routineId ? { ...r, status: "active" } : r)),
        }));
        supabase
          .from("routines")
          .update({ status: "active" })
          .eq("id", routineId)
          .then(({ error }) => error && logError("unarchiveRoutine", error));
      },

      reorderRoutines(orderedIds) {
        setData((d) => {
          const byId = new Map(d.routines.map((r) => [r.id, r]));
          const reordered = orderedIds
            .map((id, idx) => {
              const r = byId.get(id);
              return r ? { ...r, sortOrder: idx } : null;
            })
            .filter((r): r is Routine => r !== null);
          const rest = d.routines.filter((r) => !orderedIds.includes(r.id));
          return { ...d, routines: [...reordered, ...rest] };
        });
        Promise.all(
          orderedIds.map((id, idx) =>
            supabase.from("routines").update({ sort_order: idx }).eq("id", id),
          ),
        ).then((results) => {
          const failed = results.find((r) => r.error);
          if (failed?.error) logError("reorderRoutines", failed.error);
        });
      },

      setStepInstruction(stepId, instruction) {
        setData((d) => ({
          ...d,
          routineSteps: d.routineSteps.map((s) => (s.id === stepId ? { ...s, instruction } : s)),
        }));
        supabase
          .from("routine_steps")
          .update({ instruction })
          .eq("id", stepId)
          .then(({ error }) => error && logError("setStepInstruction", error));
      },

      addRoutineStep(routineId, productId) {
        const stepId = uid("s");
        setData((d) => ({
          ...d,
          routineSteps: [...d.routineSteps, { id: stepId, productId, instruction: "" }],
        }));
        supabase
          .from("routine_steps")
          .insert({ id: stepId, routine_id: routineId, product_id: productId, instruction: "" })
          .then(({ error }) => error && logError("addRoutineStep", error));
        return stepId;
      },

      deleteRoutineStep(stepId) {
        setData((d) => ({
          ...d,
          routineSteps: d.routineSteps.filter((s) => s.id !== stepId),
        }));
        supabase
          .from("routine_steps")
          .delete()
          .eq("id", stepId)
          .then(({ error }) => error && logError("deleteRoutineStep", error));
      },

      resetData() {
        load();
      },
    };
  }, [data, status, load]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
