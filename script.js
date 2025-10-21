// script.js (COMPLETAMENTE NOVO)

// ======= CONFIG =======
const SHEET_ID = "1gU34_gLsxTHDy_nxhtg91-Ld6VaU4Zba65dBkZD-2aQ";
const GID = 0; 
const WHATSAPP_NUMBER = "5543999705837";
// ======================

let activeTimers = {};
let allProducts = new Map();

/**
 * --- NOVO: Armazenamento de dados dinâmicos ---
 * Estrutura: Map<string, { tipos: Set<string>, generos: Set<string>, containerId: string, sectionEl: HTMLElement }>
 * Ex: "relogio" -> { tipos: Set("classico"), generos: Set("masculino"), containerId: "lista-relogio", sectionEl: <div id="secao-relogio">... }
 */
let dynamicCategories = new Map();


// ===================================
// FUNÇÕES DO CARRINHO (Sem alterações)
// ===================================
function getCart() {
  return JSON.parse(localStorage.getItem('leandrinhoCart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('leandrinhoCart', JSON.stringify(cart));
}

function updateCartButtonText() {
  const btn = document.getElementById('enviarWhatsApp');
  if (!btn) return;
  const cart = getCart();
  if (cart.length > 0) {
    btn.textContent = `🟢 Ver Carrinho (${cart.length} ${cart.length > 1 ? 'itens' : 'item'})`;
  } else {
    btn.textContent = `🟢 Carrinho Vazio`;
  }
}

// ===================================
// FUNÇÕES DO MODAL (Sem alterações)
// ===================================
function formatPrice(price) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price || 0);
}

function abrirModalCarrinho() {
  const cart = getCart();
  const modal = document.getElementById('modalCarrinho');
  const modalBody = document.getElementById('listaCarrinhoModal');
  const totalEl = document.getElementById('totalCarrinhoModal');
  const enviarBtn = document.getElementById('enviarPedidoModal');
  
  vazioElemento(modalBody);
  
  if (cart.length === 0) {
    modalBody.innerHTML = '<p>Seu carrinho está vazio.</p>';
    totalEl.textContent = 'Total: R$ 0,00';
    enviarBtn.style.display = 'none';
  } else {
    let total = 0;
    cart.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item-modal';
      itemEl.innerHTML = `
        <div class="cart-item-modal-info">
          <span class="nome">${escapeHtml(item.nome)}</span>
          <span class="preco">${formatPrice(item.preco)}</span>
        </div>
        <button class="remover-item-btn" data-id="${escapeHtml(item.id)}">Remover</button>
      `;
      modalBody.appendChild(itemEl);
      total += item.preco;
    });
    totalEl.textContent = `Total: ${formatPrice(total)}`;
    enviarBtn.style.display = 'block';
  }
  modal.style.display = 'flex';
}

function fecharModalCarrinho() {
  document.getElementById('modalCarrinho').style.display = 'none';
}

function handleRemoverItem(productId) {
  let cart = getCart();
  cart = cart.filter(item => item.id.toString() !== productId.toString());
  saveCart(cart);
  
  abrirModalCarrinho();
  updateCartButtonText();
  
  const cardBtn = document.querySelector(`.btn-add-cart[data-id="${productId}"]`);
  if (cardBtn) {
    cardBtn.textContent = 'Adicionar ao Carrinho';
    cardBtn.disabled = false;
  }
}

function handleEnviarPedido() {
  const cart = getCart();
  if (cart.length === 0){
    alert('Seu carrinho está vazio.');
    return;
  }
  const lines = cart.map(p => `${p.nome} - ${formatPrice(p.preco)}`);
  const msg = `Olá! Gostaria de comprar os seguintes itens:\n${lines.join('\n')}`;
  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(wa, '_blank');
  
  if (confirm("Pedido enviado! Deseja limpar o carrinho?")) {
    saveCart([]); 
    updateCartButtonText(); 
    document.querySelectorAll('.btn-add-cart:disabled').forEach(btn => {
      btn.textContent = 'Adicionar ao Carrinho';
      btn.disabled = false;
    });
    fecharModalCarrinho(); 
  }
}

// ===================================
// LÓGICA DE CARREGAMENTO DA PLANILHA
// ===================================

async function fetchSheetJson(sheetId, gid = 0) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
  const res = await fetch(url);
  const txt = await res.text();
  const start = txt.indexOf('(');
  const end = txt.lastIndexOf(')');
  const jsonStr = txt.substring(start + 1, end);
  return JSON.parse(jsonStr);
}

/**
 * --- ATUALIZADO (REQ 1) ---
 * Mapeia colunas da planilha para um objeto de produto.
 * Agora 'Categoria' é a principal (relogio, fone) e 'Tipo' é a sub-categoria (classico, bluethon)
 */
function mapRowToProduct(row, headers) {
  const obj = { images: [] };
  
  headers.forEach((h, i) => {
    const cell = row[i];
    const val = cell && cell.v !== undefined ? cell.v : "";
    const header = (h || "").toString().trim().toLowerCase();

    if (header.match(/^id$/)) obj.id = val;
    else if (header.match(/nome|name|produto/)) obj.nome = val;
    else if (header.match(/pre[cç]o[ \-]?oferta/)) { 
      if (typeof val === "number") {
        obj.precoOferta = val;
      } else {
        const cleaned = String(val).replace(/[R$\s.]/g, "").replace(",", ".");
        const n = parseFloat(cleaned);
        if (!isNaN(n) && n > 0) { 
          obj.precoOferta = n;
        }
      }
    }
    else if (header.match(/pre[cç]o|price|valor/)) {
      if (typeof val === "number") obj.preco = val;
      else {
        const cleaned = String(val).replace(/[R$\s.]/g, "").replace(",", ".");
        const n = parseFloat(cleaned);
        obj.preco = isNaN(n) ? 0 : n;
      }
    }
    
    // --- LÓGICA DE CATEGORIA ATUALIZADA ---
    else if (header.match(/categoria|category/)) obj.categoria = val.toString().toLowerCase(); // relogio, fone
    else if (header.match(/tipo|type/)) obj.tipo = val.toString().toLowerCase(); // classico, bluethon
    // --- FIM DA LÓGICA ---
    
    else if (header.match(/genero|gênero|genêro|sex|sexo/)) obj.genero = val.toString().toLowerCase(); 
    else if (header.match(/destaque/)) obj.destaque = val;
    else if (header.match(/descricao|descri[cç][aã]o/)) obj.descricao = val;
    else if (header.match(/dataoferta/)) {
      if (cell && cell.f) obj.dataOferta = cell.f; 
      else if (val && val.toString().includes('/')) obj.dataOferta = val.toString();
      else obj.dataOferta = "";
    }
    else if (header.match(/horaoferta/)) obj.horaOferta = val;
    else if (header.match(/^img\d?$|^imagem\d?$|^foto\d?$/)) { 
      if (val) obj.images.push(val.toString());
    }
  });

  // Normalização
  obj.nome = obj.nome || "";
  obj.preco = obj.preco !== undefined ? obj.preco : 0;
  obj.categoria = obj.categoria || "outros"; // Categoria principal
  obj.tipo = obj.tipo || ""; // Sub-categoria
  obj.genero = obj.genero || "";
  obj.id = (obj.id || `${Date.now()}-${Math.random()}`).toString(); 
  obj.oferta = (obj.destaque && obj.destaque !== "") || (obj.dataOferta && obj.dataOferta !== "");
  if (obj.images.length === 0) {
    obj.images.push("https://via.placeholder.com/800x800?text=Sem+Imagem");
  }
  
  if (obj.precoOferta !== undefined && obj.precoOferta < obj.preco) {
    obj.precoOriginal = obj.preco; 
    obj.preco = obj.precoOferta;   
    obj.oferta = true; 
  }

  return obj;
}


function parseGvizResponse(resp) {
  const cols = resp.table.cols.map(c => c.label || c.id || "");
  const rows = resp.table.rows || [];
  const produtos = rows.map(r => mapRowToProduct(r.c, cols));
  
  // Popula o mapa global de produtos e o mapa de categorias
  produtos.forEach(p => {
    allProducts.set(p.id, p);
    
    // Se a categoria (relogio, fone) não existe no mapa, crie-a
    if (!dynamicCategories.has(p.categoria)) {
      dynamicCategories.set(p.categoria, {
        tipos: new Set(),
        generos: new Set(),
        containerId: `lista-${p.categoria}`, // ex: lista-relogio
        sectionId: `secao-${p.categoria}`,   // ex: secao-relogio
        sectionEl: null, // O elemento HTML (será criado depois)
        containerEl: null // O elemento HTML (será criado depois)
      });
    }
    
    // Adiciona os tipos e gêneros encontrados para essa categoria
    const catData = dynamicCategories.get(p.categoria);
    if (p.tipo) catData.tipos.add(p.tipo);
    if (p.genero) catData.generos.add(p.genero);
  });
  return produtos;
}

/**
 * --- NOVA FUNÇÃO ---
 * Popula um dropdown (select) com as opções de um Set.
 */
function popularDropdown(selectElement, optionsSet, placeholder) {
  selectElement.innerHTML = `<option value="">${placeholder}</option>`; // Limpa
  Array.from(optionsSet).sort().forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option.charAt(0).toUpperCase() + option.slice(1);
    selectElement.appendChild(opt);
  });
}

/**
 * --- NOVA FUNÇÃO ---
 * Cria dinamicamente as seções de categoria no <main>
 */
function criarSecoesCategorias(mainElement, navElement) {
  // 1. Adiciona "Ofertas" ao menu (seção fixa)
  const navOfertas = document.createElement('a');
  navOfertas.href = "#secao-ofertas";
  navOfertas.textContent = "Ofertas";
  navElement.appendChild(navOfertas);

  // 2. Ordena as categorias alfabeticamente
  const categoriasOrdenadas = Array.from(dynamicCategories.keys()).sort();
  
  // 3. Cria a seção e o link de menu para cada categoria
  for (const categoria of categoriasOrdenadas) {
    const catData = dynamicCategories.get(categoria);
    const nomeCategoria = categoria.charAt(0).toUpperCase() + categoria.slice(1);
    
    // Cria o link do menu
    const navLink = document.createElement('a');
    navLink.href = `#${catData.sectionId}`;
    navLink.textContent = nomeCategoria;
    navElement.appendChild(navLink);
    
    // Cria a seção na página
    const sectionEl = document.createElement('div');
    sectionEl.id = catData.sectionId;
    sectionEl.className = 'secao-categoria';
    
    // Cria o título
    const titleEl = document.createElement('h2');
    titleEl.className = 'titulo-secao';
    titleEl.textContent = nomeCategoria;
    
    // Cria o container dos produtos
    const containerEl = document.createElement('div');
    containerEl.className = 'container';
    containerEl.id = catData.containerId;
    
    // Monta a seção
    sectionEl.appendChild(titleEl);
    sectionEl.appendChild(containerEl);
    
    // Adiciona na página
    mainElement.appendChild(sectionEl);
    
    // Salva os elementos criados no mapa para referência futura
    catData.sectionEl = sectionEl;
    catData.containerEl = containerEl;
  }
}


// ===================================
// RENDERIZAÇÃO DE CARDS E TIMERS
// ===================================

function criarCardHTML(p) {
  const placeholder = "https://via.placeholder.com/800x800?text=Sem+Imagem";
  const images = p.images && p.images.length ? p.images : [placeholder];
  const mainImg = images[0];
  
  const thumbnails = images.slice(0, 4); 
  const thumbsHTML = thumbnails
    .map(img => `<img src="${escapeHtml(img)}" alt="Miniatura" class="card-thumb" loading="lazy">`)
    .join('');

  const precoFmt = formatPrice(p.preco); 
  const precoOriginalFmt = p.precoOriginal
    ? `<span class="preco-original">${formatPrice(p.precoOriginal)}</span>`
    : '';

  const linkDetalhe = `detalhe.html?data=${encodeURIComponent(JSON.stringify(p))}`;
  const badgeHTML = p.destaque ? `<div class="card-badge">${escapeHtml(p.destaque)}</div>` : '';
  const timerHTML = p.dataOferta ? `<div class="card-timer" id="timer-${p.id}"></div>` : '';

  const cart = getCart();
  const isInCart = cart.find(item => item.id.toString() === p.id.toString());
  const btnText = isInCart ? '✅ Já no carrinho' : 'Adicionar ao Carrinho';
  const btnDisabled = isInCart ? 'disabled' : '';

  const template = document.createElement('div');
  template.className = "card";
  template.innerHTML = `
    ${badgeHTML}
    ${timerHTML}
    <div class="card-img-main">
      <a href="${linkDetalhe}">
        <img src="${escapeHtml(mainImg)}" alt="${escapeHtml(p.nome)}" loading="lazy" class="card-img-main-pic">
      </a>
    </div>
    <div class="card-img-thumbs">${thumbsHTML}</div>
    <h3>${escapeHtml(p.nome)}</h3>
    <p class="preco-container">
      ${precoOriginalFmt}
      <span class="preco-atual">${precoFmt}</span>
    </p>
    <button class="btn-add-cart" data-id="${escapeHtml(p.id)}" ${btnDisabled}>
      ${btnText}
    </button>
  `;
  return template;
}

function escapeHtml(str){
  if(!str && str !== 0) return "";
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function vazioElemento(el){
  while(el.firstChild) el.removeChild(el.firstChild);
}

function mostrarMensagemNoContainer(container, msg){
  vazioElemento(container);
  const div = document.createElement('div');
  div.style.padding = '18px';
  div.style.textAlign = 'center';
  div.style.color = '#6b7280';
  div.textContent = msg;
  container.appendChild(div);
}

function clearTimers(containerId) {
  if (activeTimers[containerId]) {
    activeTimers[containerId].forEach(intervalId => clearInterval(intervalId));
  }
  activeTimers[containerId] = [];
}

function iniciarContadores(produtos, containerId) {
  // Limpa timers antigos desse container
  clearTimers(containerId);
  
  produtos.forEach(p => {
    if (!p.dataOferta) return; 
    const timerEl = document.getElementById(`timer-${p.id}`);
    if (!timerEl) return; 

    const [dia, mes, anoStr] = p.dataOferta.split('/');
    if (!dia || !mes || !anoStr) {
      console.warn(`Data de oferta inválida para ${p.nome}: ${p.dataOferta}`);
      return;
    }

    const hora = p.horaOferta ? parseInt(p.horaOferta, 10) : 23; 
    const minutos = p.horaOferta ? 0 : 59; 
    const segundos = p.horaOferta ? 0 : 59; 
    
    let anoNum = parseInt(anoStr, 10);
    if (anoStr.length === 2) anoNum += 2000;
    
    const targetDate = new Date(anoNum, mes - 1, dia, hora, minutos, segundos);
    
    const intervalId = setInterval(() => {
      const agora = new Date().getTime();
      const diff = targetDate.getTime() - agora;

      if (diff <= 0) {
        clearInterval(intervalId);
        timerEl.style.display = 'none'; 
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      timerEl.innerHTML = `${d}d ${h}h ${m}m ${s}s`;
    }, 1000);
    
    // Armazena o ID do timer por container
    if (!activeTimers[containerId]) activeTimers[containerId] = [];
    activeTimers[containerId].push(intervalId);
  });
}

function criarCardsEAdicionar(container, produtos){
  vazioElemento(container);
  if(!produtos || produtos.length === 0){
    mostrarMensagemNoContainer(container, 'Nenhum produto encontrado.');
    return;
  }
  
  produtos.forEach(p => {
    const card = criarCardHTML(p);
    container.appendChild(card);
  });
  
  // Inicia os contadores para este container específico
  iniciarContadores(produtos, container.id);
}

/**
 * --- ATUALIZADO (REQ 1) ---
 * Filtra a lista com base nos novos filtros unificados
 */
function filtrarLista(produtos, { categoria = '', genero = '', tipo = '', precoMin = 0, precoMax = Infinity } = {}){
  return produtos.filter(p => {
    // Filtra por Categoria Principal (relogio, fone)
    if(categoria && p.categoria !== categoria) return false;
    
    // Filtra por Gênero
    if(genero && String(p.genero || '').toLowerCase() !== String(genero || '').toLowerCase()) return false;
    
    // Filtra por Tipo (classico, bluethon)
    if(tipo && String(p.tipo || '').toLowerCase() !== String(tipo || '').toLowerCase()) return false;
    
    // Filtra por Preço
    const preco = Number(p.preco || 0);
    if(!isNaN(precoMin) && preco < precoMin) return false;
    if(!isNaN(precoMax) && preco > precoMax) return false;
    
    return true;
  });
}


function adicionarClickHandlerMiniaturas(container) {
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('card-thumb')) {
      e.preventDefault(); 
      const card = e.target.closest('.card');
      if (card) {
        const mainImg = card.querySelector('.card-img-main-pic');
        if (mainImg) mainImg.src = e.target.src;
      }
    }
  });
}

function handleAddToCartClick(e) {
  if (!e.target.classList.contains('btn-add-cart')) return;
  
  const btn = e.target;
  const productId = btn.dataset.id;
  const product = allProducts.get(productId);
  
  if (!product) return;

  const cart = getCart();
  if (cart.find(p => p.id === product.id)) return;
  
  cart.push({ id: product.id, nome: product.nome, preco: product.preco });
  saveCart(cart);
  updateCartButtonText();
  
  btn.textContent = '✅ Adicionado!';
  btn.disabled = true;
}

// ===================================
// FUNÇÃO PRINCIPAL (INICIALIZAÇÃO)
// ===================================

async function loadAndRender(){
  // Elementos principais
  const mainElement = document.querySelector('main');
  const navElement = document.getElementById('menuNavegacao');
  const listaOfertasEl = document.getElementById('listaOfertas');
  const secaoOfertasEl = document.getElementById('secao-ofertas');
  
  // Seletores de Filtro
  const filtroCategoria = document.getElementById('filtroCategoria');
  const filtroGenero = document.getElementById('filtroGenero');
  const filtroTipo = document.getElementById('filtroTipo');
  const precoMin = document.getElementById('precoMin');
  const precoMax = document.getElementById('precoMax');
  const btnFiltrar = document.getElementById('filtrarAgora');
  const btnLimparFiltros = document.getElementById('limparFiltros');
  
  let produtos = []; // Array com TODOS os produtos

  try{
    const resp = await fetchSheetJson(SHEET_ID, GID);
    produtos = parseGvizResponse(resp); // Já popula allProducts e dynamicCategories
    console.log('Dados carregados (gviz):', produtos.length, 'produtos');
  }catch(err){
    console.warn('Falha ao carregar via gviz, tentando fallback opensheet:', err);
    try{
      const opensheetUrl = `https://opensheet.elk.sh/${SHEET_ID}/Página1`; 
      const r = await fetch(opensheetUrl);
      if (!r.ok) throw new Error(`OpenSheet falhou com status ${r.status}`);
      const arr = await r.json();
      
      produtos = arr.map(obj => {
        const headers = Object.keys(obj);
        const row = headers.map(h => ({ v: obj[h] }));
        return mapRowToProduct(row, headers);
      });
      // Popula allProducts e dynamicCategories no fallback
      produtos.forEach(p => {
        allProducts.set(p.id, p);
        if (!dynamicCategories.has(p.categoria)) {
          dynamicCategories.set(p.categoria, {
            tipos: new Set(),
            generos: new Set(),
            containerId: `lista-${p.categoria}`,
            sectionId: `secao-${p.categoria}`,
            sectionEl: null,
            containerEl: null
          });
        }
        const catData = dynamicCategories.get(p.categoria);
        if (p.tipo) catData.tipos.add(p.tipo);
        if (p.genero) catData.generos.add(p.genero);
      });
      console.log('Dados carregados (opensheet):', produtos.length, 'produtos');
    }catch(err2){
      console.error('Erro ao carregar planilha pelo fallback:', err2);
      mostrarMensagemNoContainer(listaOfertasEl, 'Erro ao carregar produtos. Verifique o console.');
      return;
    }
  }

  // --- RENDERIZAÇÃO INICIAL DINÂMICA ---
  
  // 1. Cria as Seções e o Menu de Navegação
  criarSecoesCategorias(mainElement, navElement);
  
  // 2. Popula o filtro principal de Categorias
  popularDropdown(filtroCategoria, dynamicCategories.keys(), "Todas as Categorias");

  // 3. Renderização Inicial (mostrar tudo em suas devidas seções)
  criarCardsEAdicionar(listaOfertasEl, produtos.filter(p => p.oferta));
  
  for (const [categoria, catData] of dynamicCategories.entries()) {
    const produtosDaCategoria = produtos.filter(p => p.categoria === categoria);
    criarCardsEAdicionar(catData.containerEl, produtosDaCategoria);
  }
  
  updateCartButtonText(); // Atualiza botão do carrinho

  // --- NOVA LÓGICA DE FILTROS ---

  // 1. Listener para Categoria Principal (mostrar/esconder filtros)
  filtroCategoria.addEventListener('change', (e) => {
    const categoria = e.target.value;
    
    // Reseta os filtros secundários
    filtroGenero.value = "";
    filtroTipo.value = "";
    
    // Esconde todos por padrão
    filtroGenero.style.display = 'none';
    filtroTipo.style.display = 'none';

    if (categoria) {
      const catData = dynamicCategories.get(categoria);
      if (catData) {
        // Mostra/Popula Gênero (se houver)
        if (catData.generos.size > 0) {
          popularDropdown(filtroGenero, catData.generos, "Todos os Gêneros");
          filtroGenero.style.display = 'block';
        }
        // Mostra/Popula Tipo (se houver)
        if (catData.tipos.size > 0) {
          popularDropdown(filtroTipo, catData.tipos, "Todos os Tipos");
          filtroTipo.style.display = 'block';
        }
      }
    }
  });

  // 2. Listener para o botão "Aplicar Filtros"
  btnFiltrar.addEventListener('click', () => {
    const filtros = {
      categoria: filtroCategoria.value,
      genero: filtroGenero.value,
      tipo: filtroTipo.value,
      precoMin: precoMin.value ? Number(precoMin.value) : 0,
      precoMax: precoMax.value ? Number(precoMax.value) : Infinity,
    };

    // Filtra a lista completa de produtos
    const produtosFiltrados = filtrarLista(produtos, filtros);
    
    // Mostra/Esconde as seções com base na categoria principal
    secaoOfertasEl.style.display = 'block'; // Sempre mostra ofertas
    
    for (const [categoria, catData] of dynamicCategories.entries()) {
      if (filtros.categoria && categoria !== filtros.categoria) {
        catData.sectionEl.style.display = 'none'; // Esconde seção
      } else {
        catData.sectionEl.style.display = 'block'; // Mostra seção
      }
    }

    // Re-renderiza todas as seções com a lista já filtrada
    criarCardsEAdicionar(listaOfertasEl, produtosFiltrados.filter(p => p.oferta));
    
    for (const [categoria, catData] of dynamicCategories.entries()) {
      const produtosDaCategoriaFiltrados = produtosFiltrados.filter(p => p.categoria === categoria);
      criarCardsEAdicionar(catData.containerEl, produtosDaCategoriaFiltrados);
    }
  });

  // 3. Listener para o botão "Limpar Filtros"
  btnLimparFiltros.addEventListener('click', () => {
    // Reseta valores dos filtros
    filtroCategoria.value = "";
    filtroGenero.value = "";
    filtroTipo.value = "";
    precoMin.value = "";
    precoMax.value = "";
    
    // Esconde filtros dinâmicos
    filtroGenero.style.display = 'none';
    filtroTipo.style.display = 'none';
    
    // Mostra todas as seções
    secaoOfertasEl.style.display = 'block';
    for (const catData of dynamicCategories.values()) {
      catData.sectionEl.style.display = 'block';
    }

    // Renderiza tudo (estado inicial)
    criarCardsEAdicionar(listaOfertasEl, produtos.filter(p => p.oferta));
    for (const [categoria, catData] of dynamicCategories.entries()) {
      const produtosDaCategoria = produtos.filter(p => p.categoria === categoria);
      criarCardsEAdicionar(catData.containerEl, produtosDaCategoria);
    }
  });
  
  
  // Handlers de Clique nos Cards (Miniaturas e "Adicionar")
  // Precisamos adicionar ao 'main' pois os containers são dinâmicos
  mainElement.addEventListener('click', (e) => {
    adicionarClickHandlerMiniaturas(e);
    handleAddToCartClick(e);
  });
  
  // Função de clique de miniatura adaptada para delegação
  function adicionarClickHandlerMiniaturas(e) {
    if (e.target.classList.contains('card-thumb')) {
      e.preventDefault(); 
      const card = e.target.closest('.card');
      if (card) {
        const mainImg = card.querySelector('.card-img-main-pic');
        if (mainImg) mainImg.src = e.target.src;
      }
    }
  }


  // Handlers do Modal e Botão Principal
  const btnWhats = document.getElementById('enviarWhatsApp');
  btnWhats.addEventListener('click', () => {
    if (getCart().length === 0) {
      alert('Seu carrinho está vazio.');
      return;
    }
    abrirModalCarrinho();
  });
  
  document.getElementById('fecharModal').addEventListener('click', fecharModalCarrinho);
  
  document.getElementById('modalCarrinho').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      fecharModalCarrinho();
    }
  });
  
  document.getElementById('listaCarrinhoModal').addEventListener('click', (e) => {
    if (e.target.classList.contains('remover-item-btn')) {
      const productId = e.target.dataset.id;
      handleRemoverItem(productId);
    }
  });
  
  document.getElementById('enviarPedidoModal').addEventListener('click', handleEnviarPedido);
}

// Inicializa tudo
document.addEventListener('DOMContentLoaded', () => {
  loadAndRender().catch(e => console.error('Erro na inicialização:', e));
});