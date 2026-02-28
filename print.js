// print.js
function printWithAnswers() {
    // Adiciona a classe que força a exibição dos campos na impressão
    document.body.classList.add('print-with-answers');
    
    // Dispara a janela de impressão do navegador
    window.print();
    
    // Remove a classe logo em seguida para a tela voltar ao normal
    setTimeout(() => {
        document.body.classList.remove('print-with-answers');
    }, 500);
}
