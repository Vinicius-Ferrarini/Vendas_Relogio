// script.js (ATUALIZADO PARA ESCONDER SEÇÕES VAZIAS PÓS-FILTRO)

// ======= CONFIG =======
const SHEET_ID = "1gU34_gLsxTHDy_nxhtg91-Ld6VaU4Zba65dBkZD-2aQ";
const GID = 0;
const WHATSAPP_NUMBER = "5543999705837";
// ======================

let activeTimers = {};
let allProducts = new Map();
let dynamicCategories = new Map();
let currentSortOrder = 'default';

let mainElement, navElement, listaOfertasEl, secaoOfertasEl;
let filtroPesquisa, filtroCategoria, filtroGenero, filtroTipoContainer, precoMin, precoMax;
let btnLimparFiltros, btnSortAsc, btnSortDesc;

// ===================================
// FUNÇÕES AUXILIARES
// ===================================
function escapeHtml(str){ if(!str && str !== 0) return ""; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function vazioElemento(el){ while(el.firstChild) el.removeChild(el.firstChild); }
function formatPrice(price) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price || 0); }
function removerAcentos(str) { return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

// ===================================
// FUNÇÕES DO CARRINHO
// ===================================
function getCart() { return JSON.parse(localStorage.getItem('leandrinhoCart') || '[]'); }
function saveCart(cart) { localStorage.setItem('leandrinhoCart', JSON.stringify(cart)); }
function updateCartButtonText() {
  const btn = document.getElementById('enviarWhatsApp'); if (!btn) return;
  const cart = getCart();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  btn.textContent = totalItems > 0 ? `🟢 Ver Carrinho (${totalItems} ${totalItems > 1 ? 'itens' : 'item'})` : `🟢 Carrinho Vazio`;
}

// ===================================
// FUNÇÕES DO MODAL
// ===================================
function abrirModalCarrinho() { /* ... (código como antes) ... */
    const cart = getCart(); const modal = document.getElementById('modalCarrinho'); const modalBody = document.getElementById('listaCarrinhoModal'); const totalEl = document.getElementById('totalCarrinhoModal'); const enviarBtn = document.getElementById('enviarPedidoModal');
    vazioElemento(modalBody);
    if (cart.length === 0) { modalBody.innerHTML = '<p>Seu carrinho está vazio.</p>'; totalEl.textContent = 'Total: R$ 0,00'; enviarBtn.style.display = 'none'; document.getElementById('observacaoPedido').value = ''; }
    else { let total = 0; cart.forEach(item => { const itemEl = document.createElement('div'); itemEl.className = 'cart-item-modal'; itemEl.innerHTML = `<div class="cart-item-modal-info"><span class="nome">${escapeHtml(item.nome)}</span><span class="preco">${formatPrice(item.preco)}</span></div><div class="cart-item-modal-controls"><button class="qty-btn decrease-qty" data-id="${escapeHtml(item.id)}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button><span>${item.quantity}</span><button class="qty-btn increase-qty" data-id="${escapeHtml(item.id)}">+</button></div><button class="remover-item-btn" data-id="${escapeHtml(item.id)}">Remover</button>`; modalBody.appendChild(itemEl); total += item.preco * item.quantity; }); totalEl.textContent = `Total: ${formatPrice(total)}`; enviarBtn.style.display = 'block'; }
    modal.style.display = 'flex';
}
function fecharModalCarrinho() { document.getElementById('modalCarrinho').style.display = 'none'; }
function handleRemoverItem(productId) {
    let cart = getCart(); cart = cart.filter(item => item.id.toString() !== productId.toString()); saveCart(cart);
    abrirModalCarrinho(); updateCartButtonText();
    const cardBtns = document.querySelectorAll(`.btn-add-cart[data-id="${productId}"]`);
    cardBtns.forEach(btn => { if (btn) { btn.textContent = 'Adicionar ao Carrinho'; btn.disabled = false; } });
}
function increaseQuantity(productId) {
    let cart = getCart(); const itemIndex = cart.findIndex(item => item.id.toString() === productId.toString());
    if (itemIndex > -1) { cart[itemIndex].quantity++; saveCart(cart); abrirModalCarrinho(); updateCartButtonText(); }
}
function decreaseQuantity(productId) {
    let cart = getCart(); const itemIndex = cart.findIndex(item => item.id.toString() === productId.toString());
    if (itemIndex > -1 && cart[itemIndex].quantity > 1) { cart[itemIndex].quantity--; saveCart(cart); abrirModalCarrinho(); updateCartButtonText(); }
    else if (itemIndex > -1 && cart[itemIndex].quantity === 1) { handleRemoverItem(productId); }
}
function handleEnviarPedido() {
    const cart = getCart(); const observacao = document.getElementById('observacaoPedido').value.trim();
    if (cart.length === 0){ alert('Seu carrinho está vazio.'); return; }
    const lines = cart.map(item => { const itemTotal = formatPrice(item.preco * item.quantity); return `${item.quantity}x ${item.nome} (${formatPrice(item.preco)} cada) - ${itemTotal}`; });
    const subTotal = cart.reduce((sum, item) => sum + (item.preco * item.quantity), 0); const subTotalFmt = formatPrice(subTotal);
    let msg = `Olá! Gostaria de fazer o seguinte pedido:\n\n${lines.join('\n')}`; msg += `\n\n*Subtotal: ${subTotalFmt}*`;
    if (observacao) { msg += `\n\n*Observações:* ${observacao}`; }
    const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`; window.open(wa, '_blank');
    if (confirm("Pedido enviado! Deseja limpar o carrinho e as observações?")) { saveCart([]); document.getElementById('observacaoPedido').value = ''; updateCartButtonText(); document.querySelectorAll('.btn-add-cart:disabled').forEach(btn => { btn.textContent = 'Adicionar ao Carrinho'; btn.disabled = false; }); fecharModalCarrinho(); }
}

// ===================================
// LÓGICA DE CARREGAMENTO DA PLANILHA
// ===================================
async function fetchSheetJson(sheetId, gid = 0) { const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`; const res = await fetch(url); const txt = await res.text(); const start = txt.indexOf('('); const end = txt.lastIndexOf(')'); const jsonStr = txt.substring(start + 1, end); return JSON.parse(jsonStr); }
function mapRowToProduct(row, headers) {
    const obj = { images: [], ativo: true };
    headers.forEach((h, i) => { const cell = row[i]; const val = cell && cell.v !== undefined ? cell.v : ""; const header = (h || "").toString().trim().toLowerCase();
        if (header.match(/^id$/)) obj.id = val; else if (header.match(/nome|name|produto/)) obj.nome = val; else if (header.match(/pre[cç]o[ \-]?oferta/)) { if (typeof val === "number") { obj.precoOferta = val; } else { const cleaned = String(val).replace(/[R$\s.]/g, "").replace(",", "."); const n = parseFloat(cleaned); if (!isNaN(n) && n > 0) { obj.precoOferta = n; } } } else if (header.match(/pre[cç]o|price|valor/)) { if (typeof val === "number") { obj.preco = val; } else { const cleaned = String(val).replace(/[R$\s.]/g, "").replace(",", "."); const n = parseFloat(cleaned); obj.preco = isNaN(n) ? 0 : n; } } else if (header.match(/categoria|category/)) obj.categoria = val.toString().toLowerCase(); else if (header.match(/tipo|type/)) obj.tipo = val.toString().toLowerCase(); else if (header.match(/genero|gênero|genêro|sex|sexo/)) obj.genero = val.toString().toLowerCase(); else if (header.match(/destaque/)) obj.destaque = val; else if (header.match(/descricao|descri[cç][aã]o/)) obj.descricao = val; else if (header.match(/dataoferta/)) { if (cell && cell.f) obj.dataOferta = cell.f; else if (val && val.toString().includes('/')) obj.dataOferta = val.toString(); else obj.dataOferta = ""; } else if (header.match(/horaoferta/)) obj.horaOferta = val; else if (header.match(/^img\d?$|^imagem\d?$|^foto\d?$/)) { if (val) obj.images.push(val.toString()); } else if (header.match(/^ativo$/)) { obj.ativo = !(String(val).trim().toUpperCase() === 'N'); }
    });
    obj.nome = obj.nome || ""; obj.preco = obj.preco !== undefined ? obj.preco : 0; obj.categoria = obj.categoria || "outros"; obj.tipo = obj.tipo || ""; obj.genero = obj.genero || ""; obj.id = (obj.id || `${Date.now()}-${Math.random()}`).toString(); obj.oferta = (obj.destaque && obj.destaque !== "") || (obj.dataOferta && obj.dataOferta !== ""); if (obj.images.length === 0) { obj.images.push("https://via.placeholder.com/800x800?text=Sem+Imagem"); }
    if (obj.precoOferta !== undefined && obj.precoOferta < obj.preco) { obj.precoOriginal = obj.preco; obj.preco = obj.precoOferta; obj.oferta = true; }
    return obj;
}
function parseGvizResponse(resp) {
    const cols = resp.table.cols.map(c => c.label || c.id || ""); const rows = resp.table.rows || []; const produtos = rows.map(r => mapRowToProduct(r.c, cols)).filter(p => p.ativo);
    allProducts.clear(); dynamicCategories.clear();
    produtos.forEach(p => { allProducts.set(p.id, p); if (!dynamicCategories.has(p.categoria)) { dynamicCategories.set(p.categoria, { tipos: new Set(), generos: new Set(), containerId: `lista-${p.categoria}`, sectionId: `secao-${p.categoria}`, sectionEl: null, containerEl: null }); } const catData = dynamicCategories.get(p.categoria); if (p.tipo) catData.tipos.add(p.tipo); if (p.genero) catData.generos.add(p.genero); });
    return produtos;
}
function popularDropdown(selectElement, optionsSet, placeholder) {
    selectElement.innerHTML = `<option value="">${placeholder}</option>`; Array.from(optionsSet).sort().forEach(option => { const opt = document.createElement('option'); opt.value = option; opt.textContent = option.charAt(0).toUpperCase() + option.slice(1); selectElement.appendChild(opt); });
}
function criarCheckboxesTipo(containerElement, tiposSet) {
    vazioElemento(containerElement); const titleSpan = document.createElement('span'); titleSpan.className = 'checkboxes-title'; titleSpan.textContent = 'Tipos:'; containerElement.appendChild(titleSpan);
    Array.from(tiposSet).sort().forEach(tipo => { const label = document.createElement('label'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = tipo; checkbox.addEventListener('change', filtrarEExibirProdutos); label.appendChild(checkbox); label.appendChild(document.createTextNode(` ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`)); containerElement.appendChild(label); });
}
function criarSecoesCategorias() {
    vazioElemento(navElement); // Limpa menu antes de recriar
    const navOfertas = document.createElement('a'); navOfertas.href = "#secao-ofertas"; navOfertas.textContent = "Ofertas"; navElement.appendChild(navOfertas);
    const categoriasOrdenadas = Array.from(dynamicCategories.keys()).sort();
    for (const categoria of categoriasOrdenadas) {
        const catData = dynamicCategories.get(categoria);
        const sectionEl = document.createElement('div'); sectionEl.id = catData.sectionId; sectionEl.className = 'secao-categoria'; const titleEl = document.createElement('h2'); titleEl.className = 'titulo-secao'; titleEl.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1); const containerEl = document.createElement('div'); containerEl.className = 'container'; containerEl.id = catData.containerId; containerEl.innerHTML = `<div class="loading-message">Carregando ${categoria}...</div>`; sectionEl.appendChild(titleEl); sectionEl.appendChild(containerEl); mainElement.appendChild(sectionEl); catData.sectionEl = sectionEl; catData.containerEl = containerEl;
        const navLink = document.createElement('a'); navLink.href = `#${catData.sectionId}`; navLink.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1); navElement.appendChild(navLink);
    }
}

// ===================================
// RENDERIZAÇÃO DE CARDS E TIMERS
// ===================================
function criarCardHTML(p) {
    const placeholder = "https://via.placeholder.com/800x800?text=Sem+Imagem"; const images = p.images && p.images.length ? p.images : [placeholder]; const mainImg = images[0]; const thumbnails = images.slice(0, 4); const thumbsHTML = thumbnails.map(img => `<img src="${escapeHtml(img)}" alt="Miniatura" class="card-thumb" loading="lazy">`).join(''); const precoFmt = formatPrice(p.preco); const precoOriginalFmt = p.precoOriginal ? `<span class="preco-original">${formatPrice(p.precoOriginal)}</span>` : ''; const linkDetalhe = `detalhe.html?data=${encodeURIComponent(JSON.stringify(p))}`; const badgeHTML = p.destaque ? `<div class="card-badge">${escapeHtml(p.destaque)}</div>` : ''; const timerHTML = p.dataOferta ? `<div class="card-timer" id="timer-${p.id}"></div>` : '';
    const cart = getCart(); const isInCart = cart.find(item => item.id.toString() === p.id.toString()); const btnText = isInCart ? '✅ Já no carrinho' : 'Adicionar ao Carrinho'; const btnDisabled = isInCart ? 'disabled' : '';
    const template = document.createElement('div'); template.className = "card"; template.innerHTML = `${badgeHTML}${timerHTML}<div class="card-img-main"><a href="${linkDetalhe}"><img src="${escapeHtml(mainImg)}" alt="${escapeHtml(p.nome)}" loading="lazy" class="card-img-main-pic"></a></div><div class="card-img-thumbs">${thumbsHTML}</div><h3>${escapeHtml(p.nome)}</h3><p class="preco-container">${precoOriginalFmt}<span class="preco-atual">${precoFmt}</span></p><button class="btn-add-cart" data-id="${escapeHtml(p.id)}" ${btnDisabled}>${btnText}</button>`; return template;
}
function mostrarMensagemNoContainer(container, msg){ if (!container) return; vazioElemento(container); const div = document.createElement('div'); div.className = 'loading-message'; div.textContent = msg; container.appendChild(div); }
function clearTimers(containerId) { if (activeTimers[containerId]) { activeTimers[containerId].forEach(intervalId => clearInterval(intervalId)); } activeTimers[containerId] = []; }
function iniciarContadores(produtos, containerId) {
    clearTimers(containerId); produtos.forEach(p => { if (!p.dataOferta) return; const timerEl = document.getElementById(`timer-${p.id}`); if (!timerEl) return; const [dia, mes, anoStr] = p.dataOferta.split('/'); if (!dia || !mes || !anoStr) { console.warn(`Data de oferta inválida para ${p.nome}: ${p.dataOferta}`); return; } const hora = p.horaOferta ? parseInt(p.horaOferta, 10) : 23; const minutos = p.horaOferta ? 0 : 59; const segundos = p.horaOferta ? 0 : 59; let anoNum = parseInt(anoStr, 10); if (anoStr.length === 2) anoNum += 2000; const targetDate = new Date(anoNum, mes - 1, dia, hora, minutos, segundos); const intervalId = setInterval(() => { const agora = new Date().getTime(); const diff = targetDate.getTime() - agora; if (diff <= 0) { clearInterval(intervalId); timerEl.style.display = 'none'; return; } const d = Math.floor(diff / (1000 * 60 * 60 * 24)); const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)); const s = Math.floor((diff % (1000 * 60)) / 1000); timerEl.innerHTML = `${d}d ${h}h ${m}m ${s}s`; }, 1000); if (!activeTimers[containerId]) activeTimers[containerId] = []; activeTimers[containerId].push(intervalId); });
}
function criarCardsEAdicionar(container, produtos){
    if (!container) return; vazioElemento(container);
    if(!produtos || produtos.length === 0){ mostrarMensagemNoContainer(container, 'Nenhum produto encontrado.'); return; }
    produtos.forEach(p => { const card = criarCardHTML(p); container.appendChild(card); });
    iniciarContadores(produtos, container.id);
}
function filtrarLista(produtos, { categoria = '', genero = '', tipos = [], precoMin = 0, precoMax = Infinity, searchTerm = '' } = {}){
    const termoBuscaLower = removerAcentos(searchTerm.toLowerCase());
    return produtos.filter(p => {
        if(categoria && p.categoria !== categoria) return false;
        if(genero && String(p.genero || '').toLowerCase() !== String(genero || '').toLowerCase()) return false;
        if(tipos.length > 0 && !tipos.includes(String(p.tipo || '').toLowerCase())) return false;
        const preco = Number(p.preco || 0);
        if(!isNaN(precoMin) && preco < precoMin) return false;
        if(!isNaN(precoMax) && preco > precoMax) return false;
        if(termoBuscaLower) { const nomeProdutoLower = removerAcentos(p.nome.toLowerCase()); if (!nomeProdutoLower.includes(termoBuscaLower)) { return false; } }
        return true;
    });
}
function adicionarClickHandlerMiniaturas(e) { if (e.target.classList.contains('card-thumb')) { e.preventDefault(); const card = e.target.closest('.card'); if (card) { const mainImg = card.querySelector('.card-img-main-pic'); if (mainImg) mainImg.src = e.target.src; } } }
function handleAddToCartClick(e) {
    if (!e.target.classList.contains('btn-add-cart')) return;
    const btnClicked = e.target; const productId = btnClicked.dataset.id; const product = allProducts.get(productId);
    if (!product) return;
    let cart = getCart(); const existingItemIndex = cart.findIndex(item => item.id === product.id);
    if (existingItemIndex > -1) { cart[existingItemIndex].quantity++; }
    else { cart.push({ id: product.id, nome: product.nome, preco: product.preco, quantity: 1 }); }
    saveCart(cart); updateCartButtonText();
    const cardBtns = document.querySelectorAll(`.btn-add-cart[data-id="${productId}"]`);
    cardBtns.forEach(button => { if (button) { button.textContent = '✅ Já no carrinho'; button.disabled = true; } });
}

// ===================================
// FUNÇÃO PRINCIPAL DE FILTRAGEM E EXIBIÇÃO
// ===================================
function filtrarEExibirProdutos() {
    console.log("Filtrando...");
    const categoriaSelecionada = filtroCategoria.value;
    const generoSelecionado = filtroGenero.value;
    const precoMinValor = precoMin.value ? Number(precoMin.value) : 0;
    const precoMaxValor = precoMax.value ? Number(precoMax.value) : Infinity;
    const termoPesquisa = filtroPesquisa.value.trim();
    const tiposSelecionados = [];
    const checkboxesTipo = filtroTipoContainer.querySelectorAll('input[type="checkbox"]:checked');
    checkboxesTipo.forEach(cb => tiposSelecionados.push(cb.value));

    const filtros = { categoria: categoriaSelecionada, genero: generoSelecionado, tipos: tiposSelecionados, precoMin: precoMinValor, precoMax: precoMaxValor, searchTerm: termoPesquisa };
    const produtosAtivos = Array.from(allProducts.values());
    const produtosFiltrados = filtrarLista(produtosAtivos, filtros);

    // --- LÓGICA ATUALIZADA PARA ESCONDER SEÇÕES VAZIAS ---
    let algumaOfertaVisivel = false;
    let categoriasComProdutos = new Set(); // Guarda as categorias que TEM produtos após o filtro

    // Verifica ofertas
    const ofertasFiltradas = produtosFiltrados.filter(p => p.oferta);
    if (ofertasFiltradas.length > 0) {
        algumaOfertaVisivel = true;
        secaoOfertasEl.style.display = 'block';
        // Ordena e renderiza ofertas
        if (currentSortOrder === 'priceAsc') ofertasFiltradas.sort((a, b) => a.preco - b.preco);
        else if (currentSortOrder === 'priceDesc') ofertasFiltradas.sort((a, b) => b.preco - a.preco);
        criarCardsEAdicionar(listaOfertasEl, ofertasFiltradas);
    } else {
        secaoOfertasEl.style.display = 'none'; // Esconde seção de ofertas
    }

    // Verifica categorias dinâmicas
    for (const [categoria, catData] of dynamicCategories.entries()) {
        const produtosDaCategoriaFiltrados = produtosFiltrados.filter(p => p.categoria === categoria);

        // Esconde/Mostra baseado se a categoria principal foi selecionada OU se tem produtos
        const mostrarSecao = (!filtros.categoria || categoria === filtros.categoria);

        if (mostrarSecao && produtosDaCategoriaFiltrados.length > 0) {
            catData.sectionEl.style.display = 'block'; // Mostra seção
            categoriasComProdutos.add(categoria); // Marca que esta categoria tem produtos
            // Ordena e renderiza
            if (currentSortOrder === 'priceAsc') produtosDaCategoriaFiltrados.sort((a, b) => a.preco - b.preco);
            else if (currentSortOrder === 'priceDesc') produtosDaCategoriaFiltrados.sort((a, b) => b.preco - a.preco);
            criarCardsEAdicionar(catData.containerEl, produtosDaCategoriaFiltrados);
        } else {
            catData.sectionEl.style.display = 'none'; // Esconde seção
        }
    }
    // --- FIM DA LÓGICA ---


    // Atualiza botões de ordenação
    document.getElementById('sortAsc').classList.toggle('active', currentSortOrder === 'priceAsc');
    document.getElementById('sortDesc').classList.toggle('active', currentSortOrder === 'priceDesc');
}


// ===================================
// FUNÇÃO PRINCIPAL (INICIALIZAÇÃO)
// ===================================
async function loadAndRender(){
    mostrarMensagemNoContainer(listaOfertasEl, "Carregando produtos...");
    vazioElemento(navElement);
    Array.from(mainElement.querySelectorAll('.secao-categoria')).forEach(el => el.remove());

    let produtos = [];

    try{
        const resp = await fetchSheetJson(SHEET_ID, GID); produtos = parseGvizResponse(resp); console.log('Dados carregados (gviz):', produtos.length, 'produtos ativos');
    }catch(err){
        console.warn('Falha ao carregar via gviz, tentando fallback opensheet:', err);
        try{
            const opensheetUrl = `https://opensheet.elk.sh/${SHEET_ID}/Página1`; const r = await fetch(opensheetUrl); if (!r.ok) throw new Error(`OpenSheet falhou com status ${r.status}`); const arr = await r.json();
            const todosProdutosFallback = arr.map(obj => { const headers = Object.keys(obj); const row = headers.map(h => ({ v: obj[h] })); return mapRowToProduct(row, headers); });
            produtos = todosProdutosFallback.filter(p => p.ativo);
            allProducts.clear(); dynamicCategories.clear();
            produtos.forEach(p => { allProducts.set(p.id, p); if (!dynamicCategories.has(p.categoria)) { dynamicCategories.set(p.categoria, { tipos: new Set(), generos: new Set(), containerId: `lista-${p.categoria}`, sectionId: `secao-${p.categoria}`, sectionEl: null, containerEl: null }); } const catData = dynamicCategories.get(p.categoria); if (p.tipo) catData.tipos.add(p.tipo); if (p.genero) catData.generos.add(p.genero); });
            console.log('Dados carregados (opensheet):', produtos.length, 'produtos ativos');
        }catch(err2){
            console.error('Erro ao carregar planilha pelo fallback:', err2);
            mostrarMensagemNoContainer(listaOfertasEl, 'Erro ao carregar produtos. Verifique o console.');
            criarSecoesCategorias(); // Cria seções vazias para mostrar erro
            for(const catData of dynamicCategories.values()){ if(catData.containerEl) mostrarMensagemNoContainer(catData.containerEl, 'Erro ao carregar produtos.'); }
            return;
        }
    }

    // RENDERIZAÇÃO PÓS-CARREGAMENTO
    criarSecoesCategorias(); // Cria seções e menu
    popularDropdown(filtroCategoria, dynamicCategories.keys(), "Todas as Categorias");
    filtrarEExibirProdutos(); // Renderiza tudo
    updateCartButtonText();

    // LISTENERS
    filtroPesquisa.addEventListener('input', filtrarEExibirProdutos);
    filtroCategoria.addEventListener('change', (e) => {
        const categoria = e.target.value; filtroGenero.value = ""; filtroGenero.style.display = 'none'; vazioElemento(filtroTipoContainer); filtroTipoContainer.style.display = 'none';
        if (categoria) { const catData = dynamicCategories.get(categoria); if (catData) { if (catData.generos.size > 0) { popularDropdown(filtroGenero, catData.generos, "Todos os Gêneros"); filtroGenero.style.display = 'block'; } if (catData.tipos.size > 0) { criarCheckboxesTipo(filtroTipoContainer, catData.tipos); filtroTipoContainer.style.display = 'flex'; } } }
        filtrarEExibirProdutos();
    });
    filtroGenero.addEventListener('change', filtrarEExibirProdutos);
    precoMin.addEventListener('input', filtrarEExibirProdutos);
    precoMax.addEventListener('input', filtrarEExibirProdutos);
    btnSortAsc.addEventListener('click', () => { currentSortOrder = 'priceAsc'; filtrarEExibirProdutos(); });
    btnSortDesc.addEventListener('click', () => { currentSortOrder = 'priceDesc'; filtrarEExibirProdutos(); });
    btnLimparFiltros.addEventListener('click', () => {
        filtroPesquisa.value = ""; filtroCategoria.value = ""; filtroGenero.value = ""; vazioElemento(filtroTipoContainer); precoMin.value = ""; precoMax.value = ""; filtroGenero.style.display = 'none'; filtroTipoContainer.style.display = 'none'; currentSortOrder = 'default';
        filtrarEExibirProdutos(); // Re-exibe tudo
    });
    mainElement.addEventListener('click', (e) => { adicionarClickHandlerMiniaturas(e); handleAddToCartClick(e); });
    const btnWhats = document.getElementById('enviarWhatsApp'); btnWhats.addEventListener('click', () => { if (getCart().length === 0) { alert('Seu carrinho está vazio.'); return; } abrirModalCarrinho(); });
    document.getElementById('fecharModal').addEventListener('click', fecharModalCarrinho);
    document.getElementById('modalCarrinho').addEventListener('click', (e) => { if (e.target.classList.contains('modal-overlay')) { fecharModalCarrinho(); } });
    document.getElementById('listaCarrinhoModal').addEventListener('click', (e) => {
        const target = e.target; const productId = target.dataset.id; if (!productId) return;
        if (target.classList.contains('remover-item-btn')) { handleRemoverItem(productId); }
        else if (target.classList.contains('increase-qty')) { increaseQuantity(productId); }
        else if (target.classList.contains('decrease-qty')) { decreaseQuantity(productId); }
    });
    document.getElementById('enviarPedidoModal').addEventListener('click', handleEnviarPedido);
}

// Inicializa tudo
document.addEventListener('DOMContentLoaded', () => {
    mainElement = document.querySelector('main');
    navElement = document.getElementById('menuNavegacao');
    listaOfertasEl = document.getElementById('listaOfertas');
    secaoOfertasEl = document.getElementById('secao-ofertas');
    filtroPesquisa = document.getElementById('filtroPesquisa');
    filtroCategoria = document.getElementById('filtroCategoria');
    filtroGenero = document.getElementById('filtroGenero');
    filtroTipoContainer = document.getElementById('filtroTipoContainer');
    precoMin = document.getElementById('precoMin');
    precoMax = document.getElementById('precoMax');
    btnLimparFiltros = document.getElementById('limparFiltros');
    btnSortAsc = document.getElementById('sortAsc');
    btnSortDesc = document.getElementById('sortDesc');

    loadAndRender().catch(e => {
        console.error('Erro na inicialização:', e);
        mostrarMensagemNoContainer(listaOfertasEl, 'Erro grave na inicialização. Verifique o console.');
        if (dynamicCategories.size > 0) { for(const catData of dynamicCategories.values()){ if(catData.containerEl) mostrarMensagemNoContainer(catData.containerEl, 'Erro ao carregar produtos.'); } }
        else { mainElement.innerHTML = '<div class="loading-message">Erro grave ao carregar. Verifique o console.</div>'; }
    });
});