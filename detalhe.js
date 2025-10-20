// detalhe.js

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
 * Renderiza os detalhes do produto no container
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
  
  // Pega até 3 imagens para miniaturas (da 2ª até a 4ª)
  // Na página de detalhes, podemos mostrar todas se quisermos, mas vamos manter 3 por consistência
  const thumbnails = images.slice(1, 4); 
  const thumbsHTML = thumbnails
    .map(img => `<img src="${escapeHtml(img)}" alt="Miniatura" class="card-thumb" loading="lazy">`) // Reutiliza a classe .card-thumb
    .join('');

  // Formata preço
  const precoFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco || 0);

  // Formata descrição
  const descricaoHTML = produto.descricao ? escapeHtml(produto.descricao) : 'Nenhuma descrição disponível.';

  // Monta o HTML final
  container.innerHTML = `
    <img src="${escapeHtml(mainImg)}" alt="${escapeHtml(produto.nome)}" id="detalhe-img-main">
    
    <div class="card-img-thumbs">
      ${thumbsHTML}
    </div>
    
    <h1 class="detalhe-nome">${escapeHtml(produto.nome)}</h1>
    <div class="detalhe-preco">${precoFmt}</div>
    <p class="detalhe-descricao">${descricaoHTML}</p>
  `;
  
  // Adiciona o handler de clique para as miniaturas desta página
  adicionarClickHandlerMiniaturasDetalhe(container);
}

/**
 * Adiciona handler de clique para miniaturas (delegação de evento)
 */
function adicionarClickHandlerMiniaturasDetalhe(container) {
  container.addEventListener('click', (e) => {
    // Verifica se o clique foi em uma miniatura
    if (e.target.classList.contains('card-thumb')) {
      e.preventDefault();
      
      const mainImg = document.getElementById('detalhe-img-main');
      if (mainImg) {
        mainImg.src = e.target.src; // Troca a imagem
      }
    }
  });
}


/**
 * Inicialização da página de detalhes
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    // 1. Pega os parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const dataString = urlParams.get('data');

    if (!dataString) {
      throw new Error('Nenhum dado de produto encontrado na URL.');
    }

    // 2. Decodifica e faz o parse do JSON
    const produto = JSON.parse(decodeURIComponent(dataString));

    // 3. Renderiza os detalhes
    renderizarDetalhes(produto);
    
    // 4. Atualiza o título da página
    document.title = `${produto.nome || 'Detalhes'} - Leandrinho Relógios`;

  } catch (error) {
    console.error('Erro ao carregar detalhes do produto:', error);
    const container = document.getElementById('detalheProdutoContainer');
    container.innerHTML = `<p class="erro">Não foi possível carregar os detalhes do produto. Por favor, tente novamente. ${error.message}</p>`;
  }
});