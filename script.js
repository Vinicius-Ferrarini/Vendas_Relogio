// script.js

// ======= CONFIG =======
const SHEET_ID = "1gU34_gLsxTHDy_nxhtg91-Ld6VaU4Zba65dBkZD-2aQ";
const GID = 0; // se sua aba for diferente, ajuste o gid (veja URL da planilha ?gid=XXX)
// número do WhatsApp (11 + DDD + número, em formato internacional sem +)
const WHATSAPP_NUMBER = "5543999705837";
// ======================

/**
 * Faz fetch no endpoint gviz do Google Sheet (formato JSONP) e retorna JSON puro.
 */
async function fetchSheetJson(sheetId, gid = 0) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
  const res = await fetch(url);
  const txt = await res.text();
  // resposta vem como:  /*O_o*/\ngoogle.visualization.Query.setResponse(<JSON>);
  const start = txt.indexOf('(');
  const end = txt.lastIndexOf(')');
  const jsonStr = txt.substring(start + 1, end);
  return JSON.parse(jsonStr);
}

/**
 * Tenta mapear colunas que podem ter nomes diferentes.
 * Aceita headers como: nome, Nome, Nome Produto, preco, Preço, price, categoria, Categoria, tipo, Tipo, oferta, Oferta, genero, genêro, gênero, img1..img8
 */
function mapRowToProduct(row, headers) {
  // row is array of cells; headers is array of header strings
  const obj = {};
  headers.forEach((h, i) => {
    const val = row[i] && row[i].v !== undefined ? row[i].v : "";
    const header = (h || "").toString().trim().toLowerCase();

    // normalize header into field
    if (header.match(/nome|name|produto/)) obj.nome = val;
    else if (header.match(/pre[cç]o|price|valor/)) {
      // convert price strings like "R$ 129,90" or numbers
      if (typeof val === "number") obj.preco = val;
      else {
        const cleaned = String(val).replace(/[R$\s.]/g, "").replace(",", ".");
        const n = parseFloat(cleaned);
        obj.preco = isNaN(n) ? 0 : n;
      }
    }
    else if (header.match(/categoria|category/)) obj.categoria = val.toString().toLowerCase();
    else if (header.match(/genero|gênero|genêro|sex|sexo/)) obj.genero = val.toString().toLowerCase();
    // AQUI, usamos um nome diferente ('estilo') para o 'Tipo' da planilha para não conflitar
    else if (header.match(/tipo|type/)) obj.estilo = val.toString().toLowerCase();
    // ALTERAÇÃO 1: Adicionado 'destaque' para reconhecer a coluna de ofertas
    else if (header.match(/oferta|promo|desconto|destaque/)) {
      // mark as oferta if truthy or price lower than original (maybe sheet includes oferta price)
      obj.oferta = val !== "" && val !== null;
      // also try to parse numeric discount price
      if (typeof val === "number") obj.precoOferta = val;
      else {
        const cleaned = String(val).replace(/[R$\s.]/g, "").replace(",", ".");
        const n = parseFloat(cleaned);
        if (!isNaN(n)) obj.precoOferta = n;
      }
    }
    else if (header.match(/^img|imagem|foto/)) {
      // collect images into array
      obj.images = obj.images || [];
      if (val) obj.images.push(val.toString());
    } else {
      // if header looks like img1, img2, etc.
      if (header.match(/img\d|imagem\d|foto\d/)) {
        obj.images = obj.images || [];
        if (val) obj.images.push(val.toString());
      }
    }
  });

  // defaults
  obj.nome = obj.nome || "";
  obj.preco = obj.preco !== undefined ? obj.preco : 0;
  obj.categoria = obj.categoria || "";
  obj.genero = obj.genero || "";
  
  // ALTERAÇÃO 2: Definimos o 'tipo' com base na 'categoria' para a filtragem funcionar
  obj.tipo = obj.categoria;

  // if oferta flag is missing but precoOferta exists, set oferta true
  if ((obj.oferta === undefined || obj.oferta === false) && obj.precoOferta) obj.oferta = true;

  // images fallback: if not provided use placeholder
  obj.images = obj.images && obj.images.length ? obj.images : ["https://via.placeholder.com/800x800?text=Sem+Imagem"];

  // If precoOferta present, prefer to show precoOferta as displayed price and keep original as 'precoOriginal'
  if (obj.precoOferta) {
    obj.precoOriginal = obj.preco;
    obj.preco = obj.precoOferta;
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
  return produtos;
}

/**
 * Util: remove duplicados em categorias e cria options
 */
function popularSelectComCategorias(produtos, selectElement, tipoFilter) {
  const set = new Set();
  produtos.forEach(p => {
    if (tipoFilter && p.tipo !== tipoFilter) return;
    // Aqui usamos o campo 'estilo' que criamos, que vem da coluna 'Tipo' da planilha
    if (p.estilo) set.add(p.estilo.toString().toLowerCase());
  });
  // limpar e adicionar
  selectElement.innerHTML = '<option value="">Todas as categorias</option>';
  Array.from(set).sort().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    selectElement.appendChild(opt);
  });
}


/**
 * Renderiza produtos em um container
 */
function criarCardHTML(p) {
  const img = p.images && p.images.length ? p.images[0] : "https://via.placeholder.com/800x800?text=Sem+Imagem";
  // preço formatado
  const precoFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco || 0);
  const precoOriginal = p.precoOriginal ? `<small style="text-decoration:line-through;color:#9ca3af">${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(p.precoOriginal)}</small>` : '';

  const ofertaBadge = p.oferta ? `<div style="position:absolute;right:10px;top:10px;background:#ef4444;color:#fff;padding:6px 8px;border-radius:8px;font-size:0.8rem">OFERTA</div>` : '';

  const template = document.createElement('div');
  template.className = "card";
  template.innerHTML = `
    <div style="position:relative">
      ${ofertaBadge}
      <img src="${img}" alt="${escapeHtml(p.nome)}" loading="lazy">
    </div>
    <h3>${escapeHtml(p.nome)}</h3>
    <p>${precoFmt} ${precoOriginal}</p>
    <label class="checkbox">
      <input type="checkbox" data-nome="${escapeHtml(p.nome)}" data-preco="${p.preco}"> Selecionar
    </label>
  `;
  return template;
}

// small

// escape minimal
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
}

function filtrarLista(produtos, { genero = '', categoria = '', precoMin = 0, precoMax = Infinity, tipo = '' } = {}){
  return produtos.filter(p => {
    if(tipo && p.tipo !== tipo) return false;
    if(genero && String(p.genero || '').toLowerCase() !== String(genero || '').toLowerCase()) return false;
    // O filtro de categoria agora vai usar o 'estilo' que vem da coluna 'Tipo' da planilha
    if(categoria && String(p.estilo || '').toLowerCase() !== String(categoria || '').toLowerCase()) return false;
    const preco = Number(p.preco || 0);
    if(!isNaN(precoMin) && preco < precoMin) return false;
    if(!isNaN(precoMax) && preco > precoMax) return false;
    return true;
  });
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
    // fallback to opensheet.elk.sh which returns array of objects
    try{
      const opensheetUrl = `https://opensheet.elk.sh/${SHEET_ID}/Página1`;
      const r = await fetch(opensheetUrl);
      const arr = await r.json();
      // map array of objects to internal product shape
      produtos = arr.map(obj => {
        // basic mapping: try keys
        const headers = Object.keys(obj);
        // convert object to gviz-like row representation for mapRowToProduct
        const row = headers.map(h => ({ v: obj[h] }));
        return mapRowToProduct(row, headers);
      });
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

  // initial render: all relógios, acessorios, ofertas
  criarCardsEAdicionar(listaRelogiosEl, filtrarLista(produtos, { tipo: 'relogio' }));
  criarCardsEAdicionar(listaAcessoriosEl, filtrarLista(produtos, { tipo: 'acessorio' }));
  criarCardsEAdicionar(listaOfertasEl, produtos.filter(p => p.oferta));

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

  // WhatsApp button
  const btnWhats = document.getElementById('enviarWhatsApp');
  btnWhats.addEventListener('click', () => {
    // collect checked items
    const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'));
    if(checked.length === 0){
      alert('Nenhum produto selecionado.');
      return;
    }
    const lines = checked.map(ch => {
      const nome = ch.dataset.nome || '';
      const preco = ch.dataset.preco ? Number(ch.dataset.preco) : 0;
      const precoFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco);
      return `${nome} - ${precoFmt}`;
    });
    const msg = `Olá! Gostaria de comprar:\n${lines.join('\n')}`;
    const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(wa, '_blank');
  });
}

// initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  loadAndRender().catch(e => console.error('Erro na inicialização:', e));
});