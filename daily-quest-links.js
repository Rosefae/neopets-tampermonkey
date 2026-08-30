// ==UserScript==
// @name         Daily Quest Links
// @namespace    http://tampermonkey.net/
// @version      2026-08-30
// @description  QoL upgrade to add links to certain daily quest items
// @author       rose@byanyothername.me
// @match        https://www.neopets.com/questlog/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    const links = {
        "Wheel of Excitement": "https://www.neopets.com/faerieland/wheel.phtml",
        "Wheel of Knowledge": "https://www.neopets.com/medieval/knowledge.phtml",
        "Wheel of Mediocrity": "https://www.neopets.com/prehistoric/mediocrity.phtml",
        "Wheel of Misfortune": "https://www.neopets.com/halloween/wheel/index.phtml",
        "NC Mall": "https://ncmall.neopets.com/mall/shop.phtml",
        "Customise": "https://www.neopets.com/customise/",
        "Ye Olde Fishing Vortex": "https://www.neopets.com/water/fishing.phtml",
        "Battledome": "https://www.neopets.com/dome/",
        "Games Room": "https://www.neopets.com/games/"
    }

    await sleep(3000);

    const questDescriptionEls = document.querySelectorAll(".ql-quest-description");
    const taskDescriptionEls = document.querySelectorAll(".ql-task-description");

    questDescriptionEls.forEach(replaceWithLink);
    taskDescriptionEls.forEach(replaceWithLink);

    function replaceWithLink(el) {
        let text = el.innerHTML;

        for (const [key, value] of Object.entries(links)) {
            if (!text.includes(key)) continue;
            el.innerHTML = text.replace(key, `<a href="${value}">${key}</a>`);
            break;
        }
    }

    async function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

})();