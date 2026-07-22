# Motor multi-nicho

O cardápio não deve ter lógica fixa para cada segmento. A base é composta por **produto + grupos de montagem + opções**.

## Exemplos

### Pizza
- Produto: Pizza grande
- Grupo Tamanho: broto, média, grande
- Grupo Sabores: mínimo 1, máximo 2, tipo FLAVOR, preço HIGHEST ou AVERAGE
- Grupo Massa: tradicional, fina, integral
- Grupo Borda: sem borda, catupiry, cheddar
- Grupo Adicionais: bacon, queijo, cebola

### Hambúrguer
- Grupo Ponto da carne: RADIO obrigatório
- Grupo Remover ingredientes: CHECKBOX sem preço
- Grupo Adicionais: QUANTITY com limite por opção

### Açaí
- Grupo Tamanho: REPLACE
- Grupo Frutas: CHECKBOX com 2 grátis
- Grupo Complementos: QUANTITY

### Marmita
- Grupo Tamanho: RADIO
- Grupo Proteína: RADIO obrigatório
- Grupo Acompanhamentos: CHECKBOX com mínimo e máximo

## Próxima camada
O storefront deverá abrir um configurador ao clicar no produto, validar todas as escolhas e enviar ao backend os IDs das opções e quantidades. O backend deve recalcular o preço sem confiar no navegador.
