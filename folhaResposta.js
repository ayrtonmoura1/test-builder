// folhaResposta.js - Gerador do Cartão Resposta estilo ENEM com OMR (5 Colunas)

const FolhaResposta = {
    
    // --- NOVA FUNÇÃO: Ligar/Desligar a visualização na tela ---
    togglePreview(checkbox) {
        if (checkbox.checked) {
            app.saveState(); // Salva qualquer alteração pendente
            
            const temQuestao = app.state.blocks.some(b => b.type === 'question');
            if (!temQuestao) {
                alert("Sua prova precisa ter pelo menos uma questão para gerar o Cartão Resposta.");
                checkbox.checked = false; // Desmarca o checkbox automaticamente
                return;
            }

            this.gerarHTML(); // Desenha as bolinhas
            document.body.classList.add('print-answer-sheet'); // Esconde a prova e mostra o gabarito
        } else {
            // Se desmarcar, apenas volta a mostrar a prova normal
            document.body.classList.remove('print-answer-sheet');
        }
    },

    imprimir() {
        // Verifica se o professor já está com o checkbox marcado
        const isPreviewAtivo = document.body.classList.contains('print-answer-sheet');

        // Se o preview NÃO estiver ativo, faz o processo silencioso (cria, imprime e apaga)
        if (!isPreviewAtivo) {
            app.saveState(); 
            const temQuestao = app.state.blocks.some(b => b.type === 'question');
            if (!temQuestao) {
                alert("Sua prova precisa ter pelo menos uma questão para gerar o Cartão Resposta.");
                return;
            }
            this.gerarHTML(); 
            document.body.classList.add('print-answer-sheet');
        }

        // Chama a janela de impressão
        setTimeout(() => {
            window.print();
            
            // Só esconde o gabarito depois de imprimir SE o checkbox NÃO estiver marcado
            if (!isPreviewAtivo) {
                setTimeout(() => {
                    document.body.classList.remove('print-answer-sheet');
                }, 500);
            }
        }, 100);
    },

    gerarHTML() {
        const container = document.getElementById('answerSheetContainer');
        if (!container) return;

        const instructionsEl = document.querySelector('[data-field="instructions"]');
        const instrucoesHTML = instructionsEl ? instructionsEl.innerHTML : 'Preencha o cabeçalho. Marque apenas uma alternativa por questão.';

        // 1. Constrói o Cabeçalho
        let html = `
            <div class="gabarito-enem-wrapper">
                <div class="gabarito-top-section">
                    <div class="gabarito-instructions">
                        ${instrucoesHTML}
                    </div>
                    
                    <div class="gabarito-codigo-box">
                        <div class="codigo-label-title">CÓDIGO DO ALUNO</div>
                        <div class="codigo-grid">
        `;
        
        // --- NOVO: Coluna de Marcas OMR para o Código do Aluno ---
        html += `<div class="codigo-col">
                    <div class="codigo-box-spacer"></div>`; // Pula o espaço da caixinha branca
        for (let n = 0; n <= 9; n++) {
            // Cada marca OMR fica dentro de um wrapper da exata altura da bolinha para alinhar perfeitamente
            html += `<div class="omr-codigo-wrapper"><div class="omr-mark"></div></div>`;
        }
        html += `</div>`;

        // --- Gera 8 colunas de bolinhas (0 a 9) ---
        for (let c = 0; c < 8; c++) {
            html += `<div class="codigo-col"><div class="codigo-box"></div>`;
            for (let n = 0; n <= 9; n++) {
                html += `<div class="bubble-num">${n}</div>`;
            }
            html += `</div>`;
        }
        
        html += `       </div>
                    </div>
                </div>
                <div class="gabarito-questions-grid">
        `;

        // 2. Constrói as Bolinhas das Questões
        let qCount = 1;
        app.state.blocks.forEach((block) => {
            if (block.type === 'question') {
                const qNum = String(qCount).padStart(2, '0');
                
                if (block.qType === 'multiple') {
                    html += `<div class="gabarito-row">
                                <div class="omr-mark"></div>
                                <span class="gabarito-qnum">${qNum}</span>
                                <div class="gabarito-bubbles">`;
                    const letters = ['A', 'B', 'C', 'D', 'E'];
                    for (let i = 0; i < block.numAlts; i++) {
                        html += `<div class="bubble-letter">${letters[i]}</div>`;
                    }
                    html += `   </div></div>`;
                } 
                else if (block.qType === 'vf') {
                    // --- NOVO: V/F agora apenas escreve o texto ---
                    html += `<div class="gabarito-row">
                                <div class="omr-mark"></div>
                                <span class="gabarito-qnum">${qNum}</span>
                                <span style="font-size: 10px; font-weight: bold; color: #0f172a; white-space: nowrap;">V ou F</span>
                             </div>`;
                } 
                else if (block.qType === 'open') {
                     html += `<div class="gabarito-row">
                                <div class="omr-mark"></div>
                                <span class="gabarito-qnum">${qNum}</span>
                                <span style="font-size: 10px; font-weight: bold; color: #94a3b8; letter-spacing: 1px;">DISCURSIVA</span>
                             </div>`;
                }
                qCount++;
            }
        });

        html += `
                </div>
            </div>
        `;
        container.innerHTML = html;
    }
};
