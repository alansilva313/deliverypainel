# Delivery Painel V7.0

## Correção crítica

- Criado o componente compartilhado `PageTitle`, eliminando o erro `ReferenceError: PageTitle is not defined`.
- Efeitos assíncronos ajustados para não retornarem `Promise` ao React.
- Verificação estática dos componentes JSX: nenhum outro componente de interface ficou sem definição/importação.

## Base de produto

- Kanban horizontal com arrastar e soltar, avanço, destaque e atualização automática.
- Motor multi-nicho com grupos de montagem, opções, limites, obrigatoriedade e regras de preço.
- Estrutura para pizza, lanche, açaí, marmita, sushi, combos e produtos personalizados.
- Multiempresa por `establishmentId` nas entidades principais.
- Cardápio público, checkout, clientes, pedidos, cozinha, produtos, categorias, cupons, zonas e equipe.
- Relatórios, configurações, API key e documentação Swagger.

## Engenharia

- Versões atualizadas para 7.0.0.
- Docker Compose renomeado para `deliverypainel-v7`.
- Workflow GitHub Actions para validar frontend e backend em pushes e pull requests.
- Script PowerShell/BAT de publicação no GitHub preservado.

## Observação de validação

O ambiente de geração não conseguiu baixar as dependências NPM dentro do limite de tempo. O pacote foi validado por inspeção estática, mas o build final deve ser executado pelo Docker local antes do push.
