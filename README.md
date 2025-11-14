<p align="center">
  <img src="./img/logo.png" alt="Eleven Store Logo" width="200">
</p>

<h1 align="center">
  Eleven Store
</h1>

<p align="center">
  Catálogo de vendas leve e de alta performance com integração direta ao Google Sheets e finalização via WhatsApp.
</p>

<p align="center">
  <img src="./img/capa.gif" alt="Demonstração do site Eleven Store">
</p>

---

## 🚀 Sobre o Projeto

O **Eleven Store** é um catálogo de vendas e-commerce focado em relógios e acessórios. Este projeto foi desenvolvido como uma solução front-end leve, utilizando **HTML, CSS e JavaScript puros**, sem a necessidade de frameworks ou bibliotecas pesadas.

O diferencial deste projeto é que ele usa uma **Planilha Google Sheets como um "backend"**. O administrador do site pode cadastrar, alterar preços e marcar produtos em oferta diretamente na planilha, e o site reflete as mudanças instantaneamente, sem precisar de deploy.

O fluxo de compra é otimizado para conversão direta, enviando um pedido completo e formatado para o **WhatsApp** do vendedor.

### ✨ Demonstração ao Vivo

Acesse o site em produção:

[<img src="https://img.shields.io/badge/Acessar%20Site-elevenstore11.com.br-25D366?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Link para o site">](https://elevenstore11.com.br)

---

## 🎯 Funcionalidades Principais

* **Catálogo Dinâmico:** Os produtos são carregados a partir de uma planilha Google Sheets (usando a API Google Visualization).
* **Carrinho de Compras:** O usuário pode adicionar/remover/atualizar a quantidade de itens, que são salvos no `localStorage`.
* **Checkout via WhatsApp:** Envia um pedido completo e formatado (com itens, observações, endereço e forma de pagamento) para o WhatsApp do vendedor.
* **Wizard de Checkout:** Um fluxo de 2 passos (Itens ➔ Endereço/Pagamento) para finalizar o pedido.
* **Busca de Endereço:** Consulta automática de CEP via API (ViaCEP) para preenchimento do endereço.
* **Filtros Avançados:**
    * Pesquisa por nome (em tempo real).
    * Botão "Filtros" (sanfona) que esconde/mostra as opções.
    * Filtro por Categoria, Gênero, Tipo e Faixa de Preço.
* **Design Responsivo:** Layout que se adapta de 5 colunas (Desktop) até 2 colunas (Mobile).
* **Página de Detalhes:** Layout profissional de 2 colunas (estilo Mercado Livre) para detalhes do produto.
* **Otimização de Performance:**
    * **Skeleton Loaders:** "Esqueletos" de cards são exibidos enquanto os produtos carregam, melhorando a percepção de velocidade.
    * **IDs Estáveis:** Garante que o carrinho funcione mesmo após recarregar a página (criando IDs a partir do nome do produto se não houver ID na planilha).
* **Ofertas com Timer:** Produtos em oferta exibem um contador de tempo (countdown).

---

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído focando em performance e simplicidade, sem frameworks:

* **HTML5**
* **CSS3** (com Flexbox e Grid para layouts responsivos)
* **JavaScript (ES6+)**
    * `fetch` para APIs (Google Sheets, ViaCEP)
    * `localStorage` para gerenciamento do carrinho