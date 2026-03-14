// historico.js - Sistema de Undo/Redo (Desfazer/Refazer) aprimorado

document.addEventListener('DOMContentLoaded', () => {
    // Aguarda meio segundo para garantir que o app.js principal já inicializou
    setTimeout(() => {
        if (typeof app === 'undefined') {
            console.error('App não encontrado. Verifique a ordem dos scripts no ficheiro HTML.');
            return;
        }

        // LIMITE AUMENTADO: Guarda até 15 versões completas (incluindo imagens pesadas e blocos)
        const maxHistory = 15;
        let undoStack = [];
        let redoStack = [];
        let isRestoring = false;
        let historyTimeout;

        // 1. Guarda o estado inicial (A prova assim que a página é carregada)
        const initialState = localStorage.getItem('enemBuilder_v53');
        if (initialState) {
            undoStack.push(initialState);
        }

        // 2. Interceta a função saveState original
        const originalSaveState = app.saveState.bind(app);

        app.saveState = function() {
            // Executa o processo normal de guardar no LocalStorage
            originalSaveState();

            // Se for o script a restaurar um estado antigo, ignora para não criar um loop infinito
            if (isRestoring) return;

            // Debounce otimizado (300ms): Capta alterações de blocos, textos e imagens com mais agilidade
            clearTimeout(historyTimeout);
            historyTimeout = setTimeout(() => {
                const currentState = localStorage.getItem('enemBuilder_v53');

                // Só adiciona ao histórico se o estado novo for realmente diferente do último guardado
                if (undoStack.length === 0 || undoStack[undoStack.length - 1] !== currentState) {
                    undoStack.push(currentState);

                    // Mantém os últimos 15 passos da prova
                    if (undoStack.length > maxHistory + 1) { 
                        undoStack.shift();
                    }

                    // Ao fazer uma nova alteração, as ações para "refazer" são apagadas
                    redoStack = [];
                }
            }, 300); // Sensibilidade aumentada para não perder inserções de blocos
        };

        // 3. Função de Desfazer (Ctrl + Z)
        window.desfazer = function() {
            if (undoStack.length > 1) {
                const estadoAtual = undoStack.pop();
                redoStack.push(estadoAtual);

                const estadoAnterior = undoStack[undoStack.length - 1];
                restaurarEstado(estadoAnterior);
            }
        };

        // 4. Função de Refazer (Ctrl + Y ou Ctrl + Shift + Z)
        window.refazer = function() {
            if (redoStack.length > 0) {
                const proximoEstado = redoStack.pop();
                undoStack.push(proximoEstado);

                restaurarEstado(proximoEstado);
            }
        };

        // 5. Injeta o estado antigo de volta no ecrã
        function restaurarEstado(stateStr) {
            isRestoring = true;

            // Devolve os dados para o LocalStorage
            localStorage.setItem('enemBuilder_v53', stateStr);

            // Força a aplicação a recarregar as variáveis da memória
            app.loadState();

            // Redesenha os blocos visuais de forma idêntica ao passo anterior
            if (app.state.blocks.length === 0) {
                app.addQuestion();
            } else {
                app.renderBlocks();
            }

            // Aplica tamanhos de letra caso tenham mudado
            app.applyGlobalSettings();

            isRestoring = false;
        }

        /// 6. Configura os atalhos de teclado globais
        document.addEventListener('keydown', (e) => {
            
            // NOVO: Se o usuário estiver focado num campo de texto (textarea ou input), 
            // deixa o navegador fazer o Ctrl+Z nativo para o texto e ignora a prova.
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
                return; 
            }

            // Previne o conflito com as teclas do próprio sistema operativo para a prova
            if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault(); 
                window.desfazer();
            } else if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                window.refazer();
            }
        });

    }, 500);
});
