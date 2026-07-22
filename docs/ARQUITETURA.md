# Arquitetura

- **Frontend:** React 19, TypeScript, Vite, Recharts e Lucide.
- **API:** Node.js, Express 5, TypeScript, Zod, JWT, Prisma e Swagger.
- **Banco:** PostgreSQL 16, isolado na rede interna do Docker.
- **Multiempresa:** o `establishmentId` vem do token ou da chave de API; rotas de negócio não confiam no tenant enviado pelo navegador.
- **Integrações:** cardápio por API key, estrutura pronta para n8n/Evolution API e webhooks.

## Superfícies incluídas

Painel, dashboard, pedidos em Kanban e lista, cozinha, produtos, categorias, clientes, cupons, zonas de entrega, equipe, relatórios, configurações, integrações e loja pública com carrinho e checkout.

## Produção

Antes de publicar, configure domínio, HTTPS, segredos, backups, SMTP, armazenamento de imagens e gateway de pagamento. Evolution API e Mercado Pago exigem credenciais externas.
