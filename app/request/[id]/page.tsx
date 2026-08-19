import { redirect } from "next/navigation";

// Decisão de arquitetura (docs/TODO.md): /request/[id] e /orders/[id]
// mostrariam essencialmente o mesmo ecrã (procura de motorista -> tracking
// -> conclusão). Para não duplicar a implementação, /request/[id]
// redireciona para o ecrã de detalhe/tracking definitivo em /orders/[id],
// mantendo a rota da secção 22 da especificação.
export default async function RequestStatusRedirect(props: PageProps<"/request/[id]">) {
  const { id } = await props.params;
  redirect(`/orders/${id}`);
}
