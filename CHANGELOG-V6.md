# Delivery Painel V6 Core

## Kanban operacional
- Todas as etapas ficam visíveis no mesmo quadro horizontal.
- Arrastar e soltar pedidos entre colunas.
- Movimento otimista: o card muda imediatamente e volta se a API falhar.
- Destaque e rolagem automática para o card movimentado.
- Atualização automática a cada 10 segundos.
- Cronômetro com alerta verde, amarelo e vermelho.
- Busca por pedido, cliente ou telefone.
- Painel lateral com itens, observações, endereço, pagamento e avanço.

## Cardápio multi-nicho
- Nova área **Montagem**.
- Grupos reutilizáveis para tamanho, sabores, bordas, adicionais, ponto, acompanhamentos e complementos.
- Tipos de seleção: RADIO, CHECKBOX, QUANTITY e FLAVOR.
- Regras de preço: ADD, REPLACE, HIGHEST e AVERAGE.
- Mínimo, máximo, obrigatoriedade, quantidade grátis e limite por opção.
- Produtos podem ser STANDARD, PIZZA, COMBO ou CUSTOM.
- Pizza suporta mínimo/máximo de sabores e regra de preço.
- API para criar grupos/opções e vincular grupos aos produtos.
- Cardápio público passa a retornar os grupos e opções vinculados.

## Banco de dados
Após atualizar, execute:

```powershell
docker compose down
docker compose build --no-cache
docker compose up -d
```

O backend executa o fluxo Prisma definido no Docker. Caso o schema não seja aplicado automaticamente:

```powershell
docker compose exec backend npx prisma db push
docker compose restart backend
```
