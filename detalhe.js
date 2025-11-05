// detalhe.js (OTIMIZADO PARA O NOVO LAYOUT DE 2 COLUNAS)

// ===================================
// LÓGICA DA PÁGINA DE DETALHES
// ===================================
function renderizarDetalhes(produto) {
    // 1. Pega os placeholders do HTML
    const imgMainEl = document.getElementById("detalhe-img-main");
    const thumbnailsContainer = document.getElementById("detalheThumbnails");
    const nomeEl = document.getElementById("detalheNome");
    const precoContainer = document.getElementById("detalhePrecoContainer");
    const descricaoEl = document.getElementById("detalheDescricao");
    const btnAddCart = document.getElementById("detalheAddCart");

    if (!produto) {
        nomeEl.textContent = "Produto não encontrado.";
        return;
    }

    // 2. Prepara os dados
    const images = produto.images && produto.images.length ? produto.images : ["https://via.placeholder.com/800x800?text=Sem+Imagem"];
    const mainImg = images[0];
    
    // Prepara o preço
    const precoFmt = formatPrice(produto.preco || 0);
    const precoOriginalFmt = (produto.precoOriginal && produto.precoOriginal !== produto.preco)
                           ? `<span class="preco-original">${formatPrice(produto.precoOriginal)}</span>` 
                           : "";
    const precoHTML = `${precoOriginalFmt}<span class="preco-atual">${precoFmt}</span>`;

    // Prepara a descrição (substitui quebras de linha por <br>)
    const descricaoFmt = produto.descricao ? escapeHtml(produto.descricao).replace(/\n/g, '<br>') : "Nenhuma descrição disponível.";

    // Prepara o botão do carrinho
    const cart = getCart();
    const isInCart = cart.find(item => item.id.toString() === produto.id.toString() && !item.observacao); 
    const btnText = isInCart ? "✅ Já no carrinho" : "Adicionar ao Carrinho";
    
    // 3. Preenche os placeholders com os dados
    imgMainEl.src = escapeHtml(mainImg);
    imgMainEl.alt = escapeHtml(produto.nome);
    nomeEl.textContent = escapeHtml(produto.nome);
    precoContainer.innerHTML = precoHTML;
    descricaoEl.innerHTML = descricaoFmt;
    btnAddCart.textContent = btnText;
    if (isInCart) {
         btnAddCart.disabled = true;
    }

    // 4. Renderiza as thumbnails
    vazioElemento(thumbnailsContainer); // Limpa thumbnails antigas
    images.forEach((imgSrc, index) => {
        const imgEl = document.createElement('img');
        imgEl.src = escapeHtml(imgSrc);
        imgEl.alt = `Miniatura ${index + 1}`;
        imgEl.dataset.src = escapeHtml(imgSrc); // Guarda o link da imagem grande
        if (index === 0) {
            imgEl.classList.add('active'); // Ativa a primeira
        }
        thumbnailsContainer.appendChild(imgEl);
    });
    
    // 5. Adiciona o listener de clique nas thumbnails
    adicionarClickHandlerMiniaturasDetalhe(thumbnailsContainer, imgMainEl);
}

function adicionarClickHandlerMiniaturasDetalhe(container, mainImgEl) {
    container.addEventListener("click", (e) => {
        // Verifica se clicou num thumbnail
        if (e.target.tagName === "IMG") {
            // Remove a classe 'active' de todas as outras
            container.querySelectorAll('img').forEach(img => img.classList.remove('active'));
            
            // Adiciona 'active' na clicada
            e.target.classList.add('active');
            
            // Troca a imagem principal
            mainImgEl.src = e.target.dataset.src;
        }
    });
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
        
        // Renderiza os detalhes nos novos placeholders
        renderizarDetalhes(produto);
        
        document.title = `${produto.nome || "Detalhes"} - Eleven Store`;

        const btnAddCart = document.getElementById("detalheAddCart");
        if (btnAddCart) {
            btnAddCart.addEventListener("click", (() => {
                let cart = getCart();
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
                saveCart(cart); 
                
                updateCartButtonText(); 
                
                abrirModalCarrinho(); 
            }));
        }

    } catch (err) {
        console.error("Erro ao carregar detalhes do produto:", err);
        // Tenta mostrar o erro no H1 da página
        const nomeEl = document.getElementById("detalheNome");
        if(nomeEl) {
            nomeEl.textContent = "Erro ao carregar produto.";
        }
    }
}));