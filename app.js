const app = {
    state: {
        fontSize: '12px',
        columns: 1, // NOVO: Controle global de colunas (1 ou 2)
        blocks: [],
        activeBlockId: null,
        savedSelection: null
    },

    init() {
        this.loadState();
        this.applyGlobalSettings();
        this.bindHeaderEvents();
        this.bindPasteEvent();
        this.buildSymbolPicker(); 
        this.bindEmojiPicker(); 
        if (this.state.blocks.length === 0) {
            this.addQuestion();
        } else {
            this.renderBlocks();
        }
    },

    handleGlobalClick(event) {
        if(!event.target.closest('.block-item') && !event.target.closest('.toolbar') && !event.target.closest('.modal-overlay') && !event.target.closest('.btn-open-symbols')) {
            this.setActiveBlock(null);
        }
    },

    bindPasteEvent() {
        document.addEventListener('paste', (e) => {
            if (!e.target.closest('.question-text, .alt-text, .exam-instructions')) return;

            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (let index in items) {
                const item = items[index];
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.compressImage(event.target.result, 800, (compressedBase64) => {
                            const imgHTML = `&nbsp;<span class="resizable-image" contenteditable="false"><img src="${compressedBase64}"></span>&nbsp;`;
                            document.execCommand('insertHTML', false, imgHTML);
                            this.saveState();
                        });
                    };
                    reader.readAsDataURL(blob);
                }
            }
        });
    },

    compressImage(base64Str, maxWidth, callback) {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.8));
        };
    },

    buildSymbolPicker() {
        const ranges = {
            'math': [[0x2200, 0x22FF], [0x00B1, 0x00B1], [0x00D7, 0x00D7], [0x00F7, 0x00F7]], 
            'greek': [[0x0391, 0x03A9], [0x03B1, 0x03C9]], 
            'arrows': [[0x2190, 0x21FF]] 
        };

        for (const [tab, arr] of Object.entries(ranges)) {
            const container = document.getElementById(`tab-${tab}`);
            if(!container) continue;
            container.innerHTML = ''; 
            
            arr.forEach(range => {
                for (let i = range[0]; i <= range[1]; i++) {
                    const char = String.fromCharCode(i);
                    if (char.trim() !== '') {
                        const btn = document.createElement('button');
                        btn.innerText = char;
                        btn.onmousedown = (e) => { e.preventDefault(); this.insertSymbol(char); };
                        container.appendChild(btn);
                    }
                }
            });
        }
    },

    bindEmojiPicker() {
        document.querySelector('emoji-picker').addEventListener('emoji-click', event => {
            this.insertSymbol(event.detail.unicode);
        });
    },

    openSymbolModal() {
        const sel = window.getSelection();
        if(sel.rangeCount > 0) {
            this.state.savedSelection = sel.getRangeAt(0).cloneRange();
        }
        document.getElementById('symbolModalOverlay').style.display = 'flex';
    },

    closeSymbolModal() {
        document.getElementById('symbolModalOverlay').style.display = 'none';
        this.state.savedSelection = null;
    },

    switchTab(tabId, btnElement) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.symbol-grid, .emoji-container').forEach(grid => grid.classList.remove('active-grid'));
        btnElement.classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active-grid');
    },

    insertSymbol(char) {
        if (this.state.savedSelection) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(this.state.savedSelection);
            
            let node = this.state.savedSelection.commonAncestorContainer;
            if(node.nodeType === 3) node = node.parentNode;
            if(node && node.focus) node.focus();

            document.execCommand('insertText', false, char);
        }
        this.closeSymbolModal();
        this.saveState();
    },

    insertMath() {
        const mathHTML = `&nbsp;<span class="math-wrapper" contenteditable="false"><span class="delete-math no-print" onclick="this.parentElement.remove(); app.saveState();" title="Excluir equação">×</span><math-field virtual-keyboard-mode="off" placeholder="f(x)"></math-field></span>&nbsp;`;
        document.execCommand('insertHTML', false, mathHTML);
        this.saveState();
    },

    toggleQuote() {
        const selection = document.getSelection();
        if (!selection.rangeCount) return;

        let node = selection.anchorNode;
        let isQuote = false;
        let quoteNode = null;
        
        while (node && node.nodeName !== 'DIV' && !node.classList?.contains('question-text') && !node.classList?.contains('alt-text')) {
            if (node.nodeName === 'BLOCKQUOTE') {
                isQuote = true;
                quoteNode = node;
                break;
            }
            node = node.parentNode;
        }

        if (isQuote) {
            const docFrag = document.createDocumentFragment();
            while (quoteNode.firstChild) docFrag.appendChild(quoteNode.firstChild);
            quoteNode.parentNode.replaceChild(docFrag, quoteNode);
        } else {
            document.execCommand('formatBlock', false, 'BLOCKQUOTE');
        }
        this.saveState();
    },

    formatTextSize(command) {
        const sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) return;

        let parent = sel.getRangeAt(0).commonAncestorContainer;
        if (parent.nodeType === 3) parent = parent.parentNode;

        let currentSizePx = 12; 
        const computedStyle = window.getComputedStyle(parent);
        if (computedStyle.fontSize) {
            currentSizePx = Math.round(parseFloat(computedStyle.fontSize));
        }

        let newSizePx = currentSizePx;
        if (command === 'increase') newSizePx += 1;
        else if (command === 'decrease') newSizePx -= 1;

        if (newSizePx < 5) newSizePx = 5;
        if (newSizePx > 18) newSizePx = 18;

        let targetSpan = parent.closest ? parent.closest('span.custom-size') : null;

        if (targetSpan) {
            targetSpan.style.fontSize = newSizePx + 'px';
        } else {
            const range = sel.getRangeAt(0);
            const span = document.createElement('span');
            span.className = 'custom-size';
            span.style.fontSize = newSizePx + 'px';
            
            span.appendChild(range.extractContents());
            range.insertNode(span);
            
            sel.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            sel.addRange(newRange);
        }

        this.showFontGhost(newSizePx);
        this.saveState();
    },

    showFontGhost(size) {
        let ghost = document.getElementById('fontGhostNotification');
        if (!ghost) {
            ghost = document.createElement('div');
            ghost.id = 'fontGhostNotification';
            document.body.appendChild(ghost);
        }
        ghost.innerText = size;
        
        ghost.classList.remove('show');
        void ghost.offsetWidth; 
        
        ghost.classList.add('show');
        
        clearTimeout(this.ghostTimer);
        this.ghostTimer = setTimeout(() => {
            ghost.classList.remove('show');
        }, 1000);
    },

    changeCase(type) {
        const sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) return;

        const text = sel.toString();
        let newText = text;

        if (type === 'upper') newText = text.toUpperCase();
        if (type === 'lower') newText = text.toLowerCase();
        if (type === 'title') {
            newText = text.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());
        }

        document.execCommand('insertText', false, newText);

        const newSel = window.getSelection();
        if (newSel.focusNode && newSel.focusNode.nodeType === Node.TEXT_NODE) {
            const endOffset = newSel.focusOffset;
            const startOffset = Math.max(0, endOffset - newText.length);
            newSel.setBaseAndExtent(newSel.focusNode, startOffset, newSel.focusNode, endOffset);
        }
        this.saveState();
    },

    exportJSON() {
        this.saveState();
        if (this.state.blocks.length === 0) {
            alert("Não há blocos para exportar.");
            return;
        }
        const dataStr = JSON.stringify(this.state.blocks, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `banco_questoes_enem_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // NOVO: Importação com Renumeração e Cadeado
    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedBlocks = JSON.parse(e.target.result);
                if (Array.isArray(importedBlocks)) {
                    importedBlocks.forEach(block => {
                        block.id = this.generateId();
                        // Garante que o bloco antigo ganhe a propriedade locked
                        if(block.locked === undefined) {
                            block.locked = block.width === 'narrow' ? false : true; 
                        }
                        this.state.blocks.push(block); // Anexa ao final
                    });
                    
                    this.renderBlocks(); // A renderização já cuida de re-enumerar todas as questões!
                    this.saveState();
                    alert(`${importedBlocks.length} blocos importados com sucesso!`);
                    
                    setTimeout(() => {
                        const scrollContainer = document.querySelector('.paper-container');
                        if(scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
                    }, 100);

                } else {
                    alert("Arquivo inválido. Formato de banco de questões não reconhecido.");
                }
            } catch (error) {
                alert("Erro ao ler o arquivo JSON.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    changeFontSize() { 
        this.state.fontSize = document.getElementById('fontSizeSelect').value; 
        this.applyGlobalSettings(); 

        document.querySelectorAll('.question-text, .alt-text, .exam-instructions, .text-content').forEach(container => {
            container.querySelectorAll('*:not(math-field):not(.math-wrapper)').forEach(el => {
                if(el.style.fontSize) {
                    el.style.fontSize = ''; 
                    if(el.getAttribute('style') === '') el.removeAttribute('style');
                }
            });
            container.querySelectorAll('font[size]').forEach(el => {
                el.removeAttribute('size');
            });
            container.querySelectorAll('span.custom-size').forEach(el => {
                const docFrag = document.createDocumentFragment();
                while (el.firstChild) docFrag.appendChild(el.firstChild);
                el.parentNode.replaceChild(docFrag, el);
            });
        });

        this.saveState(); 
    },

    saveState() {
        const headerData = {
            title: document.querySelector('[data-field="title"]').innerText,
            school: document.querySelector('[data-field="school"]').innerText,
            class: document.querySelector('[data-field="class"]').innerText,
            date: document.querySelector('[data-field="date"]').innerText,
            instructions: document.querySelector('[data-field="instructions"]').innerHTML,
            logo: document.getElementById('logoPreview').src
        };

        const blocks = [];
        document.querySelectorAll('.block-item').forEach(blockEl => {
            const id = blockEl.dataset.id;
            const type = blockEl.dataset.type;
            const mode = blockEl.dataset.mode;
            const originalBlock = this.state.blocks.find(b => b.id === id) || {};
            // NOVO: Preserva a propriedade locked ao salvar
            const locked = originalBlock.locked !== undefined ? originalBlock.locked : true;

            if (type === 'divider') {
                blocks.push({
                    id, type, mode: 'edit', locked,
                    text: blockEl.querySelector('.divider-text') ? blockEl.querySelector('.divider-text').innerText : originalBlock.text
                });
            } else if (type === 'text') {
                blocks.push({
                    id, type, mode: 'edit', locked,
                    text: blockEl.querySelector('.question-text') ? blockEl.querySelector('.question-text').innerHTML : originalBlock.text
                });
            } else if (type === 'spacer') { 
                blocks.push({
                    id, type, mode: 'edit', locked,
                    height: blockEl.querySelector('.spacer-slider') ? blockEl.querySelector('.spacer-slider').value : originalBlock.height
                });
            } else if (type === 'question') {
                if (mode === 'setup') {
                    originalBlock.locked = locked;
                    blocks.push(originalBlock);
                } else {
                    const qType = originalBlock.qType;
                    const alts = [];
                    let correctAltIndex = null;
                    let correctVFArray = originalBlock.correctVF || [];
                    
                    if(qType === 'multiple') {
                        blockEl.querySelectorAll('.alternative-item').forEach((item, index) => {
                            alts.push(item.querySelector('.alt-text').innerHTML);
                            const radio = item.querySelector('.alt-radio');
                            if(radio && radio.checked) correctAltIndex = index;
                        });
                    } else if (qType === 'vf') {
                        blockEl.querySelectorAll('.alternative-item').forEach((item, index) => {
                            alts.push(item.querySelector('.alt-text').innerHTML);
                        });
                        correctVFArray = originalBlock.correctVF;
                    }

                    blocks.push({
                        id, type, mode, qType, locked,
                        numAlts: originalBlock.numAlts,
                        numLines: originalBlock.numLines,
                        text: blockEl.querySelector('.question-text') ? blockEl.querySelector('.question-text').innerHTML : originalBlock.text,
                        alternatives: alts,
                        correctAlt: correctAltIndex,
                        correctVF: correctVFArray,
                        correctText: blockEl.querySelector('.gabarito-input') ? blockEl.querySelector('.gabarito-input').value : '',
                        habilidade: blockEl.querySelector('.habilidade-input') ? blockEl.querySelector('.habilidade-input').value : originalBlock.habilidade
                        // NOVO: qNumber manual removido do estado.
                    });
                }
            }
        });

        // NOVO: Salva estado das colunas
        const dataToSave = { fontSize: this.state.fontSize, columns: this.state.columns, header: headerData, blocks };
        localStorage.setItem('enemBuilder_v53', JSON.stringify(dataToSave));
        this.state.blocks = blocks;
    },

    loadState() {
        const saved = localStorage.getItem('enemBuilder_v53') || localStorage.getItem('enemBuilder_v52') || localStorage.getItem('enemBuilder_v51');
        if (saved) {
            const data = JSON.parse(saved);
            this.state.fontSize = data.fontSize || '12px';
            document.getElementById('fontSizeSelect').value = this.state.fontSize;

            // NOVO: Recupera estado das colunas
            if (data.columns !== undefined) this.state.columns = data.columns;

            if(data.header) {
                document.querySelector('[data-field="title"]').innerText = data.header.title || '';
                document.querySelector('[data-field="school"]').innerText = data.header.school || '';
                document.querySelector('[data-field="class"]').innerText = data.header.class || '';
                document.querySelector('[data-field="date"]').innerText = data.header.date || '';
                if(data.header.instructions) document.querySelector('[data-field="instructions"]').innerHTML = data.header.instructions;
                if(data.header.logo && data.header.logo.length > 50) {
                    const img = document.getElementById('logoPreview');
                    img.src = data.header.logo;
                    img.style.display = 'block';
                    document.getElementById('logoPlaceholder').style.display = 'none';
                }
            }
            if(data.blocks) {
                // NOVO: Migra dados antigos (width -> locked)
                data.blocks.forEach(b => { 
                    if(b.locked === undefined) {
                        b.locked = (b.width === 'narrow') ? false : true;
                    }
                });
                this.state.blocks = data.blocks;
            }
        }
    },

    clearData() {
        if(confirm("Toda a prova será apagada. Deseja continuar?")) {
            localStorage.removeItem('enemBuilder_v53');
            localStorage.removeItem('enemBuilder_v52');
            localStorage.removeItem('enemBuilder_v51');
            location.reload();
        }
    },

    setActiveBlock(id) {
        this.state.activeBlockId = id;
        document.querySelectorAll('.block-item').forEach(el => el.classList.remove('active'));
        if(id) {
            const el = document.querySelector(`[data-id="${id}"]`);
            if(el) el.classList.add('active');
        }
    },

    // NOVO: Função Global para alternar modo de colunas da prova inteira
    toggleColumns() {
        this.state.columns = this.state.columns === 1 ? 2 : 1;
        this.applyColumnState();
        this.saveState();
    },

    applyColumnState() {
        const container = document.getElementById('blocksContainer');
        const btn = document.getElementById('btnToggleColumns');
        if (this.state.columns === 1) {
            container.classList.remove('cols-2');
            container.classList.add('cols-1');
            if(btn) btn.innerHTML = '<i class="ph ph-columns"></i> Mudar para 2 Colunas';
        } else {
            container.classList.remove('cols-1');
            container.classList.add('cols-2');
            if(btn) btn.innerHTML = '<i class="ph ph-list-dashes"></i> Mudar para 1 Coluna';
        }
    },

    // NOVO: Controle de Cadeado por Bloco
    toggleBlockLock(id) {
        this.saveState();
        const block = this.state.blocks.find(b => b.id === id);
        if(block) {
            block.locked = !block.locked; // Inverte o estado
            this.renderBlocks();
            this.saveState();
        }
    },

    renderBlocks() {
        this.applyColumnState(); // Garante o layout visual
        const container = document.getElementById('blocksContainer');
        const scrollContainer = document.querySelector('.paper-container');
        
        let currentScroll = 0;
        if(scrollContainer) currentScroll = scrollContainer.scrollTop; 

        container.innerHTML = '';

        // NOVO: Processamento da Numeração Automática (sem input manual)
        let questionCounter = 1;

        this.state.blocks.forEach((block) => {
            let el;
            
            // Atribui o número da questão em tempo de renderização
            if (block.type === 'question') {
                block.autoNumber = questionCounter++;
            }

            if (block.type === 'divider') el = this.createDividerDOM(block);
            else if (block.type === 'text') el = this.createTextEditDOM(block);
            else if (block.type === 'spacer') el = this.createSpacerDOM(block); 
            else {
                if (block.mode === 'setup') el = this.createQuestionSetupDOM(block);
                else el = this.createQuestionEditDOM(block);
            }
            
            // NOVO: Aplica a classe CSS do Cadeado (Locked vs Unlocked)
            el.classList.add(block.locked ? 'block-locked' : 'block-unlocked');

            if(block.id === this.state.activeBlockId) el.classList.add('active');
            
            el.addEventListener('mousedown', (e) => {
                if(!e.target.closest('.drag-handle') && !e.target.closest('math-field') && !e.target.closest('.delete-math') && !e.target.closest('button') && !e.target.closest('input.spacer-slider')) {
                    this.setActiveBlock(block.id);
                }
            });
            this.attachDragEvents(el, block.id);
            container.appendChild(el);
        });

        document.querySelectorAll('math-field').forEach(mf => {
            mf.addEventListener('input', () => this.saveState());
        });

        if(scrollContainer) {
            scrollContainer.offsetHeight; 
            scrollContainer.scrollTop = currentScroll;
        }
    },

    insertBlockContextually(newBlock) {
        if (this.state.activeBlockId) {
            const index = this.state.blocks.findIndex(b => b.id === this.state.activeBlockId);
            if (index > -1) {
                this.state.blocks.splice(index + 1, 0, newBlock);
            } else {
                this.state.blocks.push(newBlock);
            }
        } else {
            this.state.blocks.push(newBlock);
        }
        this.renderBlocks();
        this.setActiveBlock(newBlock.id); 
        this.saveState();
        
        setTimeout(() => {
            const el = document.querySelector(`[data-id="${newBlock.id}"]`);
            if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
    },

    applyGlobalSettings() {
        document.documentElement.style.setProperty('--dynamic-font-size', this.state.fontSize);
    },

    bindHeaderEvents() {
        document.querySelectorAll('.editable-field, .exam-instructions').forEach(el => el.addEventListener('input', () => this.saveState()));
    },
    generateId() { return Math.random().toString(36).substr(2, 9); },

    handleLogoUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('logoPreview').src = e.target.result;
                document.getElementById('logoPreview').style.display = 'block';
                document.getElementById('logoPlaceholder').style.display = 'none';
                this.saveState();
            };
            reader.readAsDataURL(file);
        }
    },

    formatText(command, value = null) { document.execCommand(command, false, value); this.saveState(); },

    draggedId: null,

    // NOVO: Drag events modificados para permitir apenas movimento Vertical
    attachDragEvents(div, blockId) {
        const handle = div.querySelector('.drag-handle');
        if(!handle) return;
        
        handle.addEventListener('mousedown', () => div.setAttribute('draggable', 'true'));
        handle.addEventListener('mouseup', () => div.setAttribute('draggable', 'false'));
        
        div.addEventListener('dragstart', (e) => { 
            this.draggedId = blockId; 
            e.dataTransfer.effectAllowed = 'move'; 
            div.style.opacity = '0.5'; 
            this.setActiveBlock(null); // Desmarca edição no drag
        });
        
        div.addEventListener('dragend', () => { 
            div.style.opacity = '1'; 
            div.setAttribute('draggable', 'false'); 
            document.querySelectorAll('.block-item').forEach(el => {
                el.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        });
        
        div.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            e.dataTransfer.dropEffect = 'move';
            const rect = div.getBoundingClientRect();
            
            div.classList.remove('drag-over-top', 'drag-over-bottom');
            
            // Avaliação apenas vertical (top ou bottom)
            const isAfter = e.clientY > (rect.top + rect.height / 2);
            if (isAfter) {
                div.classList.add('drag-over-bottom');
            } else {
                div.classList.add('drag-over-top');
            }
            
            div.dataset.dropPos = isAfter ? 'after' : 'before';
        });
        
        div.addEventListener('dragleave', () => {
            div.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        
        div.addEventListener('drop', (e) => {
            e.preventDefault();
            const position = div.dataset.dropPos || 'before';
            div.classList.remove('drag-over-top', 'drag-over-bottom');
            
            if (this.draggedId && this.draggedId !== blockId) {
                this.reorderBlocks(this.draggedId, blockId, position);
            }
        });
    },

    reorderBlocks(draggedId, targetId, position) {
        this.saveState();
        const draggedIndex = this.state.blocks.findIndex(b => b.id === draggedId);
        let targetIndex = this.state.blocks.findIndex(b => b.id === targetId);
        
        if(draggedIndex > -1 && targetIndex > -1) {
            const [draggedBlock] = this.state.blocks.splice(draggedIndex, 1);
            
            targetIndex = this.state.blocks.findIndex(b => b.id === targetId);
            
            if (position === 'after') {
                this.state.blocks.splice(targetIndex + 1, 0, draggedBlock);
            } else {
                this.state.blocks.splice(targetIndex, 0, draggedBlock);
            }
            
            this.renderBlocks();
            this.saveState();
        }
    },

    // NOVO: Todos os blocos novos nascem "locked: true" (100% de largura)
    addDivider() {
        this.saveState();
        this.insertBlockContextually({ id: this.generateId(), type: 'divider', locked: true, text: 'LINGUAGENS, CÓDIGOS E SUAS TECNOLOGIAS', mode: 'edit' });
    },

    addTextBlock() {
        this.saveState();
        this.insertBlockContextually({ id: this.generateId(), type: 'text', locked: true, text: '', mode: 'edit' });
    },

    addSpacer() {
        this.saveState();
        this.insertBlockContextually({ id: this.generateId(), type: 'spacer', locked: true, height: 100, mode: 'edit' });
    },

    addQuestion() {
        this.saveState();
        this.insertBlockContextually({
            id: this.generateId(), type: 'question', locked: true, mode: 'setup', qType: 'multiple',
            numAlts: 5, numLines: 5, text: '', alternatives: [], correctAlt: null, correctVF: [], correctText: '', habilidade: ''
        });
    },

    deleteBlock(id) {
        this.saveState();
        this.state.blocks = this.state.blocks.filter(b => b.id !== id);
        if(this.state.activeBlockId === id) this.state.activeBlockId = null;
        this.renderBlocks();
        this.saveState();
    },

    toggleSetupFields(id) {
        const type = document.getElementById(`qType_${id}`).value;
        document.getElementById(`wrap_alts_${id}`).style.display = type === 'multiple' ? 'flex' : 'none';
        document.getElementById(`wrap_lines_${id}`).style.display = type === 'open' ? 'flex' : 'none';
        document.getElementById(`wrap_vf_${id}`).style.display = type === 'vf' ? 'flex' : 'none';
    },

    createQuestionSetupDOM(block) {
        const div = document.createElement('div');
        div.className = 'question-block block-item no-print';
        div.dataset.id = block.id; div.dataset.type = 'question'; div.dataset.mode = 'setup';

        // NOVO: Renderiza o Cadeado no setup
        div.innerHTML = `
            <div class="question-header">
                <div class="question-header-left"><span class="drag-handle" title="Arraste para reordenar"><i class="ph ph-dots-six-vertical"></i></span></div>
                <div class="block-controls">
                    <button onclick="app.toggleBlockLock('${block.id}')" class="${block.locked ? 'locked-btn' : 'unlocked-btn'}" title="${block.locked ? 'Bloqueado na linha inteira' : 'Destravado para 2 Colunas'}">
                        <i class="ph ${block.locked ? 'ph-lock-key' : 'ph-lock-key-open'}"></i>
                    </button>
                    <button class="btn-danger" onclick="app.deleteBlock('${block.id}')"><i class="ph ph-trash"></i></button>
                </div>
            </div>
            <div class="setup-mode">
                <h4>Estrutura da QUESTÃO</h4>
                <div class="setup-form">
                    <label>Tipo: 
                        <select id="qType_${block.id}" onchange="app.toggleSetupFields('${block.id}')">
                            <option value="multiple" ${block.qType === 'multiple' ? 'selected' : ''}>Múltipla Escolha</option>
                            <option value="vf" ${block.qType === 'vf' ? 'selected' : ''}>Verdadeiro/Falso</option>
                            <option value="open" ${block.qType === 'open' ? 'selected' : ''}>Dissertativa</option>
                        </select>
                    </label>
                    <label id="wrap_alts_${block.id}" style="display:${block.qType === 'multiple' ? 'flex' : 'none'};">Alternativas: <select id="numAlts_${block.id}"><option value="2">2</option><option value="4">4</option><option value="5" selected>5 (Padrão)</option></select></label>
                    <label id="wrap_vf_${block.id}" style="display:${block.qType === 'vf' ? 'flex' : 'none'};">Qtd. de Afirmações: <input type="number" id="numVF_${block.id}" value="4" min="1" max="15"></label>
                    <label id="wrap_lines_${block.id}" style="display:${block.qType === 'open' ? 'flex' : 'none'};">Linhas de Resposta: <input type="number" id="numLines_${block.id}" value="5" min="1" max="30"></label>
                </div>
                <button class="btn-primary" style="margin: 0 auto;" onclick="app.confirmQuestionSetup('${block.id}')">Gerar Bloco</button>
            </div>
        `;
        return div;
    },

    confirmQuestionSetup(id) {
        this.saveState();
        const b = this.state.blocks.find(b => b.id === id);
        if (b) {
            b.qType = document.getElementById(`qType_${id}`).value;
            b.numLines = parseInt(document.getElementById(`numLines_${id}`) ? document.getElementById(`numLines_${id}`).value : 5);
            b.mode = 'edit';
            
            if(b.qType === 'multiple') {
                b.numAlts = parseInt(document.getElementById(`numAlts_${id}`).value);
                const letters = ['A', 'B', 'C', 'D', 'E'];
                b.alternatives = Array.from({length: b.numAlts}, (_, i) => `Alternativa ${letters[i]}`);
            } else if (b.qType === 'vf') {
                b.numAlts = parseInt(document.getElementById(`numVF_${id}`).value);
                b.alternatives = Array.from({length: b.numAlts}, () => `Afirmação...`);
                b.correctVF = Array(b.numAlts).fill('V');
            }

            this.renderBlocks();
            this.saveState();
        }
    },

    toggleVF(blockId, index) {
        const b = this.state.blocks.find(b => b.id === blockId);
        if (b && b.correctVF) {
            b.correctVF[index] = b.correctVF[index] === 'V' ? 'F' : 'V';
            this.renderBlocks();
            this.saveState();
        }
    },

    getRtfToolbar() {
        return `
            <div class="rtf-toolbar no-print">
                <button type="button" title="Negrito" onmousedown="event.preventDefault(); app.formatText('bold')"><b>B</b></button>
                <button type="button" title="Itálico" onmousedown="event.preventDefault(); app.formatText('italic')"><i>I</i></button>
                <button type="button" title="Sublinhado" onmousedown="event.preventDefault(); app.formatText('underline')"><u>U</u></button>
                <div class="rtf-divider"></div>
                <button type="button" title="Aumentar Fonte (A+)" onmousedown="event.preventDefault(); app.formatTextSize('increase')"><b>A&uarr;</b></button>
                <button type="button" title="Diminuir Fonte (A-)" onmousedown="event.preventDefault(); app.formatTextSize('decrease')"><b>A&darr;</b></button>
                <button type="button" title="Limpar Formatação" onmousedown="event.preventDefault(); document.execCommand('removeFormat', false, null); app.saveState();"><i class="ph ph-eraser"></i></button>
                <div class="rtf-divider"></div>
                <button type="button" title="MAIÚSCULAS" onmousedown="event.preventDefault(); app.changeCase('upper')"><b>AA</b></button>
                <button type="button" title="minúsculas" onmousedown="event.preventDefault(); app.changeCase('lower')"><b>aa</b></button>
                <button type="button" title="Primeira Letra" onmousedown="event.preventDefault(); app.changeCase('title')"><b>Aa</b></button>
                <div class="rtf-divider"></div>
                <button type="button" title="Alinhar Esquerda" onmousedown="event.preventDefault(); app.formatText('justifyLeft')"><i class="ph ph-text-align-left"></i></button>
                <button type="button" title="Centralizar" onmousedown="event.preventDefault(); app.formatText('justifyCenter')"><i class="ph ph-text-align-center"></i></button>
                <button type="button" title="Alinhar Direita" onmousedown="event.preventDefault(); app.formatText('justifyRight')"><i class="ph ph-text-align-right"></i></button>
                <button type="button" title="Justificar" onmousedown="event.preventDefault(); app.formatText('justifyFull')"><i class="ph ph-text-align-justify"></i></button>
                <div class="rtf-divider"></div>
                <button type="button" title="Citação / Destacar Bloco" onmousedown="event.preventDefault(); app.toggleQuote()"><i class="ph ph-quotes"></i></button>
                <div class="rtf-divider"></div>
                <button type="button" title="Inserir Equação" class="btn-math" onmousedown="event.preventDefault(); app.insertMath()"><b>&sum; Eq</b></button>
                <div class="rtf-divider"></div>
                <button type="button" title="Símbolos e Emojis" class="btn-open-symbols" onmousedown="event.preventDefault(); app.openSymbolModal()"><i class="ph ph-smiley"></i> &Omega;</button>
            </div>
        `;
    },

    createTextEditDOM(block) {
        const div = document.createElement('div');
        div.className = 'text-block block-item';
        div.dataset.id = block.id; div.dataset.type = 'text'; div.dataset.mode = 'edit';

        // NOVO: Cadeado na UI e Removido input manual de questão
        div.innerHTML = `
            <div class="question-header no-print">
                <div class="question-header-left">
                    <span class="drag-handle" title="Arraste para reordenar"><i class="ph ph-dots-six-vertical"></i></span>
                    <span style="font-size:11px; font-weight:bold; color:#64748b;">TEXTO LIVRE</span>
                </div>
                <div class="block-controls">
                    <button onclick="app.toggleBlockLock('${block.id}')" class="${block.locked ? 'locked-btn' : 'unlocked-btn'}" title="${block.locked ? 'Bloqueado na linha inteira' : 'Destravado para 2 Colunas'}">
                        <i class="ph ${block.locked ? 'ph-lock-key' : 'ph-lock-key-open'}"></i>
                    </button>
                    <button class="btn-danger" onclick="app.deleteBlock('${block.id}')"><i class="ph ph-trash"></i></button>
                </div>
            </div>
            ${this.getRtfToolbar()}
            <div class="text-content">
                <div class="question-text" contenteditable="true" data-placeholder="Cole imagens, textos base, poemas..." onblur="app.saveState()">${block.text}</div>
            </div>
        `;

        div.querySelector('.question-text').addEventListener('input', () => this.saveState());
        return div;
    },

    createSpacerDOM(block) {
        const div = document.createElement('div');
        div.className = 'spacer-block block-item';
        div.dataset.id = block.id; div.dataset.type = 'spacer'; div.dataset.mode = 'edit';

        // NOVO: Cadeado na UI
        div.innerHTML = `
            <div class="question-header no-print">
                <div class="question-header-left">
                    <span class="drag-handle" title="Arraste para reordenar"><i class="ph ph-dots-six-vertical"></i></span>
                    <span style="font-size:11px; font-weight:bold; color:#64748b;">BLOCO VAZIO (ESPAÇADOR)</span>
                </div>
                <div class="block-controls">
                    <button onclick="app.toggleBlockLock('${block.id}')" class="${block.locked ? 'locked-btn' : 'unlocked-btn'}" title="${block.locked ? 'Bloqueado na linha inteira' : 'Destravado para 2 Colunas'}">
                        <i class="ph ${block.locked ? 'ph-lock-key' : 'ph-lock-key-open'}"></i>
                    </button>
                    <button class="btn-danger" onclick="app.deleteBlock('${block.id}')"><i class="ph ph-trash"></i></button>
                </div>
            </div>
            <div class="spacer-content" style="height: ${block.height || 100}px;" id="spacer_content_${block.id}">
                <input type="range" class="spacer-slider no-print" min="50" max="800" value="${block.height || 100}" oninput="app.updateSpacerHeight('${block.id}', this.value)">
                <span class="spacer-label no-print">Ajustar Altura: <span id="spacer_val_${block.id}">${block.height || 100}</span>px</span>
            </div>
        `;
        return div;
    },

    updateSpacerHeight(id, value) {
        const content = document.getElementById(`spacer_content_${id}`);
        const label = document.getElementById(`spacer_val_${id}`);
        if (content) content.style.height = `${value}px`;
        if (label) label.innerText = value;
        this.saveState();
    },

    createQuestionEditDOM(block) {
        const div = document.createElement('div');
        div.className = 'question-block block-item';
        div.dataset.id = block.id; div.dataset.type = 'question'; div.dataset.mode = 'edit';

        let contentHTML = '';
        if(block.qType === 'multiple') {
            const letters = ['A', 'B', 'C', 'D', 'E'];
            let altsHTML = '';
            block.alternatives.forEach((alt, i) => {
                const isChecked = block.correctAlt === i ? 'checked' : '';
                altsHTML += `
                    <div class="alternative-item">
                        <input type="radio" name="correct_${block.id}" class="alt-radio no-print" value="${i}" title="Marcar como Gabarito" ${isChecked} onchange="app.saveState()">
                        <span class="alt-letter">${letters[i] || '-'}.</span>
                        <div class="alt-text" contenteditable="true" data-placeholder="Escreva a alternativa..." onblur="app.saveState()">${alt}</div>
                    </div>
                `;
            });
            contentHTML += `<div class="alternatives-container">${altsHTML}</div>`;
        } else if (block.qType === 'vf') {
            let altsHTML = '';
            const correctArray = block.correctVF || Array(block.alternatives.length).fill('V');
            block.alternatives.forEach((alt, i) => {
                const isV = correctArray[i] === 'V';
                altsHTML += `
                    <div class="alternative-item">
                        <button type="button" class="vf-toggle no-print ${isV ? 'is-v' : 'is-f'}" onclick="app.toggleVF('${block.id}', ${i})">${isV ? 'V' : 'F'}</button>
                        <span class="vf-print-box"></span>
                        <div class="alt-text" contenteditable="true" data-placeholder="Afirmação..." onblur="app.saveState()">${alt}</div>
                    </div>
                `;
            });
            contentHTML += `<div class="alternatives-container">${altsHTML}</div>`;
        } else {
            let linesHTML = '';
            for(let i=0; i<block.numLines; i++) { linesHTML += `<div class="open-line"></div>`; }
            contentHTML += `<div class="open-lines-container">${linesHTML}</div>`;
        }

        // NOVO: Numeração dinâmica via autoNumber em vez de input na tela
        div.innerHTML = `
            <div class="question-header no-print">
                <div class="question-header-left"><span class="drag-handle" title="Arraste para reordenar"><i class="ph ph-dots-six-vertical"></i></span></div>
                <div class="block-controls">
                    <button onclick="app.toggleBlockLock('${block.id}')" class="${block.locked ? 'locked-btn' : 'unlocked-btn'}" title="${block.locked ? 'Bloqueado na linha inteira' : 'Destravado para 2 Colunas'}">
                        <i class="ph ${block.locked ? 'ph-lock-key' : 'ph-lock-key-open'}"></i>
                    </button>
                    <button class="btn-danger" onclick="app.deleteBlock('${block.id}')"><i class="ph ph-trash"></i></button>
                </div>
            </div>
            ${this.getRtfToolbar()}
            
            <div class="clearfix">
                <div class="q-label-float" contenteditable="false">
                    QUESTÃO <span class="auto-q-number">${block.autoNumber}</span>
                </div>
                <div class="question-text" contenteditable="true" data-placeholder="Cole imagens, tabelas ou digite o enunciado..." onblur="app.saveState()">${block.text}</div>
            </div>
            
            ${contentHTML}

            <div class="teacher-fields no-print">
                <div class="gabarito-container" style="display: ${block.qType === 'open' ? 'block' : 'none'}">
                    <label><i class="ph ph-check-circle"></i> GABARITO ESPERADO</label>
                    <textarea class="gabarito-input" placeholder="Digite a resposta esperada..." onblur="app.saveState()">${block.correctText || ''}</textarea>
                </div>
                <div class="habilidade-container">
                    <label><i class="ph ph-target"></i> HABILIDADE COBRADA</label>
                    <input type="text" class="habilidade-input" value="${block.habilidade}" placeholder="Descreva o que esta questão avalia..." oninput="app.saveState()">
                </div>
            </div>
        `;

        div.querySelector('.question-text').addEventListener('input', () => this.saveState());
        div.querySelectorAll('.alt-text').forEach(el => el.addEventListener('input', () => this.saveState()));

        return div;
    },

    createDividerDOM(block) {
        const div = document.createElement('div');
        div.className = 'divider-block block-item'; div.dataset.id = block.id; div.dataset.type = 'divider'; div.dataset.mode = 'edit';
        
        // NOVO: Cadeado na UI
        div.innerHTML = `
            <div class="question-header no-print">
                <div class="question-header-left">
                    <span class="drag-handle" title="Arraste para reordenar"><i class="ph ph-dots-six-vertical"></i></span>
                    <span style="font-size:11px; font-weight:bold; color:#64748b;">SEPARADOR DE SEÇÃO</span>
                </div>
                <div class="block-controls">
                    <button onclick="app.toggleBlockLock('${block.id}')" class="${block.locked ? 'locked-btn' : 'unlocked-btn'}" title="${block.locked ? 'Bloqueado na linha inteira' : 'Destravado para 2 Colunas'}">
                        <i class="ph ${block.locked ? 'ph-lock-key' : 'ph-lock-key-open'}"></i>
                    </button>
                    <button class="btn-danger" onclick="app.deleteBlock('${block.id}')"><i class="ph ph-trash"></i></button>
                </div>
            </div>
            <div class="divider-content"><span class="divider-text" contenteditable="true" data-placeholder="Nome da Seção" onblur="app.saveState()">${block.text}</span></div>
        `;
        div.querySelector('.divider-content span').addEventListener('input', () => this.saveState());
        return div;
    },

    exportXLSX() {
        this.saveState();
        const data = [];
        
        // NOVO: Contador dinâmico exclusivo para garantir a numeração no Excel
        let questionCounter = 1; 

        this.state.blocks.forEach(block => {
            if (block.type === 'question' && block.mode === 'edit') {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = block.text;
                let plainText = tempDiv.textContent || tempDiv.innerText || '';
                
                let gabaritoLetra = "Não preenchido";
                let gabaritoTexto = "Não preenchido";

                if(block.qType === 'multiple' && block.correctAlt !== null) {
                    const letters = ['A', 'B', 'C', 'D', 'E'];
                    gabaritoLetra = letters[block.correctAlt];
                    const tempDivAlt = document.createElement('div');
                    tempDivAlt.innerHTML = block.alternatives[block.correctAlt];
                    gabaritoTexto = tempDivAlt.textContent || tempDivAlt.innerText || '';
                } else if (block.qType === 'vf') {
                    gabaritoLetra = "V/F";
                    gabaritoTexto = block.correctVF ? block.correctVF.join(' - ') : "Não preenchido";
                } else if(block.qType === 'open') {
                    gabaritoLetra = "Aberta";
                    gabaritoTexto = block.correctText || "Não preenchido";
                }

                data.push({
                    "Questão": questionCounter++, // NOVO: Agora usa o contador que soma +1 a cada questão encontrada
                    "Tipo": block.qType === 'multiple' ? "Múltipla" : (block.qType === 'vf' ? "V/F" : "Aberta"),
                    "Enunciado (Resumo)": plainText.substring(0, 100) + '...',
                    "Letra Correta": gabaritoLetra,
                    "Texto da Resposta": gabaritoTexto.trim(),
                    "Habilidade": block.habilidade || "Sem habilidade descrita"
                });
            }
        });

        if (data.length === 0) { alert("Sem questões válidas para exportar."); return; }
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 50 }, { wch: 15 }, { wch: 50 }, { wch: 40 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mapeamento da Prova");
        XLSX.writeFile(wb, `Gabarito_${Date.now()}.xlsx`);
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());