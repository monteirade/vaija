# Deploy — Vai Já (Fase 8)

Alvo definido na especificação (secção 2 e 3): **Vercel**, domínio inicial
**vaija.pintopinto.pt** (domínio futuro: vaija.pt). Este documento cobre o
que falta preparar antes desse deploy e, sobretudo, **um bloqueador real
que tem de ser resolvido primeiro** — não é só configuração.

## Leitura obrigatória antes de fazer deploy: o modo demo não funciona no Vercel

O protótipo foi construído em "modo demo" (`lib/db/demo`, SQLite local em
`data/demo.sqlite3` + ficheiros em `data/uploads/`) porque não havia
credenciais Supabase disponíveis neste ambiente de build — ver
`docs/TODO.md`. Isto foi sempre pensado como algo a trocar por Supabase
real antes de um deploy público, e há uma razão técnica concreta para
isso, não só de "qualidade":

**O sistema de ficheiros do Vercel (funções serverless) é efémero e só
`/tmp` é gravável — e mesmo `/tmp` não é partilhado entre invocações nem
entre instâncias.** Isto significa que, em produção no Vercel:

- Cada escrita no SQLite local (`data/demo.sqlite3`) pode desaparecer a
  qualquer momento, e diferentes pedidos HTTP podem nem sequer ver as
  mesmas escritas (várias instâncias da função a correr em paralelo).
- Os ficheiros de fotos guardados localmente (`lib/uploads.ts`,
  `data/uploads/<userId>/...`) têm exatamente o mesmo problema.

**Ou seja: mesmo que o build passe e o site "pareça" funcionar no primeiro
pedido, os dados não sobrevivem de forma fiável entre pedidos no Vercel.**
Isto não é um TBD estético — é o principal bloqueador antes de qualquer
deploy público a sério.

### O que falta para o caminho recomendado (Supabase real + Vercel)

A app já foi construída com isto em mente (`lib/db` tem os dois
adaptadores, ver `docs/ARCHITECTURE.md`), mas **não está tudo pronto**:

1. **Autenticação ainda não está ligada ao Supabase Auth.**
   `lib/auth/index.ts` — `signIn` e `signUp` verificam `isDemoMode()` e,
   se for `false` (ou seja, assim que `NEXT_PUBLIC_SUPABASE_URL` e
   `SUPABASE_SERVICE_ROLE_KEY` estiverem definidos), **lançam
   `AuthError` e o login/registo deixam de funcionar**. Isto está
   documentado no próprio ficheiro, mas repete-se aqui porque é o maior
   risco de "configurar Supabase e o site partir-se". Antes de apontar
   para um projeto Supabase real, alguém tem de portar `signIn`/`signUp`/
   `signOut`/`getCurrentUser` para `supabase.auth.*` (ver comentário no
   topo de `lib/auth/index.ts` para o desenho já previsto).
2. **`SupabaseRepository` (`lib/db/supabase/store.ts`) nunca foi testado
   contra um projeto Supabase real** — foi implementado espelhando
   `DemoRepository` mecanicamente, mas sem credenciais para correr os
   testes Playwright contra ele. Deve ser validado de ponta a ponta antes
   do deploy (os mesmos scripts em `scripts/smoke-test-*.mjs` servem para
   isso, apontando `BASE` para o ambiente de staging).
3. **Fotos têm de passar para Supabase Storage.** `lib/uploads.ts` só
   sabe escrever em disco local. Já está isolado num único ficheiro (fácil
   de trocar), mas a troca ainda não foi feita.
4. **`npm run seed` só semeia o SQLite local.** Não escreve num projeto
   Supabase real. Se quiser dados de demonstração no ambiente de staging/
   produção Supabase, é preciso um script equivalente que use
   `SupabaseRepository` (ou o SQL editor do Supabase diretamente).

### Alternativa mais rápida (não é o alvo da spec, mas é uma opção real)

Se o objetivo imediato for só mostrar o protótipo publicamente sem esperar
pelos passos acima, o modo demo funciona perfeitamente num anfitrião com
disco persistente e um único processo Node de longa duração (ex.: uma
VPS, um contentor Docker em Fly.io/Railway/Render). Não funciona no
Vercel por serverless. Isto é um desvio do alvo definido na spec
(Vercel), por isso só faz sentido como solução temporária/demo, não como
plano de lançamento.

## Checklist de variáveis de ambiente (Vercel → Project Settings → Environment Variables)

Nunca commitar valores reais — `.env.example` documenta as chaves, não os
valores. Nenhum ficheiro `.env*` (exceto `.env.example`) deve ir para o
git; confirmar isso com `git check-ignore -v .env.local` antes do primeiro
push com credenciais locais.

| Variável | Obrigatória para produção? | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim, para sair do modo demo | Do projeto Supabase (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim, para sair do modo demo | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim, para sair do modo demo | **Secreta** — só em variáveis de servidor, nunca `NEXT_PUBLIC_*` |
| `AUTH_SECRET` | **Sim, sempre** | Aleatório (ex.: `openssl rand -base64 32`). Desde a Fase 8, a app recusa-se a arrancar em produção sem isto definido corretamente — ver `lib/auth/session.ts` |

Depois de aplicar `supabase/migrations/0001_init.sql` (SQL editor do
Supabase ou `supabase db push`) e resolver os três pontos da secção
anterior, o resto do deploy é o fluxo padrão do Vercel para Next.js — não
há configuração especial em `next.config.ts` além do que já existe.

## Domínio

`vaija.pintopinto.pt` (inicial, secção 2 da especificação) → adicionar
como domínio personalizado no projeto Vercel e apontar o DNS conforme as
instruções que o próprio Vercel apresenta no momento de adicionar o
domínio (variam consoante o registador do domínio). `vaija.pt` é o
domínio futuro mencionado na spec — sem ação necessária agora.

## Depois do primeiro deploy com rede real

Duas coisas foram documentadas como "não validável neste ambiente de
build por falta de rede" (`docs/TODO.md`) e devem ser confirmadas assim
que a app estiver num ambiente com internet:

- Carregamento real dos tiles do OpenStreetMap no mapa Leaflet.
- Qualidade do geocoding — considerar substituir o gazetteer local
  (`lib/maps/gazetteer.ts`) por Nominatim/Mapbox real (troca isolada a
  `lib/maps/index.ts`).

## Checklist final antes de anunciar o lançamento

- [ ] Projeto Supabase criado, migração aplicada, `SupabaseRepository`
      testado de ponta a ponta.
- [ ] `lib/auth/index.ts` portado para `supabase.auth.*`.
- [ ] Upload de fotos portado para Supabase Storage.
- [ ] Variáveis de ambiente configuradas no Vercel (tabela acima).
- [ ] Domínio `vaija.pintopinto.pt` associado e DNS propagado.
- [ ] Tiles do mapa e geocoding validados com rede real.
- [ ] Rever `docs/TODO.md`, secção "Pendente / TBD" — decisões comerciais
      (preços, comissão, seguros, área operacional) continuam em aberto e
      não bloqueiam o deploy técnico, mas devem ser resolvidas antes de
      operar com clientes reais.
