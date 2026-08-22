import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(path.join(__dirname, "schema-v2.sql"), "utf8");

const rawConnectionString = process.env.POSTGRES_URL_NON_POOLING;
const url = new URL(rawConnectionString);
url.searchParams.delete("sslmode");
const connectionString = url.toString();

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log("Schema v2 applied successfully.");
} finally {
  await client.end();
}
