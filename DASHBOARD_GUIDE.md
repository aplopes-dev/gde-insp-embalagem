# 🔒 Painel de Controle de OP - Guia de Uso

## 📋 Visão Geral

O Painel de Controle de OP é uma ferramenta exclusiva para **Administradores** que permite monitorar e rastrear todas as ações realizadas em uma Ordem de Produção (OP), incluindo:

- ✅ Inspeções de caixas (aprovadas/rejeitadas)
- ✅ Criação de peças
- ✅ Autorizações de supervisores
- ✅ Mudanças de status
- ✅ Estatísticas e métricas

## 🔐 Acesso

### Quem pode acessar?
- ✅ **ADMINISTRADOR** - Acesso completo
- ❌ **SUPERVISOR** - Acesso negado
- ❌ **OPERADOR** - Acesso negado

### Como acessar?

1. Faça login como **Administrador**
2. Vá para **Admin** → **OPs**
3. Clique no ícone de **Gráfico** (📊) na linha da OP desejada
4. Você será redirecionado para o painel de controle

**URL direta:** `http://localhost:3000/admin/ops/[ID]/dashboard`

## 📊 Seções do Painel

### 1. Estatísticas da OP

Exibe 8 cards com informações resumidas:

| Card | Descrição |
|------|-----------|
| **Caixas Inspecionadas** | Total de caixas que passaram por inspeção |
| **Taxa de Aprovação** | Percentual de caixas aprovadas |
| **Taxa de Rejeição** | Percentual de caixas rejeitadas |
| **Tempo Médio** | Tempo médio de inspeção por caixa (em minutos) |
| **Peças Criadas** | Quantidade de peças novas criadas durante a OP |
| **Supervisores** | Quantidade de supervisores envolvidos |
| **Operadores** | Quantidade de operadores envolvidos |
| **Total de Usuários** | Total de usuários que participaram da OP |

### 2. Filtros Avançados

Permite filtrar o histórico de ações por:

- **Tipo de Ação**: Inspeção Aprovada, Inspeção Rejeitada, Peça Criada, etc.
- **Usuário**: Selecione um usuário específico
- **Data Inicial**: Filtre a partir de uma data
- **Data Final**: Filtre até uma data
- **Buscar por ID**: Procure por ID de caixa ou peça

**Recursos:**
- ✅ Filtros funcionam em tempo real
- ✅ Múltiplos filtros podem ser combinados
- ✅ Tags mostram filtros ativos
- ✅ Clique no X na tag para remover filtro individual
- ✅ Botão "Limpar Tudo" remove todos os filtros

### 3. Histórico de Ações

Exibe uma timeline com todas as ações realizadas na OP, em ordem cronológica (mais recentes primeiro).

**Informações exibidas para cada ação:**

- 🕐 **Hora**: Hora exata da ação (HH:MM:SS)
- 🏷️ **Tipo**: Badge indicando o tipo de ação
- 👤 **Usuário**: Nome e email de quem realizou a ação
- 📝 **Descrição**: Descrição detalhada da ação
- 📦 **Caixa/Peça**: ID da caixa ou peça relacionada (se aplicável)
- 📅 **Data/Hora Completa**: Data e hora formatadas (DD/MM/YYYY HH:MM:SS)

**Cores por tipo de ação:**

- 🟢 **Verde**: Inspeção Aprovada
- 🔴 **Vermelho**: Inspeção Rejeitada
- 🔵 **Azul**: Peça Criada/Autorizada
- 🟡 **Amarelo**: Status Alterado
- ⚪ **Cinza**: Outras ações

## 🔧 Tipos de Ações Rastreadas

| Tipo | Descrição |
|------|-----------|
| `BOX_INSPECTION_APPROVED` | Caixa inspecionada e aprovada |
| `BOX_INSPECTION_REJECTED` | Caixa inspecionada e rejeitada |
| `PRODUCT_CREATED` | Peça nova criada |
| `PRODUCT_AUTHORIZED` | Peça autorizada por supervisor |
| `STATUS_CHANGED` | Status da OP alterado |
| `OP_STARTED` | OP iniciada |
| `OP_COMPLETED` | OP concluída |

## 📈 Casos de Uso

### 1. Auditar uma OP completa
- Acesse o painel da OP
- Veja todas as ações realizadas em ordem cronológica
- Identifique quem fez o quê e quando

### 2. Investigar problema em caixa
- Use o filtro "Buscar por ID"
- Digite o ID da caixa problemática
- Veja quem inspecionou e qual foi o resultado

### 3. Verificar autorizações de peças
- Filtre por "Tipo de Ação" = "Peça Criada"
- Veja quais peças foram criadas e por quem
- Identifique supervisores que autorizaram

### 4. Analisar performance
- Veja a taxa de aprovação/rejeição
- Analise o tempo médio de inspeção
- Identifique operadores mais eficientes

### 5. Gerar relatório
- Filtre por período de data
- Copie as informações do histórico
- Exporte para relatório

## 🔍 Dicas e Truques

### Filtros Rápidos
- Clique em um usuário no histórico para filtrar por ele
- Use datas para analisar períodos específicos

### Visualização
- Scroll para ver mais ações
- Clique em uma ação para expandir detalhes
- Use o navegador para voltar à lista de OPs

### Performance
- Se houver muitas ações, use filtros para reduzir a lista
- Filtros por data melhoram a performance

## 🛡️ Segurança

- ✅ Apenas administradores podem acessar
- ✅ Todas as ações são registradas com timestamp
- ✅ Usuário e email são rastreados
- ✅ Dados são imutáveis (auditoria completa)

## 📝 Dados Registrados

Para cada ação, o sistema registra:

```json
{
  "id": "uuid-único",
  "opId": 123,
  "userId": "user-id",
  "user": {
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "OPERADOR"
  },
  "actionType": "BOX_INSPECTION_APPROVED",
  "description": "Caixa BOX-001 inspecionada e aprovada",
  "details": {
    "defectCount": 0,
    "observations": "OK"
  },
  "boxId": "BOX-001",
  "productId": null,
  "createdAt": "2024-10-20T14:35:22.000Z"
}
```

## 🚀 Próximas Funcionalidades

- [ ] Exportar relatório em PDF
- [ ] Gráficos de performance
- [ ] Alertas de anomalias
- [ ] Integração com email
- [ ] Comparação entre OPs

## ❓ Dúvidas?

Para mais informações, consulte a documentação técnica ou entre em contato com o administrador do sistema.

