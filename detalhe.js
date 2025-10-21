// detalhe.js

// Config e funções do carrinho
const WHATSAPP_NUMBER = "5543999705837";

function getCart() {
  return JSON.parse(localStorage.getItem('leandrinhoCart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('leandrinhoCart', JSON.stringify(cart));
}

// Função para escapar HTML (segurança)
function escapeHtml(str){
  if(!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Renderiza os detalhes do produto com o novo formato de preço.
 */
function renderizarDetalhes(produto) {
  const container = document.getElementById('detalheProdutoContainer');
  if (!produto) {
    container.innerHTML = '<p>Produto não encontrado.</p>';
    return;
  }

  // Prepara imagens
  const placeholder = "https://via.placeholder.com/800x800?text=Sem+Imagem";
  const images = produto.images && produto.images.length ? produto.images : [placeholder];
  const mainImg = images[0];
  
  const thumbnails = images.slice(0, 4); 
  const thumbsHTML = thumbnails
    .map(img => `<img src="${escapeHtml(img)}" alt="Miniatura" class="card-thumb" loading="lazy">`)
    .join('');

  // Lógica de Preço
  const precoFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco || 0);
  
  const precoOriginalFmt = produto.precoOriginal
    ? `<span class="preco-original">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.precoOriginal)}</span>`
    : '';

  // Formata descrição
  const descricaoHTML = produto.descricao ? escapeHtml(produto.descricao) : 'Nenhuma descrição disponível.';

  // Verifica status do carrinho para o botão
  const cart = getCart();
  const isInCart = cart.find(item => item.id.toString() === produto.id.toString());
  const btnText = isInCart ? '✅ Já no carrinho' : 'Adicionar ao Carrinho';
  const btnDisabled = isInCart ? 'disabled' : '';

  // Monta o HTML final
  container.innerHTML = `
    <img src="${escapeHtml(mainImg)}" alt="${escapeHtml(produto.nome)}" id="detalhe-img-main">
    
    <div class="card-img-thumbs">
      ${thumbsHTML}
    </div>
    
    <h1 class="detalhe-nome">${escapeHtml(produto.nome)}</h1>
    
    <div class="detalhe-preco">
      ${precoOriginalFmt}
      <span class="preco-atual">${precoFmt}</span>
    </div>
    
    <button class="btn-add-cart detalhe-btn-whats" id="detalheAddCart" ${btnDisabled}>
      ${btnText}
    </button>
    
    <p class="detalhe-descricao">${descricaoHTML}</p>
  `;
  
  adicionarClickHandlerMiniaturasDetalhe(container);
}

/**
 * Adiciona handler de clique para miniaturas (delegação de evento)
 */
function adicionarClickHandlerMiniaturasDetalhe(container) {
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('card-thumb')) {
      e.preventDefault();
      
      const mainImg = document.getElementById('detalhe-img-main');
      if (mainImg) {
        mainImg.src = e.target.src; 
      }
    }
  });
}


/**
 * Inicialização da página de detalhes
 */
document.addEventListener('DOMContentLoaded', () => {
  let produto; 

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const dataString = urlParams.get('data');

    if (!dataString) {
      throw new Error('Nenhum dado de produto encontrado na URL.');
    }

    produto = JSON.parse(decodeURIComponent(dataString));
    produto.id = produto.id.toString(); 

    renderizarDetalhes(produto);
    
    document.title = `${produto.nome || 'Detalhes'} - Leandrinho Relógios`;
    
    const btnAdd = document.getElementById('detalheAddCart');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const cart = getCart();
        
        if (cart.find(item => item.id === produto.id)) return;

        cart.push({ id: produto.id, nome: produto.nome, preco: produto.preco });
        saveCart(cart);
        
        btnAdd.textContent = '✅ Adicionado!';
        btnAdd.disabled = true;
      });
    }

  } catch (error) {
    console.error('Erro ao carregar detalhes do produto:', error);
    const container = document.getElementById('detalheProdutoContainer');
    container.innerHTML = `<p class="erro">Não foi possível carregar os detalhes do produto. Por favor, tente novamente. ${error.message}</p>`;
  }
});