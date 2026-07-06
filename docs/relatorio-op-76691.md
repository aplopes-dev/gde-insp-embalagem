# Relatório de investigação — OP 76691

**Documento gerado em:** 06/07/2026  
**Sistema:** GDE Inspeção de Embalagem  
**Fonte dos dados:** Banco PostgreSQL (`gdeembalagem`) + logs de auditoria (`OpActivityLog`)

---

## 1. Identificação da OP

| Campo | Valor |
|-------|-------|
| **Código OP (JERP)** | 76691 |
| **ID interno** | 430505 |
| **Status** | PENDING (em andamento) |
| **Criada em** | 03/07/2026, 20:40 (horário de Brasília) |
| **Finalizada em** | — |
| **Quantidade a produzir** | 1.080 peças |

---

## 2. Produto e embalagem

### Produto

| Campo | Valor |
|-------|-------|
| **Código** | TL-06-2-0007_02 |
| **ID interno** | 46252 |
| **Descrição** | Produto criado automaticamente do JERP |

### Blister

| Campo | Valor |
|-------|-------|
| **Nome** | BLISTER-TL-06-1-0007-TL-06-2-0007_00 |
| **ID interno** | 47087 |
| **Peças por blister** | 6 (`slots`) |
| **Blisters por caixa** | 8 (`limitPerBox`) |
| **Caixa cheia** | **48 peças** (6 × 8) |

### Caixa

| Campo | Valor |
|-------|-------|
| **Nome** | CAIXA 520X320X170 TRIPLEX |
| **ID interno** | 3457 |

---

## 3. Planejamento de produção

```
Total de peças:     1.080
Peças por blister:  6
Blisters totais:    ceil(1080 / 6) = 180
Blisters por caixa: 8
Caixas totais:      ceil(180 / 8) = 23

Caixas cheias:      22 × 48 = 1.056 peças
Última caixa:       4 blisters × 6 = 24 peças
Verificação:        1.056 + 24 = 1.080 ✓
```

A **caixa 23** foi criada pelo sistema com **apenas 4 blisters** desde o início da OP — não é uma caixa de 8 blisters finalizada antes da hora.

---

## 4. Situação atual (resumo)

| Indicador | Valor |
|-----------|-------|
| Caixas planejadas | 23 |
| Caixas embaladas | 8 |
| Caixas pendentes | 15 |
| Caixas com etiqueta | 8 |
| Peças embaladas | 360 (33,3%) |
| Peças restantes | 720 (66,7%) |
| Caixas com quebra | 0 |
| Divergências cliente × banco | 0 |

---

## 5. Caixas embaladas (detalhamento)

### 5.1 Visão geral

| Caixa | Blisters | Peças | Status | Etiqueta | Operador | Data embalagem |
|-------|----------|-------|--------|----------|----------|----------------|
| 1 | 8 | 48 | PACKAGED | 1823621 | Ramon | 06/07/2026 02:36 |
| 2 | 8 | 48 | PACKAGED | 1823622 | Ramon | 06/07/2026 02:41 |
| 3 | 8 | 48 | PACKAGED | 1823623 | Ramon | 06/07/2026 02:45 |
| 4 | 8 | 48 | PACKAGED | 1823624 | Ramon | 06/07/2026 02:49 |
| 5 | 8 | 48 | PACKAGED | 1823625 | Ramon | 06/07/2026 02:53 |
| 6 | 8 | 48 | PACKAGED | 1823626 | Ramon | 06/07/2026 02:57 |
| 22 | 8 | 48 | PACKAGED | 1823564 | Daniel Victor | 03/07/2026 20:43 |
| **23** | **4** | **24** | PACKAGED | **1823567** | Daniel Victor | 03/07/2026 20:47 |

> **Nota:** A embalagem não seguiu a ordem numérica das caixas. As caixas 22 e 23 foram embaladas em 03/07; as caixas 1 a 6 foram embaladas em 06/07. As caixas 7 a 21 permanecem pendentes.

### 5.2 Blisters por caixa embalada

#### Caixa 1 — 48 peças (etiqueta 1823621)

| Código blister | Peças | Conferido em |
|----------------|-------|--------------|
| 07669100068 | 6 | 06/07 02:33:24 |
| 07669100067 | 6 | 06/07 02:33:49 |
| 07669100066 | 6 | 06/07 02:34:17 |
| 07669100065 | 6 | 06/07 02:34:46 |
| 07669100064 | 6 | 06/07 02:35:03 |
| 07669100063 | 6 | 06/07 02:35:19 |
| 07669100062 | 6 | 06/07 02:35:44 |
| 07669100061 | 6 | 06/07 02:36:04 |

#### Caixa 2 — 48 peças (etiqueta 1823622)

| Código blister | Peças |
|----------------|-------|
| 07669100001 a 07669100008 | 6 cada |

#### Caixa 3 — 48 peças (etiqueta 1823623)

| Código blister | Peças |
|----------------|-------|
| 07669100029 a 07669100036 | 6 cada |

#### Caixa 4 — 48 peças (etiqueta 1823624)

| Código blister | Peças |
|----------------|-------|
| 07669100037 a 07669100044 | 6 cada |

#### Caixa 5 — 48 peças (etiqueta 1823625)

| Código blister | Peças |
|----------------|-------|
| 07669100093 a 07669100100 | 6 cada |

#### Caixa 6 — 48 peças (etiqueta 1823626)

| Código blister | Peças |
|----------------|-------|
| 07669100077 a 07669100084 | 6 cada |

#### Caixa 22 — 48 peças (etiqueta 1823564)

| Código blister | Peças | Conferido em |
|----------------|-------|--------------|
| 07669100076 | 6 | 03/07 20:41:42 |
| 07669100075 | 6 | 03/07 20:42:00 |
| 07669100074 | 6 | 03/07 20:42:20 |
| 07669100073 | 6 | 03/07 20:42:37 |
| 07669100072 | 6 | 03/07 20:42:53 |
| 07669100071 | 6 | 03/07 20:43:09 |
| 07669100070 | 6 | 03/07 20:43:28 |
| 07669100069 | 6 | 03/07 20:43:58 |

#### Caixa 23 — 24 peças (etiqueta 1823567) — última caixa da OP

| Código blister | Peças | Conferido em |
|----------------|-------|--------------|
| 07669100028 | 6 | 03/07 20:45:57 |
| 07669100027 | 6 | 03/07 20:46:24 |
| 07669100026 | 6 | 03/07 20:46:50 |
| 07669100025 | 6 | 03/07 20:47:11 |

---

## 6. Caixas pendentes

As caixas **7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 e 21** estão com status `PENDING`.

Cada uma possui 8 blisters planejados (`GEN_1` a `GEN_8`), com 6 peças cada (48 peças por caixa quando embaladas).

---

## 7. Linha do tempo

### 03/07/2026 — Daniel Victor

| Horário (BRT) | Evento |
|---------------|--------|
| 20:40 | OP criada no sistema |
| 20:41 – 20:43 | Conferência da caixa 22 (8 blisters) |
| 20:44 | Etiqueta **1823564** gerada — 48 peças |
| 20:45 – 20:47 | Conferência da caixa 23 (4 blisters) |
| 20:47 | Etiqueta **1823567** gerada — **24 peças** |

### 06/07/2026 — Ramon

| Horário (BRT) | Evento |
|---------------|--------|
| 02:33 – 02:36 | Conferência da caixa 1 → etiqueta **1823621** (48 peças) |
| 02:36 – 02:41 | Conferência da caixa 2 → etiqueta **1823622** (48 peças) |
| 02:43 – 02:45 | Conferência da caixa 3 → etiqueta **1823623** (48 peças) |
| 02:46 – 02:49 | Conferência da caixa 4 → etiqueta **1823624** (48 peças) |
| 02:51 – 02:53 | Conferência da caixa 5 → etiqueta **1823625** (48 peças) |
| 02:54 – 02:57 | Conferência da caixa 6 → etiqueta **1823626** (48 peças) |

---

## 8. Logs de auditoria (etiquetas)

Todas as etiquetas foram geradas via fluxo de inspeção (`/api/op-jerp/barcode`), com quantidade autoritativa do banco.

| Data (UTC) | Caixa | Peças | Código etiqueta | Operador | Restante JERP* |
|------------|-------|-------|-----------------|----------|----------------|
| 03/07 23:44 | 22 | 48 | 1823564 | danielvictor@gde.com.br | 1.080 |
| 03/07 23:47 | 23 | 24 | 1823567 | danielvictor@gde.com.br | 1.032 |
| 06/07 02:36 | 1 | 48 | 1823621 | ramon@gde.com.br | 1.008 |
| 06/07 02:41 | 2 | 48 | 1823622 | ramon@gde.com.br | 960 |
| 06/07 02:45 | 3 | 48 | 1823623 | ramon@gde.com.br | 912 |
| 06/07 02:49 | 4 | 48 | 1823624 | ramon@gde.com.br | 864 |
| 06/07 02:53 | 5 | 48 | 1823625 | ramon@gde.com.br | 816 |
| 06/07 02:57 | 6 | 48 | 1823626 | ramon@gde.com.br | 768 |

\* `jerpRemaining` registrado no momento da geração da etiqueta (campo `details` do log).

Em todos os registros: `clientQuantity` = `authoritativeQuantity` = `quantidadeApontada` — **sem divergência**.

---

## 9. Investigação — etiqueta com 24 peças

### Motivo do relato

Foi reportado que uma etiqueta com **24 peças** foi gerada antes de finalizar a conferência do restante dos blisters da OP.

### Análise

| Pergunta | Resposta |
|----------|----------|
| A etiqueta saiu antes de conferir os 4 blisters da caixa 23? | **Não.** Os 4 blisters foram conferidos em sequência (20:45–20:47) antes da etiqueta (20:47:18). |
| A caixa 23 deveria ter 48 peças? | **Não.** É a última caixa da OP; o sistema planejou 4 blisters (24 peças). |
| Houve quebra de caixa? | **Não.** Status `PACKAGED` (finalização normal). |
| Houve divergência entre tela e banco? | **Não.** |
| A OP estava completa quando a etiqueta saiu? | **Não.** Faltavam 15 caixas (720 peças), mas isso é independente da caixa 23. |

### Conclusão sobre a etiqueta de 24 peças

A etiqueta **1823567** com 24 peças está **correta** para a caixa 23:

- Configuração da peça: 6 peças/blister × 8 blisters = 48 por caixa cheia
- Total da OP (1.080) não é múltiplo de 48
- Sobra de 24 peças = 4 blisters na última caixa
- O sistema criou a caixa 23 com 4 blisters desde a abertura da OP

---

## 10. Observações operacionais

1. **Embalagem fora de ordem:** Caixas 22 e 23 embaladas antes das caixas 1 a 21. O sistema não impõe ordem sequencial — qualquer caixa pendente pode ser embalada.

2. **Progresso parcial:** Apenas 360 de 1.080 peças embaladas (33%). A OP permanece `PENDING`.

3. **Padrão esperado nas próximas caixas:** Caixas 7 a 21 terão etiquetas de **48 peças** cada. Apenas a caixa 23 (já concluída) tem 24 peças.

4. **Comparação com OPs similares (família TL-06):**

   | OP | Peça | Última caixa esperada | Observação |
   |----|------|----------------------|------------|
   | 76691 | TL-06-2-0007 | 24 peças (4 blisters) | Conforme planejado |
   | 76690 | TL-06-2-0007 | 40 peças (7 blisters) | Caixa 21 com 29 pcs via quebra |
   | 76672 | TL-06-1-0007 | 40 peças (7 blisters) | Caixa 21 com 29 pcs via quebra |

---

## 11. Recomendações

1. **Interface (RealWear):** Exibir na conferência: *"Caixa X de Y — Z blisters — W peças"* e, na última caixa: *"Última caixa da OP — quantidade parcial"*.

2. **Treinamento:** Esclarecer que a última caixa de OPs com quantidade não múltipla de 48 terá menos peças na etiqueta.

3. **Acompanhamento:** Concluir as 15 caixas pendentes (7 a 21) — 720 peças restantes.

4. **Ordem de embalagem:** Avaliar se faz sentido orientar embalagem sequencial para reduzir confusão operacional.

---

## 12. Referências técnicas

- Schema: `gde-insp-embalagem/prisma/schema.prisma`
- Criação de caixas/blisters: `src/usecases/op/create-op-data.ts`
- Geração de etiqueta: `src/app/api/op-jerp/barcode/route.ts`
- Plano de correção de divergências: `docs/plano-correcao-divergencia-etiqueta.md`

---

*Relatório produzido a partir de consulta direta ao banco de dados em 06/07/2026.*
