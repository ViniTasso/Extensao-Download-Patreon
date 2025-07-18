// Este script é injetado na página principal (play.easyfrench.fm/)
// Ele coleta os links e os retorna para o background script.

(async () => {
    'use strict';

    const CLASS_NAME = "css-1iz2k1g";
    const allTargetLinks = Array.from(document.querySelectorAll(`a[class*="${CLASS_NAME}"]`));
    //const filteredTargetLinks = allTargetLinks.splice(132); //para trazer uma sublista a partir do número informado. ex.: metade length / 2
    console.log(`Content script: Coletando links. Encontrados ${allTargetLinks.length} links com a classe "${CLASS_NAME}".`);
    console.log(`Content script: Filtrando links. Encontrados ${filteredTargetLinks.length} links com a classe "${CLASS_NAME}".`);

    // Retorna apenas os hrefs dos links encontrados
    // NOTA: O chrome.scripting.executeScript retorna o valor da última expressão no script.
    // Assim, simplesmente retornar um array aqui fará com que o background receba esse array.
    //return filteredTargetLinks.map(link => link.href).filter(href => href); // Retorna apenas hrefs válidos
    return allTargetLinks.map(link => link.href).filter(href => href); // Retorna apenas hrefs válidos
})();