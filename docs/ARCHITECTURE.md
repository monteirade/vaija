# Arquitetura — Vai Já

## Princípio central

Nenhuma página ou rota fala diretamente com SQLite ou com o cliente
Supabase. Tudo passa pela interface `DataRepository`
(`lib/db/repository.ts`), obtida via `getRepository()`
(`lib/db/index.ts`), que escolhe em runtime entre:

- `DemoRepository` (`lib/db/demo/store.ts`) — SQLite local, sem credenciais.
- `SupabaseRepository` (`lib/db/supabase/store.ts`) — Postgres real via
  `@supabase/supabase-js`, usado quando `NEXT_PUBLIC_SUPABASE_URL` e
  `SUPABASE_SERVICE_ROLE_KEY` existem.

Isto cumpre o requisito da especificação (secção 32): "a arquitetura deve
permitir substituir progressivamente os mocks e integrações demo por
serviços reais sem reescrever o núcleo da aplicação". Trocar de modo é uma
questão de configurar variáveis de ambiente — nenhum código de página muda.

## Autenticação

Também abstraída, mas de forma mais simples do que a base de dados: `lib/auth`
expõe `signIn`, `signUp`, `signOut`, `getCurrentUser`, `requireUser`,
`requireRole`. Em modo demo, a password (bcrypt hash) vive na mesma linha
de `profiles` no SQLite — uma simplificação deliberada só válida em demo.
Em modo Supabase, estas funções devem passar a delegar em
`supabase.auth.*` (ainda não implementado — ver `docs/TODO.md`), pelo que
o contrato (`getCurrentUser()` devolve `{ profile }` ou `null`) já está
preparado para essa troca.

A sessão em modo demo é um cookie httpOnly assinado (JWT via `jose`),
gerido em `lib/auth/session.ts`.

## Pricing

Fonte única: `lib/pricing/config.ts` (valores) + `lib/pricing/calculate.ts`
(fórmula). Nunca duplicar constantes de preço noutro ficheiro — importar
sempre daqui.

## Máquina de estados dos pedidos

`lib/orders/state-machine.ts` é a única definição de transições válidas
entre estados. `DemoRepository.updateOrderStatus` e
`SupabaseRepository.updateOrderStatus` validam a transição através de
`assertValidTransition` antes de escrever, e ambos criam uma entrada em
`order_status_history` a cada mudança.

## Autorização

Em modo Supabase, a linha de defesa principal é a RLS definida em
`supabase/migrations/0001_init.sql` (secção 6 da especificação: "não
confiar em role enviada pelo cliente/frontend"). Em modo demo (sem
Postgres/RLS), a autorização é validada na camada de aplicação através de
`requireUser`/`requireRole` em cada server action/rota — ver
`docs/TODO.md` para a decisão de manter isto assim durante o protótipo.

## Estrutura de pastas

Ver secção 26 da especificação (replicada em `app/`, `components/`,
`lib/`, `types/`, `supabase/`).
