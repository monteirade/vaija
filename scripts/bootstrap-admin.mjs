// Script de apoio a testes (Fase 3): cria uma conta admin diretamente na
// base de dados demo, para permitir testar a aprovação de candidaturas de
// motorista antes de o dashboard admin (Fase 4) existir. Não faz parte da
// aplicação — é só uma ferramenta de desenvolvimento.
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "demo.sqlite3");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(process.cwd(), "lib", "db", "demo", "schema.sql"), "utf-8"));

const email = process.argv[2] || "admin@vaija.pt";
const password = process.argv[3] || "admin1234";

const existing = db.prepare("select id from profiles where email = ?").get(email);
if (existing) {
  db.prepare("update profiles set role = 'admin' where id = ?").run(existing.id);
  console.log("Admin já existia, role garantida:", email);
} else {
  const id = randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  db.prepare(
    `insert into profiles (id, role, full_name, email, phone, password_hash, created_at, updated_at)
     values (?, 'admin', 'Admin Vai Já', ?, null, ?, ?, ?)`
  ).run(id, email, hash, now, now);
  console.log("Admin criado:", email, password);
}
db.close();
