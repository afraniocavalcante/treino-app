import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
const email = process.argv[2];
const password = process.argv[3];

if (!url || !serviceKey || !email || !password) {
  console.error("Usage: node create-user.mjs <email> <password> (requires SUPABASE_URL, SUPABASE_SECRET_KEY env vars)");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error("Error creating user:", error.message);
  process.exit(1);
}

console.log("User created:", data.user.id, data.user.email);
