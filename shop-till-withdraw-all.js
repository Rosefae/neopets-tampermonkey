// ==UserScript==
// @name         Shop Till Withdraw All
// @namespace    http://tampermonkey.net/
// @version      2026-08-30
// @description  QoL upgrade to add a "Max Amount" button to the shop till to withdrawl everything
// @author       rose@byanyothername.me
// @match        https://www.neopets.com/market.phtml?type=till
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Max Amount btn instead of Withdraw All directly because I don't want to mess with form submission

    const tillBalanceSpan = document.querySelector("#mkt-till-balance"),
        tillBalance = parseInt(tillBalanceSpan.innerText.replace(",", ""));

    const amountInput = document.querySelector(".mkt-form input[name='amount']"),
        amountInputContainer = amountInput.parentElement;

    const maxAmountBtn = document.createElement("button");
    maxAmountBtn.innerText = "Max Amount";
    maxAmountBtn.setAttribute("type", "button");
    maxAmountBtn.addEventListener("click", () => {
        amountInput.value = tillBalance;
    });

    amountInputContainer.appendChild(maxAmountBtn);

    amountInputContainer.style.setProperty("display", "flex", "important");
    amountInputContainer.style.gap = "0.5rem";

    amountInput.style.width = "auto";
    amountInput.style.flexGrow = 1;

})();