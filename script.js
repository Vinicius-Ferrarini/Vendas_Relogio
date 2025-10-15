    const botao = document.getElementById('enviarWhatsApp');
    botao.addEventListener('click', () => {
      const selecionados = document.querySelectorAll('input[type="checkbox"]:checked');
      if (selecionados.length === 0) {
        alert('Por favor, selecione pelo menos um relógio.');
        return;
      }

      const produtos = Array.from(selecionados).map(el => `- ${el.value}`).join('%0A');
      const mensagem = `Olá Vinicius! Tenho interesse nos seguintes relógios:%0A${produtos}`;
      
      // 👉 Coloque aqui o SEU número do WhatsApp (com DDI 55 e DDD)
      const numero = '5543999705837';
      const url = `https://wa.me/${numero}?text=${mensagem}`;
      
      window.open(url, '_blank');
    });