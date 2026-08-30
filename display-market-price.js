// ==UserScript==
// @name         Neopets Display Market Price
// @namespace    http://tampermonkey.net/
// @version      2026-08-16
// @description  Show the market price on certain item-heavy pages
// @author       rose@byanyothername.me
// @match        https://www.neopets.com/halloween/garage.phtml
// @match        https://www.neopets.com/winter/igloo.phtml?stock=1
// @match        https://www.neopets.com/donations.phtml
// @match        https://www.neopets.com/thriftshoppe/index.phtml
// @match        https://www.neopets.com/medieval/rubbishdump.phtml
// @match        https://www.neopets.com/objects.phtml?*
// @match        https://www.neopets.com/browseshop.phtml?*
// @match        https://www.neopets.com/safetydeposit.phtml*
// @match        https://www.neopets.com/inventory.phtml
// @match        https://www.neopets.com/quickstock.phtml
// @match        https://www.neopets.com/market.phtml?type=your*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_cookie
// ==/UserScript==

(async function () {
    'use strict';
    // requires a visit to https://itemdb.com.br/ every 24 hours (or every 14 days if you have an account there) to get a cookie
    // TODO: can I automate this?

    // Possible TODOs:
    // - Refactor to group all page-specfic settings to a dictionary at the front
    // - Some kind of wishlist functionality?
    // - Minor SDB bugs

    // options
    const dataStaleThresholdDays = 7;

    let defaultPageOptions = {
        addedTextColor: "purple", // colors call be any string that CSS will understand as a color
        displayMarketPrice: true,
        displayPriceDiff: true,
        displayRarity: false,
        highlightThreshold: 10000, // set to 0 to never highlight
        highlightPriority: "diff", // accepted values: "diff" or "market". Falls back to "market" for views without a diff
        indicateNegativePriceDiff: true,
        highlightWishlist: true, // requires my wishlist script to be installed also
        highlightStyle: {
            boxShadow: "0 0 5px lime",
            borderRadius: "5px"
        },
        negativeStyle: {
            textDecoration: "line-through 3px red"
        },
        wishlistHighlightStyle: {
            boxShadow: "0 0 5px orchid",
            borderRadius: "5px"
        },
        additionalStyling: null,
        additionalItemElStyling: null
    }

    let perPageTypeOptions = {
        "Almost Abandoned Attic": {
            displayRarity: true,
            additionalItemElStyling: {
                height: "auto",
                padding: 0,
                margin: "2px"
            }
        },
        "Money Tree": {
            displayRarity: true,
            additionalStyling: {
                textAlign: "center"
            }
        },
        "Second-Hand Shoppe": {
            displayRarity: true,
            additionalStyling: {
                fontWeight: "normal"
            }
        },
        "Rubbish Dump": {
            displayRarity: true
        },
        "Standard Shop": {
            displayRarity: true,
            additionalStyling: {
                fontFamily: '"MuseoSansRounded500", "Arial", sans-serif',
                textAlign: "center"
            }
        },
        "User Shop": {
            displayRarity: true
        },
        "Igloo Garage Sale": {
            displayRarity: true
        },
        "SDB": {
            highlightPriceThreshold: 0
        },
        "Inventory": {
            additionalStyling: {
                textAlign: "center"
            }
        },
        "Quick Stock": {
            additionalStyling: {
                marginLeft: "2rem"
            },
        },
        "Shop Stock": {
            highlightPriceThreshold: 0,
            additionalStyling: {
                textAlign: "start"
            }
        }
    }

    // init
    console.log("Rose's Neopets Price Checker script!");

    const localStorageKey = "priceCacheForRoseScripts";
    const currentEpochSeconds = Math.floor(Date.now() / 1000);
    const dataStaleThresholdSeconds = dataStaleThresholdDays * 24 * 60 * 60;
    let cachedItems = {};
    // expected format:
    // "itemName" : {
    //   "rarity": int
    //   "type" : "np"|"nc"|"pb"
    //   "status" : string
    //   "marketPrice" : int
    //   "marketPriceStatus" : [] "inflation" | "outdated" | "unconfirmed" | "unknown"
    //   "lastFetched" : int
    // }

    getItemPricesLocalCache();

    // get page type
    const currUrl = window.location.href;
    let pageType = "";

    let allItemsQuerySelector = "";
    let getNameFromEl = null;
    let getPriceFromEl = null;
    let skipCondition = null;
    let getItemsSleepTime = 0;

    switch (currUrl) {
        case "https://www.neopets.com/halloween/garage.phtml":
            pageType = "Almost Abandoned Attic";
            allItemsQuerySelector = "ul#items li";
            getNameFromEl = (el) => el.getAttribute("oname");
            getPriceFromEl = (el) => parseInt(el.getAttribute("oprice").replaceAll(",", ""));
            break;
        case "https://www.neopets.com/winter/igloo.phtml?stock=1":
            pageType = "Igloo Garage Sale";
            allItemsQuerySelector = ".igs-item";
            getNameFromEl = (el) => el.querySelector("p b").innerText;
            getPriceFromEl = (el) => {
                const priceEl = el.querySelector("p:has(b) + p"),
                    priceString = priceEl.innerText.match(/[0-9]+/)[0];
                return parseInt(priceString);
            }
            break;
        case "https://www.neopets.com/donations.phtml":
            pageType = "Money Tree";
            allItemsQuerySelector = ".moneytree-grid > .donated > a";
            getNameFromEl = (el) => el.dataset.name;
            skipCondition = (el) => {
                const name = getNameFromEl(el);
                return name.match(/[0-9]+ NP/);
            };
            break;
        case "https://www.neopets.com/thriftshoppe/index.phtml":
            pageType = "Second-Hand Shoppe";
            allItemsQuerySelector = ".content > div > table td > a";
            getNameFromEl = (el) => el.querySelector("div:has(img) + div").innerText;
            break;
        case "https://www.neopets.com/medieval/rubbishdump.phtml":
            pageType = "Rubbish Dump";
            allItemsQuerySelector = "td:has(> a[href^='/takedonation_new.phtml?'])";
            getNameFromEl = (el) => el.querySelector("b").innerText;
            break;
        case "https://www.neopets.com/inventory.phtml":
            pageType = "Inventory";
            allItemsQuerySelector = ".item-grid .grid-item";
            getNameFromEl = (el) => el.querySelector(".item-name").innerText;
            getItemsSleepTime = 500;
            break;
        case "https://www.neopets.com/quickstock.phtml":
            pageType = "Quick Stock";
            allItemsQuerySelector = ".np-table-row:not(:last-child) > td:first-child";
            getNameFromEl = (el) => getInnerTextNoChildElements(el.querySelector("span"));
            getItemsSleepTime = 500;
            break;
        default:
            if (currUrl.startsWith("https://www.neopets.com/objects.phtml?")) {
                pageType = "Standard Shop";
                allItemsQuerySelector = ".shop-item";
                getNameFromEl = (el) => {
                    const img = el.querySelector(".item-img");
                    return img.dataset.name;
                };
                getPriceFromEl = (el) => {
                    const img = el.querySelector(".item-img");
                    return parseInt(img.dataset.price.replaceAll(",", ""));
                };
                break;
            }
            if (currUrl.startsWith("https://www.neopets.com/browseshop.phtml?")) {
                pageType = "User Shop";
                getItemsSleepTime = 1000;
                allItemsQuerySelector = ".bsp-item > button";
                getNameFromEl = (el) => el.dataset.name;
                getPriceFromEl = (el) => el.dataset.price;
                break;
            }
            if (currUrl.startsWith("https://www.neopets.com/market.phtml?type=your")) {
                pageType = "Shop Stock";
                allItemsQuerySelector = ".market-your-item__info";
                getNameFromEl = (el) => el.querySelector(".market-your-item__name").innerText;
                break;
            }
            if (currUrl.startsWith("https://www.neopets.com/safetydeposit.phtml")) {
                pageType = "SDB";
                allItemsQuerySelector = ".sdb-item-info";
                getNameFromEl = (el) => el.querySelector(".sdb-item-name").innerText;
                getItemsSleepTime = 1000;
                break;
            }
            console.log("Can't recognize page type :[");
            return;
    }
    // possible pageTypes:
    // - Almost Abandoned Attic
    // - Igloo Garage Sale
    // - Standard Shop
    // - User Shop
    // - Inventory
    // - Quick Stock
    // - SDB
    // - Shop Stock Page
    // - Money Tree
    // - Rubbish Dump
    // - Second-Hand Shoppe
    console.log("Page type: " + pageType);

    const combinedPageOptions = { ...defaultPageOptions, ...perPageTypeOptions[pageType] }
    const {
        addedTextColor,
        displayMarketPrice,
        displayPriceDiff,
        displayRarity,
        highlightThreshold,
        highlightPriority,
        indicateNegativePriceDiff,
        highlightWishlist,
        highlightStyle,
        negativeStyle,
        wishlistHighlightStyle,
        additionalStyling,
        additionalItemElStyling
    } = combinedPageOptions;

    let itemsNotInCache = [];
    let itemsOnPage = [];
    processItems();

    window.navigation.addEventListener("navigate", processItems);

    async function processItems() {
        itemsNotInCache = [];
        itemsOnPage = await getItemsOnPage();
        // expected format:
        // {
        //   "name" : string,
        //   "price": int,
        //   "el": node
        // }

        if (!itemsOnPage) {
            console.log("no items found");
            return;
        };

        getItemPricesFromDBv1(itemsNotInCache, () => {
            itemsOnPage.forEach(itemHandler);
            setItemPricesLocalCache();
        });
    }

    async function getItemsOnPage() {
        if (getItemsSleepTime > 0) {
            console.log(`Sleeping for ${getItemsSleepTime}ms before getting items`);
            await sleep(getItemsSleepTime);
        }

        let allItemEls = document.querySelectorAll(allItemsQuerySelector);
        if (allItemEls.length == 0) return null;

        let result = [];

        allItemEls.forEach((itemEl) => {
            if (skipCondition && skipCondition(itemEl)) return;

            if (additionalItemElStyling) {
                Object.assign(itemEl.style, additionalItemElStyling);
            }

            let name = getNameFromEl(itemEl);
            let price = getPriceFromEl ? getPriceFromEl(itemEl) : 0;

            if (!Object.hasOwn(cachedItems, name)) {
                itemsNotInCache.push(name);
            }

            result.push({
                "name": name,
                "price": price,
                "el": itemEl
            });
        });

        return result;
    }

    function itemHandler(item) {
        const itemData = cachedItems[item.name];
        if (!itemData.marketPrice) return;

        const price = itemData.marketPrice;
        let content = "";
        let highlightPrice = price;
        let negativeIndicator = false;

        if (displayRarity) {
            content += `<span>Rarity: <strong>${itemData.rarity}</strong></span>`;
        }

        if (displayMarketPrice) {
            if (content.length > 0) {
                content += "<br>";
            }
            content += `<span>Market Price: <strong>${itemData.marketPrice}</strong></span>`;
        }

        if (itemData.marketPriceStatus) {
            for (const status of itemData.marketPriceStatus) {
                content += `<span>(${status})</span>`;
            }
        }

        if (displayPriceDiff && item.price && item.price > 0) {
            let priceDiff = itemData.marketPrice - item.price;
            if (content.length > 0) {
                content += "<br>";
            }
            content += `<span>Price Difference: <strong>${priceDiff}</strong></span>`;

            if (highlightPriority == "diff") {
                highlightPrice = priceDiff;
            }

            negativeIndicator = indicateNegativePriceDiff && priceDiff < 0;
        }

        const newEl = document.createElement('div');
        newEl.style.color = addedTextColor;
        newEl.style.fontSize = "0.9rem";
        newEl.innerHTML = content;

        if (additionalStyling) {
            Object.assign(newEl.style, additionalStyling);
        }

        item.el.appendChild(newEl);

        if (highlightPrice > highlightThreshold) {
            Object.assign(item.el.style, highlightStyle);
        }

        if (negativeIndicator) {
            Object.assign(item.el.style, negativeStyle);
        }

        if (highlightWishlist && unsafeWindow.wishlistItems && unsafeWindow.wishlistItems.includes(item.name)) {
            Object.assign(item.el.style, wishlistHighlightStyle);
        }
    }

    function getItemPricesLocalCache() {
        let itemPricesString = GM_getValue(localStorageKey, null);
        if (!itemPricesString) return;
        let oldItems = JSON.parse(itemPricesString);
        for (const [key, value] of Object.entries(oldItems)) {
            if (currentEpochSeconds - value.lastFetched >= dataStaleThresholdSeconds) continue;
            cachedItems[key] = value;
        }
    }

    function setItemPricesLocalCache() {
        let itemPricesString = JSON.stringify(cachedItems);
        GM_setValue(localStorageKey, itemPricesString);
    }

    async function getItemPricesFromDBv1(itemNames, doAfter) {
        if (itemNames.length <= 0) {
            console.log("All items already in local cache");
            doAfter();
            return;
        }

        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://itemdb.com.br/api/v1/items/many',
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                name: itemNames
            }),
            onload: function (res) {
                if (res.status === 200) {
                    const itemData = JSON.parse(res.responseText);
                    console.log("Received itemData from DB: ", itemData);

                    for (const [key, value] of Object.entries(itemData)) {
                        let item = {
                            lastFetched: currentEpochSeconds,
                            rarity: value.rarity,
                            type: value.type,
                            status: value.status,
                            marketPrice: 0,
                            marketPriceStatus: []
                        }

                        if (value.price) {
                            item.marketPrice = value.price.value;
                            item.marketPriceStatus = value.price.inflated ? ["inflation"] : [];
                        }

                        cachedItems[key] = item;
                    }

                    doAfter();
                }

                else if (res.status === 401) {
                    return console.error("Your ItemDB cookie has probably expired! Visit https://itemdb.com.br/ to refresh it.");
                }

                else return console.error('Failed to fetch price data', res);
            }
        });
    }

    async function getItemPricesFromDBv2(itemNames, doAfter) {
        if (itemNames.length <= 0) {
            console.log("All items already in local cache");
            doAfter();
            return;
        }


        let queryParams = `?type=name&data${JSON.stringify(itemNames)}=1&intent=pricer`;
        // GET request to itemdb
        await GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://itemdb.com.br/api/v2/items/many' + queryParams,
            headers: {
                "Content-Type": "application/json"
            },
            onload: function (res) {
                if (res.status === 200) {
                    const itemData = JSON.parse(res.responseText);
                    console.log("Received itemData from DB: ", itemData);
                    for (const [key, value] of Object.entries(itemData)) {
                        let item = {
                            lastFetched: currentEpochSeconds,
                            rarity: value.rarity,
                            type: value.type,
                            status: value.status,
                            marketPrice: 0,
                            marketPriceStatus: []
                        }

                        if (value.price && value.price.type == "np") {
                            item.marketPrice = value.price.value;
                            item.marketPriceStatus = value.price.flags;
                        }

                        cachedItems[key] = item;
                    }

                    doAfter();
                }

                else return console.error('Failed to fetch price data', res);
            }
        });
    }

    // Helpers

    async function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function getInnerTextNoChildElements(el) {
        const textNodes = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE);
        const textArray = textNodes.map(n => n.textContent.trim());
        return textArray.join(' ');
    }

})();