import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Base de dados SQLite local usada em modo demo (sem credenciais Supabase).
// Ficheiro persistido em /data para que o estado sobreviva a reinícios do
// servidor Next.js durante a sessão de desenvolvimento/demonstração.

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "demo.sqlite3");

declare global {
  var __vaija_demo_db__: Database.Database | undefined;
}

function initDb(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schemaPath = path.join(process.cwd(), "lib", "db", "demo", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  return db;
}

export function getDemoDb(): Database.Database {
  if (!global.__vaija_demo_db__) {
    global.__vaija_demo_db__ = initDb();
  }
  return global.__vaija_demo_db__;
}

export function resetDemoDb(): void {
  if (global.__vaija_demo_db__) {
    global.__vaija_demo_db__.close();
    global.__vaija_demo_db__ = undefined;
  }
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  if (fs.existsSync(DB_PATH + "-wal")) fs.unlinkSync(DB_PATH + "-wal");
  if (fs.existsSync(DB_PATH + "-shm")) fs.unlinkSync(DB_PATH + "-shm");
}
