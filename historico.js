// historico.js - Sistema de Undo/Redo (Desfazer/Refazer)

document.addEventListener('DOMContentLoaded', () => {
    // Aguarda meio segundo para garantir que o app.js principal já inicializou
    setTimeout(() => {
        if (typeof app === 'undefined') {
            console.error('App não encontrado. Verifique a ordem dos scripts no HTML.');
            return;
        }

        const maxHistory = 10;
        let undoStack = [];
        let redoStack = [];
        let isRestoring = false;
        let historyTimeout;

        // 1. Salva o estado inicial (A prova assim que a página carrega)
        const initialState = localStorage.getItem('enemBuilder_v53');
        if (initialState) {
            undoStack.push(initialState);
        }

        // 2. Intercepta a função saveState original do seu app
        const originalSaveState = app.saveState.bind(app);

        app.saveState = function() {
            // Executa o salvamento normal no LocalStorage
            originalSaveState();

            // Se for o script restaurando um estado antigo, ignora para não criar loop
            if (isRestoring) return;

            // Debounce: Agrupa alterações rápidas. 
            // Só salva o "passo" se o usuário parar de interagir por 500ms
            clearTimeout(historyTimeout);
            historyTimeout = setTimeout(() => {
                const currentState = localStorage.getItem('enemBuilder_v53');

                // Só adiciona se o estado novo for diferente do último salvo
                if (undoStack.length === 0 || undoStack[undoStack.length - 1] !== currentState) {
                    undoStack.push(currentState);

                    // Mantém apenas os últimos 10 passos (+1 para o estado atual no topo)
                    if (undoStack.length > maxHistory + 1) { 
                        undoStack.shift();
                    }

                    // Ao fazer uma nova alteração, o futuro (refazer) é apagado
                    redoStack = [];
                }
            }, 500);
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

        // 5. Injeta o estado antigo de volta no app
        function restaurarEstado(stateStr) {
            isRestoring = true;

            // Devolve os dados pro LocalStorage
            localStorage.setItem('enemBuilder_v53', stateStr);

            // Força o app a recarregar as variáveis de memória
            app.loadState();

            // Redesenha os blocos na tela
            if (app.state.blocks.length === 0) {
                app.addQuestion();
            } else {
                app.renderBlocks();
            }

            // Aplica fonte se tiver mudado
            app.applyGlobalSettings();

            isRestoring = false;
        }

        // 6. Configura os atalhos de teclado globais
        document.addEventListener('keydown', (e) => {
            // Verifica se o foco NÃO está num campo de título/input padrão nativo (para não roubar o Ctrl+Z nativo do navegador em pequenos textos)
            // Como usamos contenteditable para quase tudo, isso vai proteger a estrutura da prova inteira.
            
            if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault(); // Impede o comportamento padrão do Windows
                window.desfazer();
            } else if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                window.refazer();
            }
        });

    }, 500);
});
