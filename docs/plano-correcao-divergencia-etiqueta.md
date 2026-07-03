# Plano de correção — divergência entre caixa embalada e etiqueta

## Contexto

Incidente de referência: **OP 79692** (id interno `447760`), em 01/07.
Uma caixa foi embalada com **33 peças**, mas a **etiqueta saiu com 29**. A caixa
teve que ser deletada, estornada e re-embalada manualmente.

> A correção pontual dessa OP já foi feita. Este documento define as correções
> estruturais para **evitar que a situação se repita** em OPs futuras.

## Causa raiz (resumo do diagnóstico)

- A quantidade impressa na etiqueta **não vem da caixa persistida no banco**;
  ela é recalculada no front-end no momento da impressão (`printTag`), somando os
  blisters com `status == 1` do estado do React.
- Na **finalização com quebra**, o array de blisters é **truncado** e a quantidade
  do último blister é a que o gerente digita ("Quantidade do último blister").
  Resultado: a etiqueta reflete o que o **sistema validou até o momento da quebra**,
  não o que foi fisicamente colocado na caixa.


### Problemas secundários confirmados no banco

- **Códigos de caixa duplicados**: `recalculateBoxesFromOpAndItemQuantity` usa
  `boxGap: op.OpBox.length`; após deletar caixas manualmente, o contador diminui e
  gera `code` repetido (foram encontradas 3 caixas com `code` 24 na OP 79692).
- **Estorno não reconciliado com o JERP**: deletar a `OpBox` no banco não reverte o
  apontamento no JERP. Após o incidente, o JERP indicava 5 peças restantes enquanto
  o banco interno indicava 29 — desalinhamento causado pelo estorno manual.
- **Fonte de verdade dupla**: o banco conta por `packedAt`, a etiqueta conta por
  `status == 1` (estado volátil do front-end).

## Princípio central: o JERP é a fonte única de verdade

Todas as informações do sistema (quantidade a produzir, quantidade restante,
apontamentos/etiquetas e estornos) **devem estar sempre de acordo com o que é
fornecido pelo JERP**. O banco local é um espelho operacional; sempre que houver
divergência, **o JERP prevalece** e o banco deve ser reconciliado a partir dele.

Consequências práticas deste princípio:

- A **quantidade restante** de uma OP deve ser derivada de `quantidadeAProduzir` do
  JERP (`GET /ordemproducao/{code}`), e não calculada apenas localmente
  (`quantityToProduce` interno − soma local). Hoje esse cálculo é local e diverge
  (na OP 79692, JERP indicava 5 restantes e o interno 29).
- Todo **apontamento de etiqueta** e todo **estorno** só são considerados concluídos
  após o JERP confirmar, e o estado interno deve ser **re-sincronizado a partir do
  JERP** logo em seguida.
- Antes de gerar etiqueta / recriar caixas pendentes, o sistema deve **revalidar
  contra o JERP** (quantidade restante, embalagens/blister, produto).

## Objetivo

Garantir que **a etiqueta e o banco sempre reflitam exatamente as peças embaladas na
caixa** e que **todos os números fiquem sempre alinhados com o JERP**, com operações
de quebra/estorno seguras, auditáveis e reconciliadas com o JERP.

## Escopo por repositório

| Repositório | Papel no fluxo | Correções deste plano |
|---|---|---|
| **`gde-insp-embalagem`** | Aplicação operacional: UI, banco (Prisma/PostgreSQL), integração JERP, persistência de caixas, geração de etiqueta, quebra/estorno, auditoria | **Principal** — itens 1 a 5, 7 e 8 |
| **`gde_back`** | Worker Python: captura de vídeo (RealWear), detecção YOLO (caixa/blister/peça), leitura de QR e envio de resultados via RabbitMQ/WebSocket | **Complementar** — apenas item 6 (robustez de QR na detecção) |

### Por que a maior parte é só no `gde-insp-embalagem`

O incidente da OP 79692 ocorreu **depois** da detecção, na camada de negócio:

- cálculo da quantidade da etiqueta no front-end (`printTag`);
- truncamento de blisters na quebra;
- apontamento/estorno no JERP;
- recálculo local de pendente e numeração de caixas.

O `gde_back` **não persiste caixas**, **não chama o JERP** e **não gera etiquetas**. Ele só informa ao front-end quantas peças foram detectadas e se o QR do blister é válido.

### O que pode mudar no `gde_back` (opcional, item 6)

Melhorias pontuais no worker, se necessário para reduzir falsos negativos de QR e evitar que o operador recorra à quebra:

- retry ou estabilização da leitura de QR antes de enviar `INVALID`;
- log mais detalhado das rejeições (`QR_INVALID_FORMAT`, `QR_OP_MISMATCH`) com código lido;
- alinhar mensagens/reasons com o front-end (`core_back.py`, `blister_qr.py`).

Essas mudanças **não substituem** as correções do `gde-insp-embalagem`; são apenas suporte à detecção.

## Ações de correção

### 1. Etiqueta autoritativa a partir do banco e conferida com o JERP (prioridade alta)

- **O quê:** a quantidade apontada na etiqueta deve ser calculada no servidor,
  somando `OpBoxBlister.quantity` com `packedAt != null` da própria caixa
  (`boxId`). A quantidade enviada pelo cliente passa a ser ignorada (ou apenas
  validada/logada como conferência). Antes de apontar, **validar contra o JERP** que
  a quantidade não excede `quantidadeAProduzir` restante; após o apontamento, usar o
  `quantidadeApontada` retornado pelo JERP como valor oficial da etiqueta.
- **Onde:**
  - `src/app/api/op-jerp/barcode/route.ts` — buscar a caixa e somar do banco antes de
    chamar `generateBarcode`; conferir com o JERP.
  - `src/shared/services/jerp/index.ts` (`generateBarcode`) — tratar o retorno do
    JERP como fonte de verdade da quantidade e do `idBarras`.
  - `src/app/op/[opId]/page.tsx` (`printTag`) — só disparar a impressão após a
    persistência; não recalcular a quantidade no cliente.
- **Resultado esperado:** a etiqueta nunca diverge do que está persistido nem do que
  o JERP registrou.

### 2. Conferência do total da caixa na quebra (prioridade alta)

- **O quê:** no fluxo de quebra, exibir e **confirmar o TOTAL da caixa** (soma de
  todos os blisters embalados), não apenas a quantidade do último blister. Bloquear
  a finalização se o total do sistema for menor que o esperado sem confirmação
  explícita do responsável.
- **Onde:**
  - `src/features/manager-auth-form-dialog/ui/index.tsx` — mostrar total consolidado.
  - `src/app/op/[opId]/page.tsx` (`configLastBlisterQuantity`, `handleOpBoxBreak`).
- **Resultado esperado:** o operador não fecha a caixa a menos por engano.

### 3. Quantidade restante e caixas pendentes derivadas do JERP (prioridade alta)

- **O quê:** ao recriar as caixas pendentes, a **quantidade restante deve vir do JERP**
  (`quantidadeAProduzir`) e não do cálculo local (`quantityToProduce` interno − soma
  local). Sincronizar o interno com o JERP antes de recriar as pendentes.
- **Onde:** `src/app/op/[opId]/actions.tsx`
  (`recalculateBoxesFromOpAndItemQuantity`, `persistWithOpBreak`) +
  `src/shared/services/jerp/index.ts` (`getOpFromRef`/`getOpFromId`).
- **Resultado esperado:** o pendente interno é sempre igual ao restante do JERP.

### 4. Numeração de caixas sem duplicidade (prioridade média)

- **O quê:** substituir `boxGap: op.OpBox.length` por `max(code)` atual da OP
  (ou uma sequência dedicada) para nunca repetir `code` após deleções.
- **Onde:** `src/app/op/[opId]/actions.tsx`
  (`recalculateBoxesFromOpAndItemQuantity`).
- **Resultado esperado:** cada caixa da OP tem `code` único, mesmo após estorno.

### 5. Estorno reconciliado com o JERP (prioridade alta)

- **O quê:** criar um fluxo oficial de estorno de caixa que **reverta o apontamento
  no JERP** ao deletar/estornar uma `OpBox` e, em seguida, **re-sincronize o estado
  interno a partir do JERP**, mantendo `quantidadeAProduzir` do JERP e o pendente
  interno sempre alinhados. Evitar deleção manual direta no banco (que quebra a
  sincronia com o JERP, como ocorreu na OP 79692).
- **Onde:** nova ação/rota de estorno + `src/shared/services/jerp/index.ts`.
- **Resultado esperado:** banco local e JERP sempre consistentes após estorno.

### 6. Robustez da validação de QR (prioridade média)

- **O quê:** tratar rejeições de QR sem forçar o operador à quebra: retry claro,
  override do supervisor e **log das rejeições** (com código lido e motivo).
- **Onde:**
  - **`gde-insp-embalagem` (principal):** `src/app/op/[opId]/page.tsx`
    (`blisterInspection`, `handleDetectionUpdate`),
    `src/shared/services/blister-qr-code/index.ts`.
  - **`gde_back` (complementar, opcional):** `core_back.py` (retry/estabilização
    da leitura QR antes de `INVALID`), `blister_qr.py` (logs alinhados).
- **Resultado esperado:** blisters legítimos não são bloqueados; a quebra deixa de
  ser usada como "escape" para leituras ruins.

### 7. Trilha de auditoria e alertas (prioridade baixa)

- **O quê:** registrar em `OpActivityLog` toda geração/estorno de etiqueta com a
  quantidade e o `barCode`, e alertar quando a quantidade apontada divergir do
  esperado para a caixa (quebra), for menor que a caixa cheia sem autorização, ou
  quando o **pendente interno divergir do restante informado pelo JERP**.
- **Resultado esperado:** rastreabilidade completa e detecção precoce de divergências.

### 8. Reconciliação periódica com o JERP (prioridade média)

- **O quê:** rotina que compara periodicamente o estado interno de cada OP aberta com
  o JERP (restante, apontamentos) e sinaliza/alinha divergências automaticamente,
  antes que virem erro de produção.
- **Onde:** job/rotina de sincronização + `src/shared/services/jerp/index.ts`.
- **Resultado esperado:** divergências JERP × banco são detectadas e corrigidas cedo.

## Verificação / critérios de aceite

- Reproduzir uma finalização com quebra e confirmar que a **etiqueta = soma
  persistida** da caixa **= quantidade registrada no JERP**.
- Confirmar que o **pendente interno é sempre igual ao restante do JERP**
  (`quantidadeAProduzir`).
- Confirmar que uma nova caixa criada após deleção recebe `code` único.
- Após um estorno, conferir que **JERP e banco interno ficam alinhados**.
- Confirmar que um blister com QR inválido pode ser tratado sem recorrer à quebra.

## Prioridade sugerida de implementação

1. Etiqueta autoritativa a partir do banco e conferida com o JERP (item 1).
2. Conferência do total da caixa na quebra (item 2).
3. Quantidade restante e caixas pendentes derivadas do JERP (item 3).
4. Estorno reconciliado com o JERP (item 5).
5. Numeração de caixas sem duplicidade (item 4).
6. Robustez da validação de QR (item 6).
7. Reconciliação periódica com o JERP (item 8).
8. Auditoria e alertas (item 7).
