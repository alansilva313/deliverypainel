# Fogo Delivery SaaS V5 Pro

Plataforma multiempresa de delivery com painel administrativo moderno, loja pública, API REST e integração preparada para n8n/Evolution API.

## Subir o projeto

```powershell
docker compose up --build -d
docker compose logs -f backend
```

Quando a API estiver saudável:

```powershell
docker compose exec backend npm run prisma:seed
```

## Acessos

- Painel: http://localhost:5180
- Loja: http://localhost:5180/loja
- API: http://localhost:3010
- Swagger: http://localhost:3010/docs

Login de demonstração:

- E-mail: `admin@demo.com`
- Senha: `Admin123!`
- X-API-Key: `demo_delivery_key_123`

## Portas e conflitos

O PostgreSQL **não é publicado no Windows**, portanto não disputa 5432, 5433 ou 5434. Backend e frontend usam 3010 e 5180.

## Módulos

- autenticação JWT e perfis;
- isolamento multiempresa;
- dashboard com métricas e gráficos;
- pedidos em Kanban e lista;
- painel de cozinha;
- produtos, categorias e estoque;
- clientes e endereços;
- cupons e campanhas;
- zonas e taxas de entrega;
- usuários e permissões;
- relatórios;
- configurações do estabelecimento;
- loja pública, carrinho e checkout;
- Swagger e endpoint por API key para automações.

## Observação

Integrações que movimentam dinheiro ou mensagens reais dependem de contas e credenciais externas. O projeto inclui a base e os pontos de integração, mas não inventa credenciais de Mercado Pago, SMTP, mapas ou WhatsApp.
