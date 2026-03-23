# Resumo da solução adotada

## Problema

Ao buscar uma OP nova no JERP, o sistema verificava se **qualquer embalagem do tipo blister** da OP já existia no banco local.

Isso gerava um falso positivo no caso em que:

- o produto principal ainda não tinha cadastro local;
- mas uma embalagem secundária, como a **tampa**, já estava cadastrada.

Nessa situação, o sistema deixava de abrir o modal de configuração do supervisor e reutilizava parâmetros incorretos do blister já existente.

## Causa raiz

A lógica antiga usava o primeiro blister encontrado entre os IDs retornados pelo JERP, sem distinguir qual blister realmente correspondia ao produto principal da OP.

## Solução aplicada

Foi criada uma lógica de seleção de embalagens para identificar o **blister principal da OP**.

Essa lógica:

- filtra as embalagens de blister e caixa;
- compara o nome do produto com o nome dos blisters disponíveis;
- atribui uma pontuação de similaridade;
- prioriza o blister com maior correspondência com o produto;
- penaliza termos como **tampa**, para evitar escolher blister secundário.

## Novo comportamento

- Se o **blister principal** já existir no banco, a OP pode seguir normalmente.
- Se o blister principal **não existir**, o sistema exige configuração do supervisor.
- O modal passa a receber a lista de blisters disponíveis e uma sugestão de blister já pré-selecionada.

## Arquivos alterados

- `src/usecases/op-jerp/select-op-packagings.ts`
- `src/app/op/[opId]/actions.tsx`
- `src/app/op/[opId]/page.tsx`
- `src/features/supervisor-piece-config-dialog/ui/index.tsx`
- `src/types/op-box-inspection-dto.ts`
- `src/usecases/op-jerp/select-op-packagings.test.ts`

## Resultado esperado

Em casos onde existam múltiplos blisters na OP, como blister do produto e blister de tampa, o sistema passa a considerar corretamente o blister do produto principal antes de decidir pular ou abrir o modal de configuração.