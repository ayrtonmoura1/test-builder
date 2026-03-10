document.addEventListener('DOMContentLoaded', () => {
    // 1. Injeta o CSS da legenda de forma transparente
    const style = document.createElement('style');
    style.innerHTML = `
        .legenda-customizada {
            position: fixed;
            background-color: #1e293b;
            color: #f8fafc;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            pointer-events: none;
            z-index: 100000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease, transform 0.2s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            max-width: 220px;
            text-align: center;
            line-height: 1.4;
        }
        .legenda-customizada.show {
            opacity: 1;
            visibility: visible;
            transform: translateY(0) !important;
        }
        @media print {
            .legenda-customizada { display: none !important; }
        }
    `;
    document.head.appendChild(style);

    // 2. Cria o balãozinho invisível no corpo da página
    const tooltip = document.createElement('div');
    tooltip.className = 'legenda-customizada';
    document.body.appendChild(tooltip);

    // Variável para controlar o cronômetro de 3 segundos
    let tempoLegenda; 

    // 3. Dicionário com as dicas
    const dicas = {
        'app.addQuestion()': 'Insere uma nova questão (Múltipla Escolha, Verdadeiro/Falso ou Aberta).',
        'app.addTextBlock()': 'Insere um bloco de texto livre para enunciados longos, imagens ou textos de apoio.',
        'app.addDivider()': 'Cria uma linha com título para separar áreas da prova (Ex: Matemática, Linguagens).',
        'app.addSpacer()': 'Adiciona um bloco em branco com altura ajustável (ideal para cálculos ou rascunho).',
        'app.toggleColumns()': 'Alterna o layout de toda a prova entre 1 coluna inteira ou 2 colunas divididas. Blocos com cadeado fechado 🔒 ocupam a página toda, e cadeados abertos 🔓 se organizam em colunas',
        'document.getElementById(\'importUpload\').click()': 'Importa uma prova (.json) que você salvou no computador para continuar editando.',
        'app.exportJSON()': 'Salva sua prova atual no computador (em .json) para você não perder o progresso.',
        'window.print()': 'Gera o PDF final da prova limpo, pronto para entregar ao aluno.',
        'printWithAnswers()': 'Gera o PDF destacando o gabarito e as habilidades BNCC para uso do professor.',
        'app.exportXLSX()': 'Baixa uma planilha Excel detalhada com as respostas e competências exigidas.',
        'app.clearData()': 'Apaga permanentemente todo o conteúdo atual e inicia uma prova limpa.'
    };

    // 4. Lógica de ativação (Quando o mouse entra)
    document.body.addEventListener('mouseover', (e) => {
        const btn = e.target.closest('button, .floating-donate-btn, .alt-radio');
        if (!btn) return;

        let texto = '';

        if (btn.getAttribute('onclick') && dicas[btn.getAttribute('onclick')]) {
            texto = dicas[btn.getAttribute('onclick')];
        } else if (btn.hasAttribute('title')) {
            texto = btn.getAttribute('title');
            btn.setAttribute('data-title', texto);
            btn.removeAttribute('title'); 
        } else if (btn.hasAttribute('data-title')) {
            texto = btn.getAttribute('data-title');
        }

        if (texto === 'Bloqueado na linha inteira') {
            texto = '🔒 <b>Cadeado Fechado:</b> Este bloco não se divide, ocupando a largura inteira da página.';
        } else if (texto === 'Destravado para 2 Colunas') {
            texto = '🔓 <b>Cadeado Aberto:</b> Este bloco se adapta e quebra para caber no formato de 2 colunas.';
        }

        if (texto) {
            tooltip.innerHTML = texto;
            const rect = btn.getBoundingClientRect();
            
            let top = rect.bottom + 8;
            let left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);

            if (left < 10) left = 10;
            if (left + tooltip.offsetWidth > window.innerWidth - 10) {
                left = window.innerWidth - tooltip.offsetWidth - 10;
            }
            
            if (top + tooltip.offsetHeight > window.innerHeight - 10) {
                top = rect.top - tooltip.offsetHeight - 8;
                tooltip.style.transform = 'translateY(5px)';
            } else {
                tooltip.style.transform = 'translateY(-5px)';
            }

            tooltip.style.top = top + 'px';
            tooltip.style.left = left + 'px';
            
            tooltip.classList.add('show');

            // CRONÔMETRO DE 3 SEGUNDOS:
            clearTimeout(tempoLegenda); // Zera o cronômetro anterior se houver
            tempoLegenda = setTimeout(() => {
                tooltip.classList.remove('show');
            }, 2000); // 3000 ms = 3 segundos
        }
    });

    // 5. Lógica de desativação (Quando o mouse sai)
    document.body.addEventListener('mouseout', (e) => {
        const btn = e.target.closest('button, .floating-donate-btn, .alt-radio');
        
        if (btn && !btn.contains(e.relatedTarget)) {
            tooltip.classList.remove('show');
            clearTimeout(tempoLegenda); // Cancela a contagem se o mouse sair antes dos 3 segundos
        }
    });
});
