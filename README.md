# gde-insp-embalagem

Frontend de inspeção/embalagem com integração ao JERP, preparado para operação multi‑óculos.

## Principais comandos

- Desenvolvimento local
```bash
npm run dev
```

- Build/produção
```bash
npm run build && npm run start
```

## Configuração
- Variáveis relevantes (via docker-compose de instância):
  - NEXT_PUBLIC_INSTANCE_ID: id do óculos/instância (gerado no cliente e passado pelos scripts de deploy)
  - JERP_API, JERP_TOKEN: integração JERP (backend do Next)
  - DATABASE_URL: Postgres central (Prisma)

## Migrações Prisma
Após alterações de schema:
```bash
npx prisma migrate dev
npx prisma generate
```

## Novidades principais
- Botão “Pegar próxima caixa pendente” com claim otimista no backend
- Guardas mínimos anti‑concorrência (embalar e gerar etiqueta idempotente)
- Impressão no navegador (lado do cliente)
- Dashboard com modo “Só vídeos” (toggle)

Mais detalhes em ../../ALTERACOES.md
