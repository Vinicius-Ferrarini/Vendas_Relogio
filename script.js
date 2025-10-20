// script.js

// ======= CONFIG =======
const SHEET_ID = "1gU34_gLsxTHDy_nxhtg91-Ld6VaU4Zba65dBkZD-2aQ";
const GID = 0; 
const WHATSAPP_NUMBER = "5543999705837";
// ======================

// Objeto para armazenar os intervalos dos timers ativos e limpá-los
let activeTimers = {
  listaRelogios: [],
  listaAcessorios: [],
  listaOfertas: []
};

// REQ 2/3: Mapa global para fácil acesso aos dados do produto pelo ID
let allProducts = new Map();

// REQ 2/3: Funções de utilidade do Carrinho
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

/**
 * Faz fetch no endpoint gviz do Google Sheet (formato JSONP) e retorna JSON puro.
 */
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
 * Mapeia colunas da planilha para um objeto de produto.
 */
function mapRowToProduct(row, headers) {
  const obj = {
    images: [] // Inicializa array de imagens
  };
  
  headers.forEach((h, i) => {
    const cell = row[i]; // O objeto da célula, ex: {v: "Date(...)", f: "30/10/2025"}
    const val = cell && cell.v !== undefined ? cell.v : ""; // O valor 'v'
    const header = (h || "").toString().trim().toLowerCase();

    // Mapeamento de campos
    if (header.match(/^id$/)) obj.id = val;
    else if (header.match(/nome|name|produto/)) obj.nome = val;
    else if (header.match(/pre[cç]o|price|valor/)) {
      if (typeof val === "number") obj.preco = val;
      else {
        const cleaned = String(val).replace(/[R$\s.]/g, "").replace(",", ".");
        const n = parseFloat(cleaned);
        obj.preco = isNaN(n) ? 0 : n;
      }
    }
    else if (header.match(/categoria|category/)) obj.categoria = val.toString().toLowerCase();
    else if (header.match(/genero|gênero|genêro|sex|sexo/)) obj.genero = val.toString().toLowerCase();
    else if (header.match(/tipo|type/)) obj.estilo = val.toString().toLowerCase(); 
    else if (header.match(/destaque/)) obj.destaque = val;
    else if (header.match(/descricao|descri[cç][aã]o/)) obj.descricao = val;
    else if (header.match(/dataoferta/)) {
      if (cell && cell.f) {
        obj.dataOferta = cell.f; 
      } else if (val && val.toString().includes('/')) {
        obj.dataOferta = val.toString();
      } else {
        obj.dataOferta = "";
      }
    }
    else if (header.match(/horaoferta/)) obj.horaOferta = val;
    else if (header.match(/^img\d?$|^imagem\d?$|^foto\d?$/)) { 
      if (val) obj.images.push(val.toString());
    }
  });

  // --- Lógica de Normalização ---
  obj.nome = obj.nome || "";
  obj.preco = obj.preco !== undefined ? obj.preco : 0;
  obj.categoria = obj.categoria || "";
  obj.genero = obj.genero || "";
  // REQ 2/3: Garante que ID seja uma string
  obj.id = (obj.id || `${Date.now()}-${Math.random()}`).toString(); 

  obj.tipo = obj.categoria;
  obj.oferta = (obj.destaque && obj.destaque !== "") || (obj.dataOferta && obj.dataOferta !== "");

  if (obj.images.length === 0) {
    obj.images.push("https://via.placeholder.com/800x800?text=Sem+Imagem");
  }

  return obj;
}


/**
 * Faz parsing da response do gviz: extrai headers e rows
 */
function parseGvizResponse(resp) {
  const cols = resp.table.cols.map(c => c.label || c.id || "");
  const rows = resp.table.rows || [];
  const produtos = rows.map(r => mapRowToProduct(r.c, cols));
  
  // REQ 2/3: Popula o mapa global de produtos
  produtos.forEach(p => allProducts.set(p.id, p));
  
  return produtos;
}

/**
 * Util: remove duplicados em categorias e cria options
 */
function popularSelectComCategorias(produtos, selectElement, tipoFilter) {
  const set = new Set();
  produtos.forEach(p => {
    if (tipoFilter && p.tipo !== tipoFilter) return;
    if (p.estilo) set.add(p.estilo.toString().toLowerCase());
  });
  selectElement.innerHTML = '<option value="">Todas as categorias</option>';
  Array.from(set).sort().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    selectElement.appendChild(opt);
  });
}

/**
 * Renderiza o card de produto
 */
function criarCardHTML(p) {
  const placeholder = "https://via.placeholder.com/800x800?text=Sem+Imagem";
  const images = p.images && p.images.length ? p.images : [placeholder];
  const mainImg = images[0];
  
  // REQ 1: Pega até 4 imagens para miniaturas (0, 1, 2, 3)
  const thumbnails = images.slice(0, 4); 
  const thumbsHTML = thumbnails
    .map(img => `<img src="${escapeHtml(img)}" alt="Miniatura" class="card-thumb" loading="lazy">`)
    .join('');

  const precoFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco || 0);
  const linkDetalhe = `detalhe.html?data=${encodeURIComponent(JSON.stringify(p))}`;
  const badgeHTML = p.destaque ? `<div class="card-badge">${escapeHtml(p.destaque)}</div>` : '';
  const timerHTML = p.dataOferta ? `<div class="card-timer" id="timer-${p.id}"></div>` : '';

  // REQ 2/3: Verifica status do carrinho para o botão
  const cart = getCart();
  const isInCart = cart.find(item => item.id === p.id);
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
    
    <div class="card-img-thumbs">
      ${thumbsHTML}
    </div>
    
    <h3>${escapeHtml(p.nome)}</h3>
    <p>${precoFmt}</p>
    
    <button class="btn-add-cart" data-id="${escapeHtml(p.id)}" ${btnDisabled}>
      ${btnText}
    </button>
  `;
  return template;
}

function escapeHtml(str){
  if(!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Render and UI wiring **/
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
  activeTimers[containerId] = []; // Limpa o array
}

function iniciarContadores(produtos, containerId) {
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
    if (anoStr.length === 2) {
      anoNum += 2000; // Converte '25' para '2025'
    }
    
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
    
    activeTimers[containerId].push(intervalId);
  });
}


function criarCardsEAdicionar(container, produtos){
  clearTimers(container.id);
  
  vazioElemento(container);
  if(!produtos || produtos.length === 0){
    mostrarMensagemNoContainer(container, 'Nenhum produto encontrado.');
    return;
  }

  produtos.forEach(p => {
    const card = criarCardHTML(p);
    container.appendChild(card);
  });
  
  iniciarContadores(produtos, container.id);
}

function filtrarLista(produtos, { genero = '', categoria = '', precoMin = 0, precoMax = Infinity, tipo = '' } = {}){
  return produtos.filter(p => {
    if(tipo && p.tipo !== tipo) return false;
    if(genero && String(p.genero || '').toLowerCase() !== String(genero || '').toLowerCase()) return false;
    if(categoria && String(p.estilo || '').toLowerCase() !== String(categoria || '').toLowerCase()) return false;
    const preco = Number(p.preco || 0);
    if(!isNaN(precoMin) && preco < precoMin) return false;
    if(!isNaN(precoMax) && preco > precoMax) return false;
    return true;
  });
}

/**
 * Adiciona handler de clique para miniaturas (delegação de evento)
 */
function adicionarClickHandlerMiniaturas(container) {
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('card-thumb')) {
      e.preventDefault(); 
      
      const card = e.target.closest('.card');
      if (card) {
        const mainImg = card.querySelector('.card-img-main-pic');
        if (mainImg) {
          mainImg.src = e.target.src; // Troca a imagem
        }
      }
    }
  });
}

/**
 * REQ 2/3: Handler para cliques no botão "Adicionar ao Carrinho"
 */
function handleAddToCartClick(e) {
  if (!e.target.classList.contains('btn-add-cart')) return;
  
  const btn = e.target;
  const productId = btn.dataset.id;
  const product = allProducts.get(productId);
  
  if (!product) {
    console.error("Produto não encontrado no mapa:", productId);
    return;
  }

  const cart = getCart();
  
  // Verifica se já está no carrinho (segurança, embora o botão deva estar desabilitado)
  if (cart.find(p => p.id === product.id)) {
    return;
  }
  
  // Adiciona item, salva carrinho, atualiza botão do footer
  cart.push({ id: product.id, nome: product.nome, preco: product.preco });
  saveCart(cart);
  updateCartButtonText();
  
  // Atualiza botão do card
  btn.textContent = '✅ Adicionado!';
  btn.disabled = true;
}


async function loadAndRender(){
  const listaRelogiosEl = document.getElementById('listaRelogios');
  const listaAcessoriosEl = document.getElementById('listaAcessorios');
  const listaOfertasEl = document.getElementById('listaOfertas');

  const filtroGeneroRelogio = document.getElementById('filtroGeneroRelogio');
  const filtroCategoriaRelogio = document.getElementById('filtroCategoriaRelogio');
  const precoMinRelogio = document.getElementById('precoMinRelogio');
  const precoMaxRelogio = document.getElementById('precoMaxRelogio');
  const btnFiltrarRelogio = document.getElementById('filtrarRelogio');

  const filtroGeneroAcessorio = document.getElementById('filtroGeneroAcessorio');
  const filtroCategoriaAcessorio = document.getElementById('filtroCategoriaAcessorio');
  const precoMinAcessorio = document.getElementById('precoMinAcessorio');
  const precoMaxAcessorio = document.getElementById('precoMaxAcessorio');
  const btnFiltrarAcessorio = document.getElementById('filtrarAcessorio');

  let produtos = [];

  try{
    const resp = await fetchSheetJson(SHEET_ID, GID);
    produtos = parseGvizResponse(resp);
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
      // REQ 2/3: Popula o mapa global também no fallback
      produtos.forEach(p => allProducts.set(p.id, p));
      console.log('Dados carregados (opensheet):', produtos.length, 'produtos');
    }catch(err2){
      console.error('Erro ao carregar planilha pelo fallback:', err2);
      mostrarMensagemNoContainer(listaRelogiosEl, 'Erro ao carregar produtos. Verifique o console.');
      mostrarMensagemNoContainer(listaAcessoriosEl, 'Erro ao carregar produtos. Verifique o console.');
      mostrarMensagemNoContainer(listaOfertasEl, 'Erro ao carregar produtos. Verifique o console.');
      return;
    }
  }

  // Populate category selects
  popularSelectComCategorias(produtos, filtroCategoriaRelogio, 'relogio');
  popularSelectComCategorias(produtos, filtroCategoriaAcessorio, 'acessorio');

  // initial render
  criarCardsEAdicionar(listaRelogiosEl, filtrarLista(produtos, { tipo: 'relogio' }));
  criarCardsEAdicionar(listaAcessoriosEl, filtrarLista(produtos, { tipo: 'acessorio' }));
  criarCardsEAdicionar(listaOfertasEl, produtos.filter(p => p.oferta));
  
  // REQ 2/3: Atualiza o texto do botão do carrinho no carregamento inicial
  updateCartButtonText();

  // filter handlers
  btnFiltrarRelogio.addEventListener('click', () => {
    const genero = filtroGeneroRelogio.value;
    const categoria = filtroCategoriaRelogio.value;
    const precoMin = precoMinRelogio.value ? Number(precoMinRelogio.value) : 0;
    const precoMax = precoMaxRelogio.value ? Number(precoMaxRelogio.value) : Infinity;
    const result = filtrarLista(produtos, { genero, categoria, precoMin, precoMax, tipo: 'relogio' });
    criarCardsEAdicionar(listaRelogiosEl, result);
  });

  btnFiltrarAcessorio.addEventListener('click', () => {
    const genero = filtroGeneroAcessorio.value;
    const categoria = filtroCategoriaAcessorio.value;
    const precoMin = precoMinAcessorio.value ? Number(precoMinAcessorio.value) : 0;
    const precoMax = precoMaxAcessorio.value ? Number(precoMaxAcessorio.value) : Infinity;
    const result = filtrarLista(produtos, { genero, categoria, precoMin, precoMax, tipo: 'acessorio' });
    criarCardsEAdicionar(listaAcessoriosEl, result);
  });
  
  // Adiciona listeners de clique (miniatura e carrinho)
  [listaRelogiosEl, listaAcessoriosEl, listaOfertasEl].forEach(container => {
    adicionarClickHandlerMiniaturas(container);
    // REQ 2/3: Adiciona listener para "Adicionar ao Carrinho"
    container.addEventListener('click', handleAddToCartClick);
  });


  // REQ 2/3: Botão WhatsApp atualizado para enviar o carrinho
  const btnWhats = document.getElementById('enviarWhatsApp');
  btnWhats.addEventListener('click', () => {
    
    const cart = getCart();
    if (cart.length === 0){
      alert('Seu carrinho está vazio.');
      return;
    }
    
    const lines = cart.map(p => {
      const precoFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco);
      return `${p.nome} - ${precoFmt}`;
    });
    
    const msg = `Olá! Gostaria de comprar os seguintes itens:\n${lines.join('\n')}`;
    const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(wa, '_blank');
    
    // REQ 3: Pergunta se quer limpar o carrinho após enviar
    if (confirm("Pedido enviado! Deseja limpar o carrinho?")) {
      saveCart([]); // Limpa o carrinho
      updateCartButtonText(); // Atualiza o botão do footer
      
      // Reseta todos os botões "Adicionado" dos cards
      document.querySelectorAll('.btn-add-cart:disabled').forEach(btn => {
        btn.textContent = 'Adicionar ao Carrinho';
        btn.disabled = false;
      });
    }
  });
}

// initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  loadAndRender().catch(e => console.error('Erro na inicialização:', e));
});