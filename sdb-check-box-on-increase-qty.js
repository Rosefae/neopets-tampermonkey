// ==UserScript==
// @name         SDB check the box if increasing the qty
// @namespace    http://tampermonkey.net/
// @version      2026-08-29
// @description  Lil QoL improvement to automatically check the box for batch actions if you've upped the qty
// @author       rose@byanyothername.me
// @match        https://www.neopets.com/safetydeposit.phtml*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    await sleep(500); // first load is extra long
    init();

    window.navigation.addEventListener("navigate", init);
    
    async function init() {
        await sleep(500); // make sure this slow-ass site has finished loading

        const allRows = document.querySelectorAll(".sdb-table tr");

        allRows.forEach((row) => {
            const qtyInput = row.querySelector("input.np-stepper-input");
            const checkbox = row.querySelector(".sdb-item-checkbox");
            const stepperBtns = row.querySelectorAll(".np-stepper-btn");

            if (qtyInput && checkbox) {
                qtyInput.addEventListener("change", doOnQtyChange);
                stepperBtns.forEach((btn) => {
                    btn.addEventListener("click", doOnQtyChange);
                });
            }

            function doOnQtyChange() {
                if (qtyInput.value > 0 && !checkbox.checked) {
                    checkbox.click();
                }
            }
        });
    }

    // Helpers

    async function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

})();