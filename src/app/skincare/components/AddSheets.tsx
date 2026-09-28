"use client";
import { useState } from "react";
import { Sheet, SheetField, SheetChips, SheetMultiChips } from "./Sheet";
import { useStore } from "../store/store";
import { todayISO } from "../lib/dates";
import { uploadPhoto } from "../lib/storage";
import type { Category, WishlistPriority } from "../lib/types";

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "limpeza", label: "limpeza" },
  { value: "tratamento", label: "tratamento" },
  { value: "hidratacao", label: "hidratação" },
  { value: "protecao", label: "proteção" },
];

const PRIORITY_OPTIONS: { value: WishlistPriority; label: string }[] = [
  { value: "proxima", label: "próxima compra" },
  { value: "testar", label: "quero testar" },
  { value: "algumdia", label: "algum dia" },
];

const TAG_OPTIONS = [
  { value: "acne", label: "acne" },
  { value: "textura", label: "textura" },
  { value: "manchas", label: "manchas" },
  { value: "glow", label: "glow" },
  { value: "oleosidade", label: "oleosidade" },
];

function usePhotoPicker() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function onPhotoChange(f: File) {
    setFile(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  }

  async function upload(folder: string): Promise<string | null> {
    if (!file) return null;
    return uploadPhoto(file, folder);
  }

  return { previewUrl, onPhotoChange, upload };
}

export function AddProductSheet({ closing, onClose }: { closing: boolean; onClose: () => void }) {
  const { addProduct } = useStore();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [openedAt, setOpenedAt] = useState(todayISO());
  const [shelfLifeDays, setShelfLifeDays] = useState("180");
  const [category, setCategory] = useState<Category>("limpeza");
  const [saving, setSaving] = useState(false);
  const photo = usePhotoPicker();

  async function confirm() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const photoUrl = await photo.upload("products");
      addProduct({
        name: name.trim(),
        brand: brand.trim(),
        category,
        openedAt,
        shelfLifeDays: Number(shelfLifeDays) || 180,
        photoUrl,
      });
      onClose();
    } catch (err) {
      console.error("[skincare] photo upload failed", err);
      setSaving(false);
    }
  }

  return (
    <Sheet
      title="Novo produto"
      closing={closing}
      onClose={onClose}
      onConfirm={confirm}
      ctaLabel={saving ? "salvando..." : "salvar produto"}
      ctaDisabled={!name.trim() || saving}
      photoLabel="Foto do produto"
      photoUrl={photo.previewUrl}
      onPhotoChange={photo.onPhotoChange}
    >
      <SheetField label="nome" value={name} onChange={setName} placeholder="Essência Calmante" />
      <SheetField label="marca" value={brand} onChange={setBrand} placeholder="Kori" />
      <SheetField label="aberto em" value={openedAt} onChange={setOpenedAt} type="date" />
      <SheetField label="validade após abrir (dias)" value={shelfLifeDays} onChange={setShelfLifeDays} type="number" />
      <SheetChips label="categoria" options={CATEGORY_OPTIONS} value={category} onChange={(v) => setCategory(v as Category)} />
    </Sheet>
  );
}

export function AddWishlistSheet({ closing, onClose }: { closing: boolean; onClose: () => void }) {
  const { addWishlistItem } = useStore();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [link, setLink] = useState("");
  const [priority, setPriority] = useState<WishlistPriority>("proxima");
  const [category, setCategory] = useState<Category>("hidratacao");
  const [saving, setSaving] = useState(false);
  const photo = usePhotoPicker();

  async function confirm() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const photoUrl = await photo.upload("wishlist");
      addWishlistItem({ name: name.trim(), brand: brand.trim(), category, price, link, priority, photoUrl });
      onClose();
    } catch (err) {
      console.error("[skincare] photo upload failed", err);
      setSaving(false);
    }
  }

  return (
    <Sheet
      title="Novo item na lista"
      closing={closing}
      onClose={onClose}
      onConfirm={confirm}
      ctaLabel={saving ? "salvando..." : "adicionar à lista"}
      ctaDisabled={!name.trim() || saving}
      photoLabel="Foto ou print do produto"
      photoUrl={photo.previewUrl}
      onPhotoChange={photo.onPhotoChange}
    >
      <SheetField label="nome" value={name} onChange={setName} placeholder="Essência Fermentada" />
      <SheetField label="marca" value={brand} onChange={setBrand} placeholder="Kori" />
      <SheetField label="preço estimado" value={price} onChange={setPrice} placeholder="R$ 129" />
      <SheetField label="link" value={link} onChange={setLink} placeholder="colar link do produto" />
      <SheetChips label="categoria" options={CATEGORY_OPTIONS} value={category} onChange={(v) => setCategory(v as Category)} />
      <SheetChips label="prioridade" options={PRIORITY_OPTIONS} value={priority} onChange={(v) => setPriority(v as WishlistPriority)} />
    </Sheet>
  );
}

export function BoughtSheet({
  wishlistId,
  closing,
  onClose,
}: {
  wishlistId: string;
  closing: boolean;
  onClose: () => void;
}) {
  const { data, markPurchased } = useStore();
  const item = data.wishlist.find((w) => w.id === wishlistId);
  const [openedAt, setOpenedAt] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  function confirm() {
    if (saving) return;
    setSaving(true);
    markPurchased(wishlistId, openedAt);
    onClose();
  }

  if (!item) return null;

  return (
    <Sheet
      title="Comprei"
      closing={closing}
      onClose={onClose}
      onConfirm={confirm}
      ctaLabel={saving ? "salvando..." : "cadastrar como ativo"}
      ctaDisabled={saving}
      photoLabel="Foto do produto"
      photoUrl={item.photoUrl}
    >
      <SheetField label="nome" value={item.name} onChange={() => {}} />
      <SheetField label="marca" value={item.brand} onChange={() => {}} />
      <SheetField label="aberto em" value={openedAt} onChange={setOpenedAt} type="date" />
      <SheetField label="estoque inicial" value="100%" onChange={() => {}} />
    </Sheet>
  );
}

export function NewLogSheet({ closing, onClose }: { closing: boolean; onClose: () => void }) {
  const { addSkinLog } = useStore();
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const photo = usePhotoPicker();

  function toggleTag(tag: string) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  async function confirm() {
    if (saving) return;
    setSaving(true);
    try {
      const photoUrl = await photo.upload("skin-log");
      addSkinLog({ date, note, tags, photoUrl });
      onClose();
    } catch (err) {
      console.error("[skincare] photo upload failed", err);
      setSaving(false);
    }
  }

  return (
    <Sheet
      title="Novo registro"
      closing={closing}
      onClose={onClose}
      onConfirm={confirm}
      ctaLabel={saving ? "salvando..." : "salvar registro"}
      ctaDisabled={saving}
      photoLabel="Foto da pele"
      photoUrl={photo.previewUrl}
      onPhotoChange={photo.onPhotoChange}
    >
      <SheetField label="data" value={date} onChange={setDate} type="date" />
      <SheetField label="nota" value={note} onChange={setNote} placeholder="como a pele está hoje" />
      <SheetMultiChips label="tags" options={TAG_OPTIONS} value={tags} onToggle={toggleTag} />
    </Sheet>
  );
}

export function NewRoutineSheet({
  closing,
  onClose,
  onCreated,
}: {
  closing: boolean;
  onClose: () => void;
  onCreated: (routineId: string) => void;
}) {
  const { createRoutine } = useStore();
  const [name, setName] = useState("");
  const [windowLabel, setWindowLabel] = useState("");

  function confirm() {
    if (!name.trim()) return;
    const id = createRoutine({ name: name.trim(), window: windowLabel.trim() || "todos os dias" });
    onCreated(id);
  }

  return (
    <Sheet
      title="Nova rotina"
      closing={closing}
      onClose={onClose}
      onConfirm={confirm}
      ctaLabel="criar rotina"
      ctaDisabled={!name.trim()}
    >
      <SheetField label="nome" value={name} onChange={setName} placeholder="Cuidado noturno" />
      <SheetField label="turno / rótulo" value={windowLabel} onChange={setWindowLabel} placeholder="manhã, noite, semanal..." />
    </Sheet>
  );
}
