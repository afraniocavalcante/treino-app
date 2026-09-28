"use client";

import { useState } from "react";
import "./skincare.css";
import { StoreProvider, useStore } from "./store/store";
import type { TabId } from "./lib/types";
import { SkinCareTabs } from "./components/SkinCareTabs";
import { Fab, ErrorState, LoadingSkeleton } from "./components/States";
import { Home } from "./screens/Home";
import { ProductsScreen } from "./screens/Products";
import { ProductDetail } from "./screens/ProductDetail";
import { RoutinesScreen } from "./screens/Routines";
import { RoutineEditor } from "./screens/RoutineEditor";
import { SkinLogScreen } from "./screens/SkinLog";
import { CompareScreen } from "./screens/Compare";
import { InsightsScreen } from "./screens/Insights";
import {
  AddProductSheet,
  AddWishlistSheet,
  BoughtSheet,
  NewLogSheet,
  NewRoutineSheet,
} from "./components/AddSheets";

const TAB_ORDER: TabId[] = ["hoje", "produtos", "rotinas", "log", "insights"];

type SheetKind = "addProduct" | "addWishlist" | "bought" | "newLog" | "newRoutine";

function SkinCareShell() {
  const { status, refetch } = useStore();
  const [tab, setTab] = useState<TabId>("hoje");
  const [enterDir, setEnterDir] = useState<"left" | "right">("right");
  const [prodTab, setProdTab] = useState<"estoque" | "lista">("estoque");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);

  const [sheet, setSheet] = useState<{ kind: SheetKind; wishlistId?: string } | null>(null);
  const [sheetClosing, setSheetClosing] = useState(false);

  function selectTab(next: TabId) {
    const from = TAB_ORDER.indexOf(tab);
    const to = TAB_ORDER.indexOf(next);
    setEnterDir(to >= from ? "right" : "left");
    setTab(next);
  }

  function closeSheet() {
    setSheetClosing(true);
    setTimeout(() => {
      setSheet(null);
      setSheetClosing(false);
    }, 250);
  }

  const overlayOpen = detailId != null || editingRoutineId != null || compareIds != null;
  const showFab = (tab === "produtos" || tab === "log" || tab === "rotinas") && !overlayOpen && sheet == null;

  function fabAction() {
    if (tab === "log") setSheet({ kind: "newLog" });
    else if (tab === "produtos") setSheet({ kind: prodTab === "estoque" ? "addProduct" : "addWishlist" });
    else if (tab === "rotinas") setSheet({ kind: "newRoutine" });
  }

  // Skin Care abre "bleed" (src/app/os/FullScreenApp.tsx): a janela não dá
  // mais padding nem cabeçalho, só o botão de fechar flutuando por cima — o
  // padding horizontal (mesmo 16px que as outras janelas usavam) e o respiro
  // no topo pra não ficar embaixo desse botão viram responsabilidade daqui.
  const shellPadding = { padding: "calc(env(safe-area-inset-top, 0px) + 64px) 16px calc(env(safe-area-inset-bottom, 0px) + 32px)" };

  if (status === "loading") {
    return (
      <div className="paper-grid" style={{ width: "100%", height: "100%", ...shellPadding }}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="paper-grid" style={{ width: "100%", height: "100%", ...shellPadding }}>
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="paper-grid" style={{ width: "100%", height: "100%", position: "relative", overflowY: "auto", ...shellPadding }}>
      <SkinCareTabs active={tab} onSelect={selectTab} />

      <div key={tab} className={enterDir === "right" ? "anim-enter-right" : "anim-enter-left"}>
        {tab === "hoje" && <Home onOpenLogSheet={() => setSheet({ kind: "newLog" })} />}
        {tab === "produtos" && (
          <ProductsScreen
            prodTab={prodTab}
            onChangeProdTab={setProdTab}
            onOpenDetail={setDetailId}
            onOpenAddProduct={() => setSheet({ kind: "addProduct" })}
            onOpenBought={(wishlistId) => setSheet({ kind: "bought", wishlistId })}
          />
        )}
        {tab === "rotinas" && <RoutinesScreen onEdit={setEditingRoutineId} />}
        {tab === "log" && <SkinLogScreen onOpenCompare={setCompareIds} />}
        {tab === "insights" && <InsightsScreen />}
      </div>

      {detailId && (
        <ProductDetail
          productId={detailId}
          onClose={() => setDetailId(null)}
          onAddToList={() => setSheet({ kind: "addWishlist" })}
        />
      )}

      {editingRoutineId && (
        <RoutineEditor routineId={editingRoutineId} onClose={() => setEditingRoutineId(null)} />
      )}

      {compareIds && <CompareScreen ids={compareIds} onClose={() => setCompareIds(null)} />}

      {showFab && <Fab onClick={fabAction} />}

      {sheet?.kind === "addProduct" && <AddProductSheet closing={sheetClosing} onClose={closeSheet} />}
      {sheet?.kind === "addWishlist" && <AddWishlistSheet closing={sheetClosing} onClose={closeSheet} />}
      {sheet?.kind === "bought" && sheet.wishlistId && (
        <BoughtSheet wishlistId={sheet.wishlistId} closing={sheetClosing} onClose={closeSheet} />
      )}
      {sheet?.kind === "newLog" && <NewLogSheet closing={sheetClosing} onClose={closeSheet} />}
      {sheet?.kind === "newRoutine" && (
        <NewRoutineSheet
          closing={sheetClosing}
          onClose={closeSheet}
          onCreated={(routineId) => {
            closeSheet();
            setEditingRoutineId(routineId);
          }}
        />
      )}
    </div>
  );
}

export function SkinCareApp() {
  return (
    <div className="skincare" style={{ width: "100%", height: "100%" }}>
      <StoreProvider>
        <SkinCareShell />
      </StoreProvider>
    </div>
  );
}
