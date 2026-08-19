# Cenário de demonstração — Vai Já

## Preparar

```bash
npm install
npm run seed     # cria contas fixas + dados de exemplo em modo demo
npm run dev
```

Abrir http://localhost:3000.

## Contas de demonstração

Estas credenciais são apenas para o ambiente demo local (SQLite) — **não
são credenciais de produção**.

| Papel              | Email                   | Password         |
|---------------------|-------------------------|-------------------|
| Admin               | admin@vaija.pt          | admin1234         |
| Cliente demo         | cliente@vaija.pt        | cliente1234       |
| Motorista demo (principal) | passos@vaija.pt   | motorista1234     |
| Motorista demo (secundário) | motorista2@vaija.pt | motorista1234 |

O motorista principal de demonstração é **Passos Dias Aguiar** (secção 24
da especificação), já aprovado e com uma van associada.

`npm run seed` é idempotente para as contas fixas (não duplica) mas
recria sempre os 4 pedidos de exemplo, a candidatura pendente e o pedido
de mudança, para a demo partir sempre de um estado limpo e previsível.

## Cenário principal (secção 25 da especificação)

**Browser 1 — Cliente** (`cliente@vaija.pt`)
1. Login.
2. Pedir transporte.
3. Transporte de materiais.
4. Agora.
5. Braga → Guimarães.
6. 300 kg.
7. Van.
8. Sem ajuda.
9. Passageiro: não.
10. Ver distância/preço.
11. MB WAY (demo).
12. Confirmar.

**Browser 2 — Motorista** (`passos@vaija.pt`)
13. Login como Passos Dias Aguiar.
14. Ver o novo pedido em "Pedidos disponíveis".
15. Aceitar.
16. Permitir localização (pede autorização do browser).
17. Avançar: "A caminho".
18. "Cheguei".
19. "Carga recolhida" / "Confirmar carga carregada".
20. "Iniciar transporte".
21. "Entregue".

**Browser 1 — de volta ao cliente**
22. Ver atualizações em tempo real (o ecrã atualiza sozinho a cada poucos segundos).
23. Ver a localização do motorista no mapa.
24. Ver "Entregue".

## Demonstração 2 — pedido de mudança

25. Em `/change/new`, criar um pedido de mudança.
26. Indicar vários ajudantes.
27. Adicionar fotografias.
28. Submeter — a app mostra "Pedido recebido. A equipa Vai Já irá analisar o pedido."
29. Login como admin (`admin@vaija.pt`) e abrir `/admin/changes`.
30. Abrir o pedido, mostrar a gestão manual (mudar estado para "Contactado", "Orçamentado", etc.).

## Estado inicial após o seed

- 1 pedido `SEARCHING_DRIVER` (Porto → Braga, sem motorista) — útil para
  demonstrar a atribuição manual no admin ou a aceitação pelo motorista.
- 1 pedido `IN_TRANSIT` atribuído a Passos Dias Aguiar, já com uma
  localização registada — útil para mostrar o mapa com o marcador do
  motorista sem ter de andar a mexer no telemóvel/GPS ao vivo.
- 1 pedido `DELIVERED` (histórico).
- 1 pedido `CANCELLED`.
- 1 candidatura de motorista pendente (Rui Almeida Santos) — para
  demonstrar a aprovação no admin.
- 1 pedido de mudança `pending_review`.
