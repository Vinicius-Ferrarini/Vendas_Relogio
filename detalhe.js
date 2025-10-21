// detalhe.js (ATUALIZADO COM PEDIDO RÁPIDO)

// Config e funções do carrinho principal
const WHATSAPP_NUMBER = "5543999705837";

function getCart() { return JSON.parse(localStorage.getItem('leandrinhoCart') || '[]'); }
function saveCart(cart) { localStorage.setItem('leandrinhoCart', JSON.stringify(cart)); }
function escapeHtml(str){ if(!str && str !== 0) return ""; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function formatPrice(price) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price || 0); } // Adicionado formatPrice

/** --- ATUALIZADO: Adiciona HTML para pedido rápido --- */
function renderizarDetalhes(produto) {
  const container = document.getElementById('detalheProdutoContainer'); if (!produto) { container.innerHTML = '<p>Produto não encontrado.</p>'; return; }
  const placeholder = "https://via.placeholder.com/800x800?text=Sem+Imagem";
  const images = produto.images && produto.images.length ? produto.images : [placeholder];
  const mainImg = images[0];
  const thumbnails = images.slice(0, 4); 
  const thumbsHTML = thumbnails.map(img => `<img src="${escapeHtml(img)}" alt="Miniatura" class="card-thumb" loading="lazy">`).join('');
  const precoFmt = formatPrice(produto.preco || 0);
  const precoOriginalFmt = produto.precoOriginal ? `<span class="preco-original">${formatPrice(produto.precoOriginal)}</span>` : '';
  const descricaoHTML = produto.descricao ? escapeHtml(produto.descricao) : 'Nenhuma descrição disponível.';
  const cart = getCart();
  const isInCart = cart.find(item => item.id.toString() === produto.id.toString());
  const btnText = isInCart ? '✅ Já no carrinho' : 'Adicionar ao Carrinho';
  const btnDisabled = isInCart ? 'disabled' : '';

  container.innerHTML = `
    <img src="${escapeHtml(mainImg)}" alt="${escapeHtml(produto.nome)}" id="detalhe-img-main">
    <div class="card-img-thumbs">${thumbsHTML}</div>
    <h1 class="detalhe-nome">${escapeHtml(produto.nome)}</h1>
    <div class="detalhe-preco">${precoOriginalFmt}<span class="preco-atual">${precoFmt}</span></div>
    
    <button class="btn-add-cart detalhe-btn-whats" id="detalheAddCart" ${btnDisabled}>${btnText}</button>
    
    <div class="detalhe-pedido-rapido">
        <label for="detalheQuantidade">Quantidade:</label>
        <input type="number" id="detalheQuantidade" value="1" min="1">
        <button id="enviarPedidoDetalhe">Pedir Agora via WhatsApp</button>
    </div>
    
    <p class="detalhe-descricao">${descricaoHTML}</p>
  `;
  
  adicionarClickHandlerMiniaturasDetalhe(container);
}

function adicionarClickHandlerMiniaturasDetalhe(container) {
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('card-thumb')) {
      e.preventDefault(); const mainImg = document.getElementById('detalhe-img-main'); if (mainImg) { mainImg.src = e.target.src; }
    }
  });
}

/** --- NOVO: Função para enviar pedido rápido --- */
function handlePedidoRapido(produto) {
    const quantidadeInput = document.getElementById('detalheQuantidade');
    const quantidade = parseInt(quantidadeInput.value, 10);

    if (isNaN(quantidade) || quantidade < 1) {
        alert("Por favor, insira uma quantidade válida (1 ou mais).");
        quantidadeInput.value = 1; // Reseta para 1
        return;
    }

    const itemTotal = formatPrice(produto.preco * quantidade);
    const msg = `Olá! Gostaria de pedir o seguinte item:\n\n${quantidade}x ${produto.nome} - ${itemTotal}\n\n(Pedido Rápido)`;
    const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`; 
    window.open(wa, '_blank');
}


document.addEventListener('DOMContentLoaded', () => {
  let produto; 
  try {
    const urlParams = new URLSearchParams(window.location.search); const dataString = urlParams.get('data');
    if (!dataString) { throw new Error('Nenhum dado de produto encontrado na URL.'); }
    produto = JSON.parse(decodeURIComponent(dataString)); produto.id = produto.id.toString(); 
    renderizarDetalhes(produto);
    document.title = `${produto.nome || 'Detalhes'} - Leandrinho Relógios`;
    
    // Listener Botão Adicionar ao Carrinho Principal
    const btnAdd = document.getElementById('detalheAddCart');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        let cart = getCart(); 
        const existingItemIndex = cart.findIndex(item => item.id === produto.id);
        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity++; // Incrementa se já existe
        } else {
            cart.push({ id: produto.id, nome: produto.nome, preco: produto.preco, quantity: 1 }); // Adiciona com Qtd 1
        }
        saveCart(cart);
        btnAdd.textContent = '✅ Adicionado!'; btnAdd.disabled = true;
        // Talvez atualizar o botão do footer aqui também? (Opcional)
        // updateCartButtonText(); // Precisaria importar/duplicar essa função
      });
    }

    // --- NOVO: Listener Botão Pedido Rápido ---
    const btnPedidoRapido = document.getElementById('enviarPedidoDetalhe');
    if(btnPedidoRapido) {
        btnPedidoRapido.addEventListener('click', () => handlePedidoRapido(produto));
    }

  } catch (error) {
    console.error('Erro ao carregar detalhes do produto:', error);
    const container = document.getElementById('detalheProdutoContainer');
    container.innerHTML = `<p class="erro">Não foi possível carregar os detalhes do produto. Por favor, tente novamente. ${error.message}</p>`;
  }
});