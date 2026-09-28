import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const BUCKET = "skincare-photos";

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/")[1] || "jpg";
}

export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}.${extFromFile(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
