# Estado de finalização do SaaS

A V7 consolida o núcleo operacional e corrige a falha que impedia a abertura das páginas. Ela é uma base funcional para homologação, não deve ser anunciada como produção financeira sem concluir os itens abaixo.

## Obrigatório antes de vender como SaaS final

1. Configurador visual do cliente para grupos de montagem e cálculo validado integralmente no backend.
2. Pagamento real com webhook, conciliação, estorno e idempotência do gateway.
3. Assinaturas/planos, cobrança do lojista e bloqueios por inadimplência.
4. Recuperação de senha, confirmação de e-mail, rotação de sessão e 2FA opcional.
5. RBAC completo por rota e ação; hoje há autenticação, mas nem toda rota aplica permissão por função.
6. Auditoria imutável de alterações críticas.
7. WebSocket/SSE para pedidos em tempo real; o Kanban atualmente usa atualização periódica.
8. Testes automatizados de pedido, preço, cupom, taxa, montagem e isolamento entre empresas.
9. Backup externo testado e procedimento de restauração.
10. HTTPS, domínio, observabilidade, alertas, LGPD, termos, política e retenção de dados.

## Critério de homologação

Execute `docker compose build --no-cache`, suba os serviços, aplique `prisma db push`, rode o seed e teste um pedido completo para cada nicho utilizado.
