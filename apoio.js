document.addEventListener('DOMContentLoaded', () => {
    // 1. Cria e injeta o CSS do botão e do Modal
    const style = document.createElement('style');
    style.innerHTML = `
        /* Botão Flutuante (Coração) */
        .floating-donate-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background-color: #ef4444;
            color: white;
            width: 55px;
            height: 55px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
            cursor: pointer;
            z-index: 9998;
            transition: transform 0.2s ease, background-color 0.2s;
        }
        .floating-donate-btn:hover {
            transform: scale(1.1);
            background-color: #dc2626;
        }

        /* Fundo escuro do Modal */
        .donate-modal-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.7);
            z-index: 9999;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(2px);
            animation: fadeIn 0.2s ease-out;
        }

        /* Caixinha do Modal */
        .donate-modal-content {
            background: white;
            padding: 30px 25px;
            border-radius: 12px;
            width: 340px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            position: relative;
        }
        .donate-modal-content h3 {
            margin-bottom: 12px;
            color: #0f172a;
            font-size: 20px;
        }
        .donate-modal-content p {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .donate-modal-content img {
            width: 200px;
            height: 200px;
            margin: 0 auto 20px auto;
            display: block;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 5px;
        }
        
        /* Botão de Fechar */
        .donate-btn-close {
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            width: 100%;
            transition: 0.2s;
        }
        .donate-btn-close:hover {
            background: #1d4ed8;
        }

        /* Oculta na impressão */
        @media print {
            .floating-donate-btn, .donate-modal-overlay { display: none !important; }
        }
    `;
    document.head.appendChild(style);

    // 2. Cria e injeta o HTML do botão e do Modal na página
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="floating-donate-btn" id="openDonateModal" title="Apoie o desenvolvedor">
            <i class="ph-fill ph-heart"></i>
        </div>

        <div class="donate-modal-overlay" id="donateModal">
            <div class="donate-modal-content">
                <h3>Apoie um educador 🍎</h3>
                <p>Sou pai, marido e crio ferramentas para facilitar a vida de quem ensina. Se o meu trabalho te ajudou, considere me pagar um café via Pix!</p>
                
                <img src="https://raw.githubusercontent.com/ayrtonmoura1/test-builder/main/pix.png" alt="QR Code Pix">
                
                <button class="donate-btn-close" id="closeDonateModal">Obrigado!</button>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    // 3. Lógica de cliques (Abrir e Fechar)
    const modal = document.getElementById('donateModal');
    const btnOpen = document.getElementById('openDonateModal');
    const btnClose = document.getElementById('closeDonateModal');

    btnOpen.addEventListener('click', () => {
        modal.style.display = 'flex';
    });

    btnClose.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Fecha se clicar fora da caixinha (no fundo escuro)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});
