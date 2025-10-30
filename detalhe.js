// ======================
// CONFIG - DETALHE.JS
// ======================
const WHATSAPP_NUMBER = "5548999609870"; 

// ===================================
// FUNÇÕES AUXILIARES
// ===================================
function getCart() {
    return JSON.parse(localStorage.getItem("leandrinhoCart") || "[]");
}
function saveCart(cart) {
    localStorage.setItem("leandrinhoCart", JSON.stringify(cart));
}
function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function formatPrice(price) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price || 0);
}

// ===================================
// RENDERIZAÇÃO E LÓGICA DA PÁGINA
// ===================================
function renderizarDetalhes(produto) {
    const container = document.getElementById("detalheProdutoContainer");
    if (!produto) {
        container.innerHTML = "<p>Produto não encontrado.</p>";
        return;
    }

    const images = produto.images && produto.images.length ? produto.images : ["https://via.placeholder.com/800x800?text=Sem+Imagem"];
    const mainImg = images[0];
    const thumbnails = images.slice(0, 4).map(img => `<img src="${escapeHtml(img)}" alt="Miniatura" class="card-thumb" loading="lazy">`).join('');

    const precoFmt = formatPrice(produto.preco || 0);
    const precoOriginalFmt = produto.precoOriginal ? `<span class="preco-original">${formatPrice(produto.precoOriginal)}</span>` : "";
    
    const descricaoFmt = produto.descricao ? escapeHtml(produto.descricao) : "Nenhuma descrição disponível.";

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
        
        <button class="btn-add-cart detalhe-btn-whats" id="detalheAddCart">${btnText}</button>
        
        <div class="detalhe-observacao" style="margin-top:15px; margin-bottom:10px; display:flex; flex-direction:column;">
            <label for="detalheObs" style="margin-bottom:5px; font-weight:600;">Observação:</label>
            <textarea id="detalheObs" placeholder="Ex: Ajuste de pulseira, embalar para presente..." style="width:100%; min-height:60px; padding:8px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;"></textarea>
        </div>

        <div class="detalhe-pedido-rapido">
            <label for="detalheQuantidade">Quantidade:</label>
            <input type="number" id="detalheQuantidade" value="1" min="1">
            <button id="enviarPedidoDetalhe">Pedir Agora via WhatsApp</button>
        </div>
        
        <p class="detalhe-descricao">${descricaoFmt}</p>
    `;

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

function handlePedidoRapido(produto) {
    const qtdEl = document.getElementById("detalheQuantidade");
    const quantidade = parseInt(qtdEl.value, 10);
    if (isNaN(quantidade) || quantidade < 1) {
        alert("Por favor, insira uma quantidade válida (1 ou mais).");
        qtdEl.value = 1;
        return;
    }
    const obsEl = document.getElementById("detalheObs");
    const observacao = obsEl ? obsEl.value.trim() : "";
    const obsText = observacao ? `\n\nObservação: ${observacao}` : "";
    
    const totalFmt = formatPrice(produto.preco * quantidade);
    
    let msg = `Olá! Gostaria de pedir o seguinte item:\n\n`;
    msg += `${quantidade}x ${produto.nome} - ${totalFmt}${obsText}`;
    msg += `\n\n(Pedido Rápido)`;
    
    const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(wa, "_blank");
}

// ===================================
// INICIALIZAÇÃO DA PÁGINA
// ===================================
document.addEventListener("DOMContentLoaded", (() => {
    let produto;
    try {
        const dataParam = new URLSearchParams(window.location.search).get("data");
        if (!dataParam) throw new Error("Nenhum dado de produto encontrado na URL.");
        
        produto = JSON.parse(decodeURIComponent(dataParam));
        produto.id = produto.id.toString(); 
        
        renderizarDetalhes(produto);
        
        document.title = `${produto.nome || "Detalhes"} - Eleven Store`;

        // Listener para "Adicionar ao Carrinho"
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
                
                btnAddCart.textContent = "✅ Adicionado!";
                btnAddCart.disabled = true;
                if (observacao) {
                    alert("Item adicionado com observação!");
                }
            }));
        }

        // Listener para "Pedir Agora"
        const btnPedidoRapido = document.getElementById("enviarPedidoDetalhe");
        if (btnPedidoRapido) {
            btnPedidoRapido.addEventListener("click", (() => handlePedidoRapido(produto)));
        }

    } catch (err) {
        console.error("Erro ao carregar detalhes do produto:", err);
        document.getElementById("detalheProdutoContainer").innerHTML = `<p class="erro">Não foi possível carregar os detalhes do produto. Por favor, tente novamente. ${err.message}</p>`;
    }
}));