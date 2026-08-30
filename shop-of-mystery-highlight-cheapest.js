// ==UserScript==
// @name         Shop of Mystery Highlight Cheapest
// @namespace    http://tampermonkey.net/
// @version      2026-08-29
// @description  Highlight the cheapest item at Tarla's Shop of Mystery
// @author       rose@byanyothername.me
// @match        https://www.neopets.com/winter/shopofmystery.phtml
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let mysteryItems = document.querySelectorAll("td:has(a[href^='process_shopofmystery.phtml'])");
    let currentCheapest = null;

    mysteryItems.forEach((item) => {
        const costLine = item.innerHTML.match(/(?<=Cost: )[0-9,]+(?= NP)/)[0],
            cost = parseInt(costLine.replace(",", ""));
        
        if (!currentCheapest || currentCheapest.cost > cost) {
            currentCheapest = {
                el: item,
                cost: cost
            }
        }
    });

    highlight(currentCheapest.el);

    function highlight(el) {
        el.style.boxShadow = "0 0 5px red";
        el.style.borderRadius = "5px";
    }
})();