import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(path.join(__dirname, "schema.sql"), "utf8");

const rawConnectionString = process.env.POSTGRES_URL_NON_POOLING;
if (!rawConnectionString) {
  console.error("POSTGRES_URL_NON_POOLING not set");
  process.exit(1);
}

const url = new URL(rawConnectionString);
url.searchParams.delete("sslmode");
const connectionString = url.toString();

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query(sql);
  console.log("Schema applied successfully.");
} finally {
  await client.end();
}
