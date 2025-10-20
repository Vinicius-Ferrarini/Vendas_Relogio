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
 * Mapeia colunas da planilha para um objeto de produto.
 * ATUALIZADO: Lê 'f' (valor formatado) para dataOferta
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
    else if (header.match(/tipo|type/)) obj.estilo = val.toString().toLowerCase(); // 'estilo' para não conflitar com 'tipo' interno
    else if (header.match(/destaque/)) obj.destaque = val; // Mantém Destaque
    else if (header.match(/descricao|descri[cç][aã]o/)) obj.descricao = val; // NOVO: Descricao
    
    // ***** INÍCIO DA CORREÇÃO 1 *****
    else if (header.match(/dataoferta/)) {
      // CORREÇÃO: Usar o valor formatado (f) para datas, não o valor (v).
      // 'f' vem como "30/10/2025" ou "30/10/25" (string correta)
      // 'v' vem como "Date(2025,9,30)" (string que causa o erro)
      if (cell && cell.f) {
        obj.dataOferta = cell.f; 
      } else if (val && val.toString().includes('/')) {
        // Fallback para opensheet.elk.sh, que só tem 'v' mas 'v' já é a string "30/10/25"
        obj.dataOferta = val.toString();
      } else {
        obj.dataOferta = ""; // Deixa em branco se não for um formato válido
      }
    }
    // ***** FIM DA CORREÇÃO 1 *****

    else if (header.match(/horaoferta/)) obj.horaOferta = val; // NOVO: HoraOferta
    else if (header.match(/^img\d?$|^imagem\d?$|^foto\d?$/)) { // Pega Img, Img1, Img2...
      if (val) obj.images.push(val.toString());
    }
  });

  // --- Lógica de Normalização ---
  obj.nome = obj.nome || "";
  obj.preco = obj.preco !== undefined ? obj.preco : 0;
  obj.categoria = obj.categoria || "";
  obj.genero = obj.genero || "";
  obj.id = obj.id || `${Date.now()}-${Math.random()}`; // Gera ID se não houver

  // Define o 'tipo' interno (para filtros) com base na 'categoria'
  obj.tipo = obj.categoria;
  
  // Define se é oferta (com base no Destaque ou se tem data de oferta)
  obj.oferta = (obj.destaque && obj.destaque !== "") || (obj.dataOferta && obj.dataOferta !== "");

  // Fallback de imagens
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
 * NOVO: Renderiza o card de produto com múltiplas imagens e link de detalhe
 */
function criarCardHTML(p) {
  const placeholder = "https://via.placeholder.com/800x800?text=Sem+Imagem";
  const images = p.images && p.images.length ? p.images : [placeholder];
  const mainImg = images[0];
  
  // Pega até 3 imagens para miniaturas (da 2ª até a 4ª)
  const thumbnails = images.slice(1, 4); 
  const thumbsHTML = thumbnails
    .map(img => `<img src="${escapeHtml(img)}" alt="Miniatura" class="card-thumb" loading="lazy">`)
    .join('');

  // Formata preço
  const precoFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco || 0);

  // Link para a página de detalhes, passando dados via URL
  // Usamos JSON stringify + encodeURIComponent para passar o objeto
  const linkDetalhe = `detalhe.html?data=${encodeURIComponent(JSON.stringify(p))}`;
  
  // Badge de Destaque (ex: "Oferta")
  const badgeHTML = p.destaque ? `<div class="card-badge">${escapeHtml(p.destaque)}</div>` : '';

  // Placeholder do Timer
  // O ID é crucial para o script de contagem regressiva encontrar este elemento
  const timerHTML = p.dataOferta ? `<div class="card-timer" id="timer-${p.id}"></div>` : '';

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
    
    <label class="checkbox">
      <input type="checkbox" data-nome="${escapeHtml(p.nome)}" data-preco="${p.preco}"> Selecionar
    </label>
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

/**
 * NOVO: Limpa timers antigos antes de renderizar novos cards
 */
function clearTimers(containerId) {
  if (activeTimers[containerId]) {
    activeTimers[containerId].forEach(intervalId => clearInterval(intervalId));
  }
  activeTimers[containerId] = []; // Limpa o array
}

/**
 * NOVO: Inicia todos os contadores para os produtos renderizados
 * ATUALIZADO: Trata ano com 2 (AA) ou 4 (YYYY) dígitos
 */
function iniciarContadores(produtos, containerId) {
  produtos.forEach(p => {
    if (!p.dataOferta) return; // Pula se não tem data

    const timerEl = document.getElementById(`timer-${p.id}`);
    if (!timerEl) return; // Pula se elemento não foi encontrado

    // 1. Parse da Data (DD/MM/AA ou DD/MM/YYYY)
    // ***** INÍCIO DA CORREÇÃO 2 *****
    const [dia, mes, anoStr] = p.dataOferta.split('/');
    if (!dia || !mes || !anoStr) {
      console.warn(`Data de oferta inválida para ${p.nome}: ${p.dataOferta}`);
      return;
    }

    // 2. Parse da Hora (0-23)
    const hora = p.horaOferta ? parseInt(p.horaOferta, 10) : 23; // Default 23h
    const minutos = p.horaOferta ? 0 : 59; // Default 59min
    const segundos = p.horaOferta ? 0 : 59; // Default 59s
    
    // 3. Cria a data alvo (Ano 'AA' vira '20AA')
    // CORREÇÃO: Tratar ano com 2 ou 4 dígitos
    let anoNum = parseInt(anoStr, 10);
    if (anoStr.length === 2) {
      anoNum += 2000; // Converte '25' para '2025'
    }
    
    const targetDate = new Date(anoNum, mes - 1, dia, hora, minutos, segundos);
    // ***** FIM DA CORREÇÃO 2 *****

    // 4. Cria o intervalo de atualização
    const intervalId = setInterval(() => {
      const agora = new Date().getTime();
      const diff = targetDate.getTime() - agora;

      if (diff <= 0) {
        clearInterval(intervalId);
        timerEl.style.display = 'none'; // Esconde timer
        return;
      }

      // 5. Calcula tempo restante
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      // 6. Atualiza o HTML do timer
      timerEl.innerHTML = `${d}d ${h}h ${m}m ${s}s`;

    }, 1000);

    // 7. Armazena o ID do intervalo para limpeza futura
    activeTimers[containerId].push(intervalId);
  });
}


function criarCardsEAdicionar(container, produtos){
  // NOVO: Limpa timers antigos associados a este container
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
  
  // NOVO: Inicia os contadores para os produtos recém-adicionados
  iniciarContadores(produtos, container.id);
}

function filtrarLista(produtos, { genero = '', categoria = '', precoMin = 0, precoMax = Infinity, tipo = '' } = {}){
  return produtos.filter(p => {
    if(tipo && p.tipo !== tipo) return false;
    if(genero && String(p.genero || '').toLowerCase() !== String(genero || '').toLowerCase()) return false;
    // Filtro de categoria agora usa o 'estilo' (coluna 'Tipo' da planilha)
    if(categoria && String(p.estilo || '').toLowerCase() !== String(categoria || '').toLowerCase()) return false;
    const preco = Number(p.preco || 0);
    if(!isNaN(precoMin) && preco < precoMin) return false;
    if(!isNaN(precoMax) && preco > precoMax) return false;
    return true;
  });
}

/**
 * NOVO: Adiciona handler de clique para miniaturas (delegação de evento)
 */
function adicionarClickHandlerMiniaturas(container) {
  container.addEventListener('click', (e) => {
    // Verifica se o clique foi em uma miniatura
    if (e.target.classList.contains('card-thumb')) {
      e.preventDefault(); // Previne qualquer ação padrão
      
      // Encontra a imagem principal do card pai
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
      const opensheetUrl = `https://opensheet.elk.sh/${SHEET_ID}/Página1`; // Ajuste o nome da aba se necessário
      const r = await fetch(opensheetUrl);
      if (!r.ok) throw new Error(`OpenSheet falhou com status ${r.status}`);
      const arr = await r.json();
      
      produtos = arr.map(obj => {
        const headers = Object.keys(obj);
        // Converte o objeto {chave: valor} para o formato [{v: valor}, {v: valor}]
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

  // initial render
  criarCardsEAdicionar(listaRelogiosEl, filtrarLista(produtos, { tipo: 'relogio' }));
  criarCardsEAdicionar(listaAcessoriosEl, filtrarLista(produtos, { tipo: 'acessorio' }));
  criarCardsEAdicionar(listaOfertasEl, produtos.filter(p => p.oferta)); // Mostra todos com 'destaque' ou 'dataoferta'

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
  
  // NOVO: Adiciona listeners de clique para miniaturas em todos os containers
  [listaRelogiosEl, listaAcessoriosEl, listaOfertasEl].forEach(container => {
    adicionarClickHandlerMiniaturas(container);
  });


  // WhatsApp button
  const btnWhats = document.getElementById('enviarWhatsApp');
  btnWhats.addEventListener('click', () => {
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