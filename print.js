// print.js
function printWithAnswers() {
    // Adiciona a classe que força a exibição dos campos na impressão
    document.body.classList.add('print-with-answers');
    
    // NOVO: Altera o nome do arquivo para o PDF do professor
    const originalTitle = document.title;
    if (typeof app !== 'undefined' && app.getFormattedFilename) {
        document.title = app.getFormattedFilename('versao_prof');
    } else {
        document.title = "Gabarito_Professor";
    }
    
    // Dispara a janela de impressão do navegador
    window.print();
    
    // Restaura o título original da aba
    document.title = originalTitle;

    // Remove a classe logo em seguida para a tela voltar ao normal
    setTimeout(() => {
        document.body.classList.remove('print-with-answers');
    }, 500);
}
