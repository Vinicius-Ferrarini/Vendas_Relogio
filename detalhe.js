// detalhe.js (OTIMIZADO)

// ===================================
// LÓGICA DA PÁGINA DE DETALHES
// ===================================
function renderizarDetalhes(produto) {
    const container = document.getElementById("detalheProdutoContainer");
    if (!produto) {
        container.innerHTML = "<p>Produto não encontrado.</p>";
        return;
    }

    // Funções 'escapeHtml' e 'formatPrice' vêm de checkout.js
    const images = produto.images && produto.images.length ? produto.images : ["https://via.placeholder.com/800x800?text=Sem+Imagem"];
    const mainImg = images[0];
    const thumbnails = images.slice(0, 4).map(img => `<img src="${escapeHtml(img)}" alt="Miniatura" class="card-thumb" loading="lazy">`).join('');

    const precoFmt = formatPrice(produto.preco || 0);
    const precoOriginalFmt = (produto.precoOriginal && produto.precoOriginal !== produto.preco)
                           ? `<span class="preco-original">${formatPrice(produto.precoOriginal)}</span>` 
                           : "";
    
    const descricaoFmt = produto.descricao ? escapeHtml(produto.descricao).replace(/\n/g, '<br>') : "Nenhuma descrição disponível.";

    // 'getCart' vem de checkout.js
    const cart = getCart();
    const isInCart = cart.find(item => item.id.toString() === produto.id.toString() && !item.observacao); 
    const btnText = isInCart ? "✅ Já no carrinho" : "Adicionar ao Carrinho";

    container.innerHTML = `
        <img src="${escapeHtml(mainImg)}" alt="${escapeHtml(produto.nome)}" id="detalhe-img-main">
        <div class="card-img-thumbs">${thumbnails}</div>
        <h1 class="detalhe-nome">${escapeHtml(produto.nome)}</h1>
        <div class="detalhe-preco">
            ${precoOriginalFmt}
            <span class="preco-atual">${precoFmt}</span>
        </div>
        
        <div class="detalhe-observacao" style="margin-top:15px; margin-bottom:10px; display:flex; flex-direction:column;">
            <label for="detalheObs" style="margin-bottom:5px; font-weight:600;">Observação (Opcional):</label>
            <textarea id="detalheObs" placeholder="Ex: Ajuste de pulseira, embalar para presente..." style="width:100%; min-height:60px; padding:8px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;"></textarea>
        </div>

        <button class="btn-add-cart detalhe-btn-whats" id="detalheAddCart">${btnText}</button>
        
        <p class="detalhe-descricao">${descricaoFmt}</p>
    `;
    
    if (isInCart) {
         document.getElementById("detalheAddCart").disabled = true;
    }

    adicionarClickHandlerMiniaturasDetalhe(container);
}

function adicionarClickHandlerMiniaturasDetalhe(container) {
    container.addEventListener("click", (e => {
        if (e.target.classList.contains("card-thumb")) {
            e.preventDefault();
            const mainImgEl = document.getElementById("detalhe-img-main");
            if (mainImgEl) mainImgEl.src = e.target.src;
        }
    }));
}

// ===================================
// INICIALIZAÇÃO DA PÁGINA
// ===================================
document.addEventListener("DOMContentLoaded", (() => {
    
    // 1. Inicializa a lógica do checkout (que vem de checkout.js)
    initCheckout();

    // 2. Inicializa o conteúdo específico desta página
    let produto;
    try {
        const dataParam = new URLSearchParams(window.location.search).get("data");
        if (!dataParam) throw new Error("Nenhum dado de produto encontrado na URL.");
        
        produto = JSON.parse(decodeURIComponent(dataParam));
        produto.id = produto.id.toString(); 
        
        renderizarDetalhes(produto);
        
        document.title = `${produto.nome || "Detalhes"} - Eleven Store`;

        const btnAddCart = document.getElementById("detalheAddCart");
        if (btnAddCart) {
            btnAddCart.addEventListener("click", (() => {
                let cart = getCart(); // getCart() vem de checkout.js
                const obsEl = document.getElementById("detalheObs");
                const observacao = obsEl ? obsEl.value.trim() : "";
                
                const existingIndex = cart.findIndex(item => item.id === produto.id && (item.observacao || "") === observacao);
                
                if (existingIndex > -1) {
                    cart[existingIndex].quantity++;
                } else {
                    cart.push({
                        id: produto.id,
                        nome: produto.nome,
                        preco: produto.preco,
                        quantity: 1,
                        observacao: observacao
                    });
                }
                saveCart(cart); // saveCart() vem de checkout.js
                
                updateCartButtonText(); // vem de checkout.js
                
                abrirModalCarrinho(); // vem de checkout.js
            }));
        }

    } catch (err) {
        console.error("Erro ao carregar detalhes do produto:", err);
        document.getElementById("detalheProdutoContainer").innerHTML = `<p class="erro">Não foi possível carregar os detalhes do produto. Por favor, tente novamente. ${err.message}</p>`;
    }
}));