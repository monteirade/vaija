# Vai Já — Protótipo

Plataforma web de transporte imediato e agendado (Norte de Portugal, até
Aveiro). Ver `VAIA_Master_Build_Specification_Claude_Code.docx` (documento
original) para a especificação completa. Este README acompanha o build
incremental por fases.

**Estado atual: Fases 0–8 concluídas** (fundação, fluxo do cliente,
motorista, admin, tempo real/GPS, dados de demonstração, QA, preparação
de deploy). **Antes de publicar em produção no Vercel, ler
`docs/DEPLOY.md` — há um bloqueador real (não só configuração) que tem de
ser resolvido primeiro.** Ver `docs/TODO.md` para o registo completo de
decisões e TBDs.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS v4 + componentes UI
próprios no estilo shadcn + Leaflet/OpenStreetMap para mapas. Camada de
dados abstrata (`lib/db`) com dois adaptadores intercambiáveis:

- **Demo (ativo por omissão)** — SQLite local em `data/demo.sqlite3`, sem
  qualquer credencial externa. É o modo usado enquanto não houver um
  projeto Supabase real.
- **Supabase (produção)** — Postgres + RLS, ativado automaticamente quando
  `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão definidos
  em `.env.local`. Schema e políticas RLS em
  `supabase/migrations/0001_init.sql`.

## Correr localmente

```bash
npm install
npm run seed   # opcional mas recomendado: cria contas e pedidos de demonstração
npm run dev
```

Abrir http://localhost:3000. Sem `.env.local`, a app arranca automaticamente
em modo demo (a base de dados SQLite é criada no primeiro pedido que a
usa). Sem correr `npm run seed`, a app funciona igualmente — basta criar
uma conta em `/register` — mas não há dados de exemplo nem conta admin.

Para ligar a um projeto Supabase real: copiar `.env.example` para
`.env.local`, preencher as variáveis Supabase, e aplicar
`supabase/migrations/0001_init.sql` no projeto (SQL editor ou `supabase db
push`).

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npx tsc --noEmit` — verificação de tipos
- `npm run seed` — popula a base de dados demo com contas e pedidos de exemplo (idempotente para as contas fixas)
- `npm run test` — testes unitários (Vitest): pricing, máquina de estados, autorização, mapas/distância
- `node scripts/bootstrap-admin.mjs <email> <password>` — cria/atualiza apenas uma conta admin (atalho sem os restantes dados de exemplo)

## Contas de demonstração

**Não são credenciais de produção** — válidas apenas no ambiente demo local.

| Papel | Email | Password |
|---|---|---|
| Admin | admin@vaija.pt | admin1234 |
| Cliente demo | cliente@vaija.pt | cliente1234 |
| Motorista demo (Passos Dias Aguiar) | passos@vaija.pt | motorista1234 |
| Motorista demo 2 | motorista2@vaija.pt | motorista1234 |

Criadas por `npm run seed`. Ver `docs/DEMO.md` para o guião completo do
cenário de demonstração (secção 25 da especificação).

## Estrutura

Ver `docs/ARCHITECTURE.md` para detalhes da arquitetura, `docs/TODO.md`
para o registo de decisões TBD e progresso por fase, e `docs/DEPLOY.md`
antes de publicar no Vercel.
