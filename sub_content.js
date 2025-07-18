// Este script é injetado nas abas secundárias abertas pelo background.js

(async () => {
    'use strict';

    console.log("Sub-content script (secundário) iniciado na nova aba.");

    //const textosDesejados = ["PDF"];
    const textosDesejados = ["HTML", "text file with semicolons"];
    const linksParaAbrir = [];
    const delayEntreAbasSecundarias = 1000; // 1 segundo de atraso entre as aberturas internas
    const fecharAbaAposConclusao = true; // Defina para 'true' se quiser que a aba se feche automaticamente

    // Seleciona todos os elementos <a> que contenham rel="nofollow noopener"
    const todosOsLinksQualificados = document.querySelectorAll('a[rel="nofollow noopener"]');

    if (todosOsLinksQualificados.length === 0) {
        console.warn("Sub-script: Nenhum link com rel=nofollow noopener encontrado nesta página.");
        if (fecharAbaAposConclusao) {
            setTimeout(() => window.close(), 2000); // Fecha mesmo se não encontrar nada
        }
        //return; estava dando erro no terminal..
        window.close(); // fechar ao inves de return
    }

    for (const link of todosOsLinksQualificados) {
        const textoDoLink = link.textContent.trim();
        if (textosDesejados.some(texto => textoDoLink.includes(texto))) {
            linksParaAbrir.push(link);
        }
    }

    if (linksParaAbrir.length > 0) {
        console.log(`Sub-script: Encontrados ${linksParaAbrir.length} links que correspondem aos textos desejados.`);

        let count = 0;
        for (const [index, link] of linksParaAbrir.entries()) {
            const urlParaAbrir = link.href;
            if (urlParaAbrir) {
                // Usa await com um atraso para abrir cada link em sequência
                await new Promise(resolve => setTimeout(resolve, index * delayEntreAbasSecundarias));
                window.open(urlParaAbrir, '_blank');
                console.log(`Sub-script: Abrindo: ${link.textContent.trim()} -> ${urlParaAbrir}`);
                count++;
            } else {
                console.warn(`Sub-script: Link encontrado, mas sem URL (href): ${link.textContent.trim()}`);
            }
        }

        // Se todos os links foram abertos e a opção de fechar está ativa
        if (count === linksParaAbrir.length && fecharAbaAposConclusao) {
            console.log("Sub-script: Todos os links secundários abertos. Fechando esta aba...");
            setTimeout(() => window.close(), 2000); // Pequeno atraso antes de fechar
        }
    } else {
        console.warn("Sub-script: Nenhum link com os textos 'HTML' ou 'text file with semicolons' foi encontrado com o atributo rel='nofollow noopener' nesta página.");
        if (fecharAbaAposConclusao) {
            setTimeout(() => window.close(), 2000); // Fecha mesmo se não encontrar os links específicos
        }
    }

})();