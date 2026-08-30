// ==UserScript==
// @name         Neopets Item Wishlist
// @namespace    http://tampermonkey.net/
// @version      2026-08-30
// @description  Maintain a wishlist of items. Designed to be used with the Display Market Price script.
// @author       rose@byanyothername.me
// @match        https://www.neopets.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    console.log("Rose's Item Wishlist Script");

    const hotkey = {
        mainKey: "w",
        modifiers: ["ctrlKey", "altKey"]
    }

    const styles = `
    .item-wishlist-modal {
      text-align: center;
      font-family: sans-serif;
    }
    .item-wishlist-modal textarea {
      width: calc(100vw - 5rem);
      min-width: 10rem;
      max-width: 20rem;
      height: 10rem;
    }
    `; // TODO: make modal prettier

    const localStorageKey = "wishlistCacheForRoseScripts";
    const modal = document.createElement("dialog");
    const styleTag = document.createElement("style");
    modal.setAttribute("closedby", "any");
    modal.classList.add("item-wishlist-modal");
    modal.innerHTML = `
    <h2>Item Wishlist</h2>
    <label>Items (one item per line)<br>
    <textarea></textarea>
    </label>
    `;
    styleTag.textContent = styles;

    document.body.appendChild(modal);
    document.head.appendChild(styleTag);

    const textbox = modal.querySelector("textarea");
    getWishlistLocalCache();
    textbox.addEventListener("change", setWishlistLocalCache);

    document.addEventListener("keydown", (event) => {
        if (event.key.toLowerCase() !== hotkey.mainKey) return;
        for (const mod of hotkey.modifiers) {
            if (mod == "ctrlKey") {
                if (!(event.ctrlKey || event.metaKey)) return;
            }
            else {
                if (!event[mod]) return;
            }
        }
        if (event.repeat) return;

        event.preventDefault();
        modal.showModal();
    });

    console.log("woof", unsafeWindow.wishlistItems);

    function getWishlistLocalCache() {
        const items = GM_getValue(localStorageKey, []);
        unsafeWindow.wishlistItems = items;
        textbox.value = items.join("\n");
    }

    function setWishlistLocalCache() {
        const items = textbox.value.split(/\r?\n/);
        unsafeWindow.wishlistItems = items;
        GM_setValue(localStorageKey, items);
    }
})();