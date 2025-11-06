// checkout.js
// (CORRIGIDO PARA O LAYOUT DO CARRINHO MOBILE)

// ===================================
// CONSTANTES GLOBAIS
// ===================================
const WHATSAPP_NUMBER = "5548999609870"; 

// ===================================
// VARIÁVEIS GLOBAIS DO CHECKOUT
// (serão preenchidas pela função init)
// ===================================
let cepInput, btnBuscarCep;
let btnNextStep, btnPrevStep, modalTituloEl; 
let wizardStep1, wizardStep2; 

// ===================================
// FUNÇÕES AUXILIARES GLOBAIS
// ===================================
function getCart() {
    return JSON.parse(localStorage.getItem("leandrinhoCart") || "[]");
}
function saveCart(cart) {
    localStorage.setItem("leandrinhoCart", JSON.stringify(cart));
}
function escapeHtml(str){ if(!str && str !== 0) return ""; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function formatPrice(price) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price || 0); }
function vazioElemento(el){ while(el.firstChild) el.removeChild(el.firstChild); }

// ===================================
// LÓGICA DO CEP
// ===================================
function formatarCEP(event) {
    const input = event.target;
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 5) {
        valor = valor.replace(/^(\d{5})(\d)/, '$1-$2');
    }
    input.value = valor.substring(0, 9);
}

async function buscarCep(event) {
    event.preventDefault(); 
    const cep = cepInput.value.replace(/\D/g, '');
    if (cep.length !== 8) {
        alert('CEP inválido. Por favor, digite 8 números.');
        return;
    }
    btnBuscarCep.textContent = 'Buscando...';
    btnBuscarCep.disabled = true;
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error('Erro na rede');
        const data = await response.json();
        
        if (data.erro) {
            alert('CEP não encontrado. Verifique o número.');
            document.getElementById('enderecoRua').value = '';
            document.getElementById('enderecoBairro').value = '';
            document.getElementById('enderecoCidade').value = '';
        } else {
            document.getElementById('enderecoRua').value = data.logradouro;
            document.getElementById('enderecoBairro').value = data.bairro;
            document.getElementById('enderecoCidade').value = data.localidade; 
            
            if (data.logradouro) {
                document.getElementById('enderecoNumero').focus(); 
            } else {
                document.getElementById('enderecoRua').focus();
            }
        }
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        alert('Erro ao buscar CEP. Verifique sua conexão.');
    } finally {
        btnBuscarCep.textContent = 'Pesquisar';
        btnBuscarCep.disabled = false;
    }
}

// ===================================
// FUNÇÕES DO CARRINHO (Botão Footer)
// ===================================
function updateCartButtonText() {
    const btn = document.getElementById('enviarWhatsApp'); if (!btn) return;
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    btn.textContent = totalItems > 0 ? `🛒 Ver Carrinho (${totalItems} ${totalItems > 1 ? 'itens' : 'item'})` : `🛒 Carrinho Vazio`;
}

// ===================================
// Funções do Wizard
// ===================================
function goToStep(stepNumber) {
    if (!wizardStep1 || !wizardStep2 || !modalTituloEl) {
        console.error("Elementos do Wizard não encontrados. O HTML está correto?");
        return;
    }
    if (stepNumber === 1) {
        wizardStep1.style.display = 'flex';
        wizardStep2.style.display = 'none';
        modalTituloEl.textContent = '🛒 Passo 1: Meu Carrinho';
    } else if (stepNumber === 2) {
        wizardStep1.style.display = 'none';
        wizardStep2.style.display = 'flex';
        modalTituloEl.textContent = '🚚 Passo 2: Entrega e Pagamento';
    }
}

// ===================================
// FUNÇÕES DO MODAL (LÓGICA CENTRAL)
// ===================================
function resetAdicionaisModal() {
    document.getElementById('formaPagamento').value = '';
    document.getElementById('enderecoCep').value = '';
    document.getElementById('enderecoRua').value = '';
    document.getElementById('enderecoNumero').value = '';
    document.getElementById('enderecoComplemento').value = '';
    document.getElementById('enderecoBairro').value = '';
    document.getElementById('enderecoCidade').value = '';
    if (btnBuscarCep) {
        btnBuscarCep.textContent = 'Pesquisar';
        btnBuscarCep.disabled = false;
    }
    document.getElementById('observacaoPedido').value = '';
}

function abrirModalCarrinho() {
    const cart = getCart(); 
    const modal = document.getElementById('modalCarrinho'); 
    const modalBody = document.getElementById('listaCarrinhoModal'); 
    
    const totalStep1El = document.getElementById('totalCarrinhoStep1');
    const totalStep2El = document.getElementById('totalCarrinhoStep2');
    const btnNext = document.getElementById('btnNextStep');

    vazioElemento(modalBody); 
    
    if (cart.length === 0) { 
        modalBody.innerHTML = '<p>Seu carrinho está vazio.</p>'; 
        totalStep1El.textContent = 'Total: R$ 0,00'; 
        totalStep2El.textContent = 'Total: R$ 0,00'; 
        btnNext.style.display = 'none'; 
        resetAdicionaisModal();
    }
    else { 
        let total = 0; 
        cart.forEach(item => { 
            const itemEl = document.createElement('div'); 
            itemEl.className = 'cart-item-modal'; 
            let nomeDisplay = escapeHtml(item.nome);
            if (item.observacao) {
                nomeDisplay += `<span class="item-obs-modal">Obs: ${escapeHtml(item.observacao)}</span>`;
            }

            itemEl.innerHTML = `
                <div class="cart-item-modal-info">
                    <span class="nome">${nomeDisplay}</span>
                    <span class="preco">${formatPrice(item.preco)}</span>
                </div>
                <div class="cart-item-modal-actions">
                    <div class="cart-item-modal-controls">
                        <button class="qty-btn decrease-qty" data-id="${escapeHtml(item.id)}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn increase-qty" data-id="${escapeHtml(item.id)}">+</button>
                    </div>
                    <button class="remover-item-btn" data-id="${escapeHtml(item.id)}">Remover</button>
                </div>`;

            modalBody.appendChild(itemEl); 
            total += item.preco * item.quantity; 
        }); 
        
        const totalFormatado = formatPrice(total);
        totalStep1El.textContent = `Total: ${totalFormatado}`; 
        totalStep2El.textContent = `Total: ${totalFormatado}`; 
        btnNext.style.display = 'block'; 
        
        resetAdicionaisModal();
        document.getElementById('observacaoPedido').value = ''; 
    }
    
    goToStep(1); 
    modal.style.display = 'flex';
}

function fecharModalCarrinho() { 
    document.getElementById('modalCarrinho').style.display = 'none'; 
    goToStep(1);
}
function handleRemoverItem(productId) {
    let cart = getCart(); 
    cart = cart.filter(item => item.id.toString() !== productId.toString()); 
    saveCart(cart);
    abrirModalCarrinho(); 
    updateCartButtonText();
    
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
    const cart = getCart(); 
    const observacaoGeral = document.getElementById('observacaoPedido').value.trim();
    const enviarBtn = document.getElementById('enviarPedidoModal');
    
    if (cart.length === 0){ alert('Seu carrinho está vazio.'); return; }
    
    const formaPagamento = document.getElementById('formaPagamento').value;
    const cep = document.getElementById('enderecoCep').value.trim();
    const rua = document.getElementById('enderecoRua').value.trim();
    const numero = document.getElementById('enderecoNumero').value.trim();
    const complemento = document.getElementById('enderecoComplemento').value.trim();
    const bairro = document.getElementById('enderecoBairro').value.trim();
    const cidade = document.getElementById('enderecoCidade').value.trim();

    if (!formaPagamento) {
        alert('Por favor, selecione uma forma de pagamento.');
        document.getElementById('formaPagamento').focus();
        return;
    }

    const hasAddressInput = cep || rua || numero || bairro || cidade;
    if (hasAddressInput) {
        if (!cep || !rua || !numero || !bairro || !cidade) {
            alert('Para entrega, por favor, preencha todos os campos de endereço (CEP, Rua, Número, Bairro e Cidade).');
            if (!cep) document.getElementById('enderecoCep').focus();
            else if (!rua) document.getElementById('enderecoRua').focus();
            else if (!numero) document.getElementById('enderecoNumero').focus();
            else if (!bairro) document.getElementById('enderecoBairro').focus();
            else if (!cidade) document.getElementById('enderecoCidade').focus();
            return;
        }
    }

    enviarBtn.disabled = true; enviarBtn.textContent = 'Abrindo WhatsApp...';

    const lines = cart.map(item => { 
        const itemTotal = formatPrice(item.preco * item.quantity); 
        let itemText = `${item.quantity}x ${item.nome} (${formatPrice(item.preco)} cada) - ${itemTotal}`;
        if (item.observacao) {
            itemText += `\n  (Obs: ${item.observacao})`;
        }
        return itemText;
    });

    const subTotal = cart.reduce((sum, item) => sum + (item.preco * item.quantity), 0); 
    const subTotalFmt = formatPrice(subTotal);
    
    let msg = `Olá! Gostaria de fazer o seguinte pedido:\n\n${lines.join('\n')}`; 
    msg += `\n\n*Subtotal: ${subTotalFmt}*`;
    msg += `\n\n*Forma de Pagamento:*\n${formaPagamento}`;

    if (hasAddressInput) {
        msg += `\n\n*Endereço de Entrega:*`;
        msg += `\nCEP: ${cep}`;
        msg += `\nRua: ${rua}, ${numero}`;
        if (complemento) msg += `\nComplemento: ${complemento}`;
        msg += `\nBairro: ${bairro}`;
        msg += `\nCidade: ${cidade}`;
    }

    if (observacaoGeral) { 
        msg += `\n\n*Observações Gerais:*\n${observacaoGeral}`; 
    }

    const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(wa, '_blank');
    
    setTimeout(() => {
        console.log("Limpando carrinho após envio...");
        saveCart([]); 
        resetAdicionaisModal(); 
        updateCartButtonText();
        
        const cardBtns = document.querySelectorAll(`.btn-add-cart:disabled`);
        cardBtns.forEach(btn => { 
            if (btn.id !== 'enviarPedidoModal') { 
                btn.textContent = 'Adicionar ao Carrinho'; 
                btn.disabled = false; 
            } 
        });

        fecharModalCarrinho(); 
        enviarBtn.disabled = false; 
        enviarBtn.textContent = '🟢 Enviar Pedido';
    }, 1500); 
}

// ===================================
// INICIALIZAÇÃO DO CHECKOUT
// ===================================
function initCheckout() {
    cepInput = document.getElementById('enderecoCep');
    btnBuscarCep = document.getElementById('btnBuscarCep');
    btnNextStep = document.getElementById('btnNextStep');
    btnPrevStep = document.getElementById('btnPrevStep');
    modalTituloEl = document.getElementById('modalTitulo');
    wizardStep1 = document.getElementById('wizardStep1');
    wizardStep2 = document.getElementById('wizardStep2');
    
    const btnWhatsFooter = document.getElementById('enviarWhatsApp'); 
    if(btnWhatsFooter) {
        btnWhatsFooter.addEventListener('click', () => { 
            if (getCart().length === 0) { 
                alert('Seu carrinho está vazio.'); 
                return; 
            } 
            abrirModalCarrinho(); 
        });
    }
    
    const modal = document.getElementById('modalCarrinho');
    if (modal) {
        document.getElementById('fecharModal').addEventListener('click', fecharModalCarrinho);
        modal.addEventListener('click', (e) => { if (e.target.classList.contains('modal-overlay')) { fecharModalCarrinho(); } });
        document.getElementById('listaCarrinhoModal').addEventListener('click', (e) => {
            const target = e.target; 
            const btnWithId = target.closest('[data-id]');
            if (!btnWithId) return;
            const productId = btnWithId.dataset.id;
            
            if (target.classList.contains('remover-item-btn')) { handleRemoverItem(productId); }
            else if (target.classList.contains('increase-qty')) { increaseQuantity(productId); }
            else if (target.classList.contains('decrease-qty')) { decreaseQuantity(productId); }
        });
        document.getElementById('enviarPedidoModal').addEventListener('click', handleEnviarPedido);

        if (cepInput) {
            cepInput.addEventListener('input', formatarCEP); 
            cepInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault(); 
                    btnBuscarCep.click(); 
                }
            });
        }
        if (btnBuscarCep) {
            btnBuscarCep.addEventListener('click', buscarCep);
        }
        if (btnNextStep) {
            btnNextStep.addEventListener('click', () => goToStep(2));
        }
        if (btnPrevStep) {
            btnPrevStep.addEventListener('click', () => goToStep(1));
        }
    } else {
        console.error("O HTML do modal não foi encontrado. O checkout não pode ser inicializado.");
    }

    // ==============================================
    // ATUALIZADO: Nova mensagem do botão do header
    // ==============================================
    const whatsappHeaderButton = document.getElementById('whatsappHeaderButton');
    if (whatsappHeaderButton) {
        // Esta é a nova mensagem que você pediu
        const waMsg = encodeURIComponent("Vim do site Eleven Store e gostaria de verificar sobre ...");
        whatsappHeaderButton.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`;
        whatsappHeaderButton.target = "_blank"; // Abrir em nova aba
    }
    // ==============================================

    updateCartButtonText();
}