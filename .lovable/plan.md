

## Adicionar "Imoveis Comerciais" ao Marketplace

Vou adicionar a categoria **Imoveis Comerciais** com suporte para **Venda** e **Aluguel**, integrando em todo o fluxo existente.

### O que sera feito

**1. Nova categoria "Imoveis Comerciais"**
- Adicionar a categoria na lista de categorias com icone `Building2`
- Atualizar o componente `CategoryCard` para incluir o icone `Building2` no mapa de icones

**2. Campo "Tipo de Operacao" no formulario de anuncio**
- Adicionar um novo campo Select no formulario `/anunciar` com as opcoes:
  - Venda (de negocio - comportamento atual)
  - Venda de Imovel Comercial
  - Aluguel de Imovel Comercial
- Quando o tipo for "Aluguel", o campo "Valor do Negocio" muda para "Valor do Aluguel Mensal" e o campo "Faturamento Mensal" se torna opcional

**3. Novos anuncios mockados de imoveis comerciais**
- Adicionar 2-3 anuncios de imoveis comerciais (ex: sala comercial, galpao, loja de rua) com campo `tipo` indicando se e venda ou aluguel

**4. Ajustes no modelo de dados**
- Adicionar campo opcional `tipo` na interface `Listing`: `"venda" | "aluguel-imovel" | "venda-imovel"`
- O campo `faturamentoMensal` passa a ser opcional (imoveis para aluguel nao tem faturamento)
- Adicionar campo opcional `areaM2` (area em metros quadrados)

**5. Ajustes visuais**
- Na `ListingCard` e pagina `Anuncio`, exibir badge "Aluguel" ou "Venda" quando for imovel comercial
- Na pagina de detalhe, mostrar area (m2) quando disponivel
- Ajustar o sidebar de preco para mostrar "Valor do Aluguel/mes" quando aplicavel

**6. Filtro na busca**
- O filtro de categoria ja funciona automaticamente, pois a nova categoria sera filtrada como qualquer outra

### Detalhes tecnicos

- **Interface Listing**: adicionar `tipo?: "venda" | "venda-imovel" | "aluguel-imovel"` e `areaM2?: number`
- **mockListings.ts**: adicionar `Building2` na lista de categorias e 2-3 listings de imoveis
- **CategoryCard.tsx**: adicionar `Building2` ao `iconMap`
- **Anunciar.tsx**: adicionar campo Select "Tipo de Operacao" e logica condicional para campos
- **ListingCard.tsx**: exibir badge de tipo quando for imovel
- **Anuncio.tsx**: exibir area e ajustar label de preco conforme tipo
