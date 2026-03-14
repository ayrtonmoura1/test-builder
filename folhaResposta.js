// folhaResposta.js - Gerador dinâmico do Cartão Resposta no Topo (antes das questões)

const FolhaResposta = {
    
    gerarHTML() {
        const answerContainer = document.getElementById('answerSheetContainer');
        const omrContainer = document.getElementById('omrContainer');
        if (!answerContainer || !omrContainer) return;

        // Se o usuário escolheu "Sem folha", oculta OMR e Gabarito, e define a classe global mode-none
        if (app.state.answerSheetMode === 'none') {
            answerContainer.innerHTML = '';
            answerContainer.style.display = 'none';
            omrContainer.innerHTML = '';
            omrContainer.style.display = 'none';
            
            document.body.classList.remove('mode-separate', 'mode-attached');
            document.body.classList.add('mode-none');
            return;
        }

        // Verifica se há pelo menos uma questão, senão não desenha
        const temQuestao = app.state.blocks.some(b => b.type === 'question');
        if (!temQuestao) {
            answerContainer.innerHTML = '';
            answerContainer.style.display = 'none';
            omrContainer.innerHTML = '';
            omrContainer.style.display = 'none';
            return;
        }

        // Adiciona a classe global no BODY para o CSS saber quebrar a página na hora da impressão se necessário
        document.body.classList.remove('mode-none', 'mode-separate', 'mode-attached');
        document.body.classList.add('mode-' + app.state.answerSheetMode);

        answerContainer.style.display = 'block';

        // 1. INJETA O OMR LADO A LADO COM AS INSTRUÇÕES
        if (app.state.includeStudentOmr) {
            omrContainer.style.display = 'flex';
            let omrHtml = `
                <div class="gabarito-codigo-box">
                    <div class="codigo-label-title">CÓDIGO DO ALUNO</div>
                    <div class="codigo-grid">
                        <div class="codigo-col">
                            <div class="codigo-box-spacer"></div>`; 
            for (let n = 0; n <= 9; n++) {
                omrHtml += `<div class="omr-codigo-wrapper"><div class="omr-mark"></div></div>`;
            }
            omrHtml += `       </div>`;

            for (let c = 0; c < 8; c++) {
                omrHtml += `<div class="codigo-col"><div class="codigo-box"></div>`;
                for (let n = 0; n <= 9; n++) {
                    omrHtml += `<div class="bubble-num">${n}</div>`;
                }
                omrHtml += `</div>`;
            }
            omrHtml += `   </div>
                </div>`;
            omrContainer.innerHTML = omrHtml;
        } else {
            // Se desmarcou OMR, oculta do lado da instrução
            omrContainer.style.display = 'none';
            omrContainer.innerHTML = '';
        }

        // 2. INJETA AS BOLINHAS DE GABARITO (Fica logo antes das questões)
        let bubblesHtml = `
            <div class="gabarito-enem-wrapper">
                
                <div class="q-label-float" style="margin-top: 15px; margin-bottom: 20px; justify-content: center; background: #e2e8f0; color: #0f172a; border-left: none; border-bottom: 2px solid #0f172a;">
                    FOLHA DE RESPOSTAS
                </div>

                <div class="gabarito-questions-grid">
        `;

        let qCount = 1;
        app.state.blocks.forEach((block) => {
            if (block.type === 'question') {
                const qNum = String(qCount).padStart(2, '0');
                
                if (block.qType === 'multiple') {
                    bubblesHtml += `<div class="gabarito-row">
                                <div class="omr-mark"></div>
                                <span class="gabarito-qnum">${qNum}</span>
                                <div class="gabarito-bubbles">`;
                    const letters = ['A', 'B', 'C', 'D', 'E'];
                    for (let i = 0; i < block.numAlts; i++) {
                        // NOVO: Adiciona a classe 'correct-bubble' se for o gabarito
                        const isCorrect = (block.correctAlt === i) ? ' correct-bubble' : '';
                        bubblesHtml += `<div class="bubble-letter${isCorrect}">${letters[i]}</div>`;
                    }
                    bubblesHtml += `   </div></div>`;
                } 
                else if (block.qType === 'vf') {
                    // NOVO: Prepara o texto do gabarito de V/F para o professor
                    const vfGabarito = block.correctVF ? block.correctVF.join(' - ') : '';
                    bubblesHtml += `<div class="gabarito-row">
                                <div class="omr-mark"></div>
                                <span class="gabarito-qnum">${qNum}</span>
                                <span class="vf-student-view" style="font-size: 10px; font-weight: bold; color: #0f172a; white-space: nowrap;">V ou F</span>
                                <span class="vf-teacher-view" style="display: none; font-size: 10px; font-weight: bold; color: #166534; white-space: nowrap;">${vfGabarito}</span>
                             </div>`;
                } 
                else if (block.qType === 'open') {
                     bubblesHtml += `<div class="gabarito-row">
                                <div class="omr-mark"></div>
                                <span class="gabarito-qnum">${qNum}</span>
                                <span style="font-size: 10px; font-weight: bold; color: #94a3b8; letter-spacing: 1px;">DISCURSIVA</span>
                             </div>`;
                }
                qCount++;
            }
        });

        bubblesHtml += `
                </div>
                
                <div style="width: 100%; border-bottom: 2px dashed #94a3b8; margin: 30px 0 20px 0;"></div>

            </div>
        `;
        answerContainer.innerHTML = bubblesHtml;
    }
};
