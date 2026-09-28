"use client";
import { useState } from "react";
import { useStore } from "../store/store";
import { CATEGORY_LABEL, PRIORITY_LABEL, computeProductLife, isRunningLow } from "../lib/derived";
import { CategoryIcon } from "../components/icons";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/States";
import { SwipeableRow } from "../components/SwipeableRow";
import type { Category, Product, WishlistItem } from "../lib/types";

const FILTERS: { id: string; label: string }[] = [
  { id: "todas", label: "todas" },
  { id: "limpeza", label: "limpeza" },
  { id: "tratamento", label: "tratamento" },
  { id: "hidratacao", label: "hidratação" },
  { id: "protecao", label: "proteção" },
  { id: "acabando", label: "acabando" },
];

export function ProductsScreen({
  prodTab,
  onChangeProdTab,
  onOpenDetail,
  onOpenAddProduct,
  onOpenBought,
}: {
  prodTab: "estoque" | "lista";
  onChangeProdTab: (tab: "estoque" | "lista") => void;
  onOpenDetail: (id: string) => void;
  onOpenAddProduct: () => void;
  onOpenBought: (wishlistId: string) => void;
}) {
  const { data, status, refetch, archiveProduct, unarchiveProduct, deleteProduct, deleteWishlistItem } = useStore();
  const [filter, setFilter] = useState("todas");
  const [stockTab, setStockTab] = useState<"ativos" | "arquivados">("ativos");
  const [addedToList, setAddedToList] = useState<Record<string, boolean>>({});
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);

  const archivedProducts = data.products.filter((p) => p.status === "paused");
  const effectiveStockTab = archivedProducts.length > 0 ? stockTab : "ativos";
  const activeProducts = data.products.filter((p) => p.status === "active");
  const shown = activeProducts.filter((p) => {
    if (filter === "todas") return true;
    if (filter === "acabando") return isRunningLow(p);
    return p.category === filter;
  });

  const isEstoque = prodTab === "estoque";
  const subLeft = isEstoque ? "0%" : "50%";

  return (
    <div>
      <div style={{ padding: "14px 0 14px" }}>
        <div style={{ fontSize: 21, fontWeight: 300, letterSpacing: "-.01em", color: "#191715" }}>
          {isEstoque ? "Meu Estoque" : "Lista de Compras"}
        </div>
      </div>

      <div style={{ position: "relative", display: "flex", gap: 22, padding: "0 0", borderBottom: "1px solid #D3CABB" }}>
        <button
          onClick={() => onChangeProdTab("estoque")}
          style={{ padding: "0 0 11px", fontSize: 13.5, color: isEstoque ? "#191715" : "#5C5245", fontWeight: isEstoque ? 500 : 300, transition: "color 200ms ease" }}
        >
          estoque
        </button>
        <button
          onClick={() => onChangeProdTab("lista")}
          style={{ padding: "0 0 11px", fontSize: 13.5, color: !isEstoque ? "#191715" : "#5C5245", fontWeight: !isEstoque ? 500 : 300, transition: "color 200ms ease" }}
        >
          lista de compras
        </button>
        <span
          style={{
            position: "absolute",
            bottom: -1,
            height: 2,
            background: "#5C6540",
            left: subLeft,
            width: "50%",
            transition: "left 240ms cubic-bezier(.2,.7,.2,1), width 240ms cubic-bezier(.2,.7,.2,1)",
          }}
        />
      </div>

      {isEstoque ? (
        <div>
          {archivedProducts.length > 0 && (
            <div style={{ position: "relative", display: "flex", gap: 22, padding: "0 0 14px", borderBottom: "1px solid #D3CABB", marginBottom: 2 }}>
              <button
                onClick={() => setStockTab("ativos")}
                style={{ padding: "0 0 11px", fontSize: 13.5, color: effectiveStockTab === "ativos" ? "#191715" : "#5C5245", fontWeight: effectiveStockTab === "ativos" ? 500 : 300 }}
              >
                ativos
              </button>
              <button
                onClick={() => setStockTab("arquivados")}
                style={{ padding: "0 0 11px", fontSize: 13.5, color: effectiveStockTab === "arquivados" ? "#191715" : "#5C5245", fontWeight: effectiveStockTab === "arquivados" ? 500 : 300 }}
              >
                arquivados ({archivedProducts.length})
              </button>
            </div>
          )}

          {effectiveStockTab === "arquivados" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 0 74px" }}>
              {archivedProducts.map((p) => (
                <SwipeableRow
                  key={p.id}
                  id={p.id}
                  openId={openSwipeId}
                  onOpenChange={setOpenSwipeId}
                  actions={[
                    { label: "excluir", background: "#8E3D1E", color: "#FFFFFF", onClick: () => deleteProduct(p.id) },
                  ]}
                >
                  <div style={{ background: "#FFFFFF", border: "1px solid #D3CABB", borderRadius: 5, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 400 }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 300, color: "#5C5245" }}>{p.brand}</div>
                    </div>
                    <button
                      onClick={() => unarchiveProduct(p.id)}
                      style={{ flex: "none", fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", color: "#5C6540", borderBottom: "1px solid #CBD3B7" }}
                    >
                      reativar
                    </button>
                  </div>
                </SwipeableRow>
              ))}
            </div>
          ) : (
            <>
              <div className="no-scrollbar" style={{ display: "flex", gap: 7, overflowX: "auto", padding: "16px 0 4px" }}>
                {FILTERS.map((f) => {
                  const active = filter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      style={{
                        flex: "none",
                        fontSize: 11.5,
                        letterSpacing: ".04em",
                        padding: "6px 13px",
                        borderRadius: 999,
                        border: `1px solid ${active ? "#191715" : "#D3CABB"}`,
                        background: active ? "#191715" : "#FFFFFF",
                        color: active ? "#FFFFFF" : "#4A423A",
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {status === "loading" ? (
                <LoadingSkeleton />
              ) : status === "error" ? (
                <ErrorState onRetry={refetch} />
              ) : shown.length === 0 ? (
                <EmptyState
                  title="Nenhum produto ainda"
                  body="Cadastre o primeiro produto do seu estoque para montar as rotinas."
                  cta={{ label: "adicionar produto", onClick: onOpenAddProduct }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 0 74px" }}>
                  {shown.map((p) => (
                    <SwipeableRow
                      key={p.id}
                      id={p.id}
                      openId={openSwipeId}
                      onOpenChange={setOpenSwipeId}
                      actions={[
                        { label: "arquivar", background: "#4A423A", color: "#FFFFFF", onClick: () => archiveProduct(p.id) },
                        { label: "excluir", background: "#8E3D1E", color: "#FFFFFF", onClick: () => deleteProduct(p.id) },
                      ]}
                    >
                      <ProductCard
                        product={p}
                        suggested={!!addedToList[p.id]}
                        onOpen={() => onOpenDetail(p.id)}
                        onAddToList={() => setAddedToList((s) => ({ ...s, [p.id]: true }))}
                      />
                    </SwipeableRow>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div>
          {data.wishlist.filter((w) => !w.purchased).length === 0 ? (
            <EmptyState title="Lista vazia" body="Anote aqui o que você quer testar ou repor." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 0 74px" }}>
              {data.wishlist
                .filter((w) => !w.purchased)
                .map((w) => (
                  <SwipeableRow
                    key={w.id}
                    id={w.id}
                    openId={openSwipeId}
                    onOpenChange={setOpenSwipeId}
                    actions={[
                      { label: "excluir", background: "#8E3D1E", color: "#FFFFFF", onClick: () => deleteWishlistItem(w.id) },
                    ]}
                  >
                    <WishlistCard item={w} onBuy={() => onOpenBought(w.id)} />
                  </SwipeableRow>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  suggested,
  onOpen,
  onAddToList,
}: {
  product: Product;
  suggested: boolean;
  onOpen: () => void;
  onAddToList: () => void;
}) {
  const { daysUntilExpire, lifePct } = computeProductLife(product);
  const low = isRunningLow(product);
  const finished = product.stock === 0;
  const arcColor = finished ? "#BDB2A1" : low ? "#8E3D1E" : "#5C6540";
  const discFill = finished ? "#EDE7DD" : "#F0EAE0";
  const cardBorder = low ? "#E0BCA9" : "#D3CABB";
  const badge = finished ? "ACABOU" : low ? "ACABANDO" : null;
  const badgeColor = finished ? "#5C5245" : "#8E3D1E";
  const badgeBg = finished ? "#F5F0E8" : "#F7E7DE";
  const badgeBorder = finished ? "#D3CABB" : "#E0BCA9";
  const lifeColor = lifePct <= 15 ? "#8E3D1E" : "#B9AE99";

  const c = 30;
  const r = 28;
  const dasharray = 2 * Math.PI * r;
  const dashoffset = dasharray * (1 - product.stock / 100);

  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${cardBorder}`, borderRadius: 5, overflow: "hidden" }}>
      <button
        onClick={onOpen}
        style={{ display: "flex", alignItems: "center", gap: 15, width: "100%", textAlign: "left", padding: "14px 16px" }}
      >
        <div style={{ position: "relative", width: 60, height: 60, flex: "none" }}>
          <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: "absolute", inset: 0, display: "block", transform: "rotate(-90deg)" }}>
            <circle cx={c} cy={c} r={r} fill="none" stroke="#E6DFD3" strokeWidth="2" />
            <circle cx={c} cy={c} r={r} fill="none" stroke={arcColor} strokeWidth="2" strokeLinecap="round" strokeDasharray={dasharray} strokeDashoffset={dashoffset} />
            <circle cx={c} cy={c} r="23" fill={discFill} stroke="#D3CABB" strokeWidth="1" />
          </svg>
          {product.photoUrl ? (
            <img
              src={product.photoUrl}
              alt=""
              style={{ position: "absolute", top: 7, left: 7, width: 46, height: 46, borderRadius: 999, objectFit: "cover" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CategoryIcon category={product.category} size={20} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 14.5, fontWeight: 400, lineHeight: 1.25 }}>{product.name}</div>
              <div style={{ fontSize: 11.5, fontWeight: 300, color: "#5C5245", letterSpacing: ".02em" }}>{product.brand}</div>
            </div>
            {badge && (
              <span
                style={{
                  flex: "none",
                  fontSize: 10,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  padding: "3px 9px",
                  borderRadius: 999,
                  border: `1px solid ${badgeBorder}`,
                  background: badgeBg,
                  color: badgeColor,
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 999, background: "#E6DFD3", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(0, lifePct)}%`, background: lifeColor }} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 300, color: "#5C5245", letterSpacing: ".02em", whiteSpace: "nowrap" }}>
              {daysUntilExpire > 0 ? `vence em ${daysUntilExpire} dias` : "vencido"}
            </span>
          </div>
        </div>
      </button>
      {low && !suggested && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "11px 16px",
            borderTop: "1px solid #E6DFD3",
            background: "#F5F0E8",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 300, color: "#4A423A" }}>Adicionar à lista de compras?</span>
          <button
            onClick={onAddToList}
            style={{
              flex: "none",
              fontSize: 11.5,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: "#8E3D1E",
              borderBottom: "1px solid #E0BCA9",
              paddingBottom: 1,
            }}
          >
            adicionar
          </button>
        </div>
      )}
    </div>
  );
}

function WishlistCard({ item, onBuy }: { item: WishlistItem; onBuy: () => void }) {
  const prioStyle =
    item.priority === "proxima"
      ? { bg: "#E7EBDD", border: "#CBD3B7", color: "#39441F" }
      : item.priority === "testar"
        ? { bg: "#E2DDCB", border: "#B9AE99", color: "#191715" }
        : { bg: "transparent", border: "#D3CABB", color: "#4A423A" };

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #D3CABB", borderRadius: 5, padding: "15px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div
          style={{
            width: 46,
            height: 46,
            flex: "none",
            borderRadius: 999,
            border: item.photoUrl ? "1px solid #D3CABB" : "1px dashed #BDB2A1",
            background: "#F0EAE0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {item.photoUrl ? (
            <img src={item.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14">
              <line x1="7" y1="2" x2="7" y2="12" stroke="#5C5245" strokeWidth="1.1" />
              <line x1="2" y1="7" x2="12" y2="7" stroke="#5C5245" strokeWidth="1.1" />
            </svg>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 400, lineHeight: 1.25 }}>{item.name}</div>
          <div style={{ fontSize: 11.5, fontWeight: 300, color: "#5C5245", letterSpacing: ".02em" }}>{item.brand}</div>
        </div>
        <span
          style={{
            flex: "none",
            fontSize: 10,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            padding: "3px 9px",
            borderRadius: 999,
            border: `1px solid ${prioStyle.border}`,
            background: prioStyle.bg,
            color: prioStyle.color,
          }}
        >
          {PRIORITY_LABEL[item.priority]}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "#4A423A",
            border: "1px solid #D3CABB",
            borderRadius: 999,
            padding: "3px 9px",
          }}
        >
          {CATEGORY_LABEL[item.category as Category]}
        </span>
        <span style={{ fontSize: 12, fontWeight: 300, color: "#4A423A" }}>{item.price}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, borderTop: "1px solid #E6DFD3", paddingTop: 12 }}>
        <button
          onClick={onBuy}
          style={{ fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", padding: "9px 16px", borderRadius: 999, background: "#191715", color: "#FFFFFF" }}
        >
          comprei
        </button>
        {item.link && (
          <a href={item.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 300, color: "#5C6540", borderBottom: "1px solid #CBD3B7", paddingBottom: 1 }}>
            abrir link
          </a>
        )}
      </div>
    </div>
  );
}
