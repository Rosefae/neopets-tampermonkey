// ==UserScript==
// @name         Rubbish Dump Avatar Picker
// @namespace    http://tampermonkey.net/
// @version      2026-03-07
// @description  Highlight the items at the rubbish dump that will get you the avatar
// @author       rose@byanyothername.me
// @match        https://www.neopets.com/medieval/rubbishdump.phtml
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    class Item {
        constructor(name,
            imgUrl = "",
            options = {}) {
            const defaultOptions = {
                matchBy: "name",
                stopScriptIfFound: false
            };

            options = Object.assign(defaultOptions, options);
            this.name = name;
            this.imgUrl = imgUrl;
            this.matchBy = options.matchBy;
            this.stopScriptIfFound = options.stopScriptIfFound;
        }

        match(stringToMatch) {
            return this[this.matchBy] == stringToMatch;
        }
    }

    const avatarItems = [
        // Apple Core
        "Apple Core",

        // PB
        "Blue Paint Brush",
        "Darigan Paint Brush",
        "Silver Paint Brush",
        
        // Petpet
        "Dragoyle",
        "Mortog",
        "Turmac",
        "Turtum",
        "Whinny",

        // Bottled faerie
        "Fading Bottled Air Faerie",
        "Fading Bottled Dark Faerie",
        "Fading Bottled Earth Faerie",
        "Fading Bottled Fire Faerie",
        "Fading Bottled Light Faerie",
        "Fading Bottled Water Faerie",

        // HT item
        "Dung Catapult",
        "Enchanted Kiko Squeeze Toy",
        "Everlasting Apple",
        "Jhudora the Dark Faerie Doll",
    ];

    const otherNoteworthyItems = [ // bonus lol
        "Compost Dung Right",
        "How its Dung"
    ];

    let itemsAvailable = document.querySelectorAll("td:has(a[href^='/takedonation_new.phtml?'])");

    itemsAvailable.forEach((itemAvail) => {
        let name = itemAvail.querySelector("b").innerText;

        if (avatarItems.includes(name)) {
            highlight(itemAvail.closest("td"), "royalblue");
        }

        else if (otherNoteworthyItems.includes(name)) {
            highlight(itemAvail.closest("td"), "sandybrown");
        }
    });

    function highlight(el, color) {
        el.style.boxShadow = `0 0 5px ${color}`;
        el.style.borderRadius = "5px";
    }
})();