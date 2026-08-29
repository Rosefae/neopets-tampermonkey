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

    // options
    const dataStaleThresholdDays = 7;
    // These options can also be overridden on a per-pagetype basis within the itemHandler function
    let addedTextColor = "purple",
        highlightGoodColor = "lime",
        highlightBadColor = "red",
        highlightMarketPriceThreshold = 10000, // set to 0 to never highlight
        highlightPriceDiffThreshold = 10000, // set to 0 to never highlight
        highlightPriority = "diff", // accepted values: "diff" or "market"
        indicateNegativePriceDiff = true;

    const highlightStyle = {
        boxShadow: `0 0 5px ${highlightGoodColor}`,
        borderRadius: "5px"
    }

    const negativeStyle = {
        textDecoration: `line-through 3px ${highlightBadColor}`
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
    let paginationControls = null;
    let sleepBeforeAddingListeners = 0;
    let reAddPagination = false;

    switch (currUrl) {
        case "https://www.neopets.com/halloween/garage.phtml":
            pageType = "Almost Abandoned Attic";
            break;
        case "https://www.neopets.com/winter/igloo.phtml?stock=1":
            pageType = "Igloo Garage Sale";
            break;
        case "https://www.neopets.com/donations.phtml":
            pageType = "Money Tree";
            break;
        case "https://www.neopets.com/thriftshoppe/index.phtml":
            pageType = "Second-Hand Shoppe";
            break;
        case "https://www.neopets.com/medieval/rubbishdump.phtml":
            pageType = "Rubbish Dump";
            break;
        case "https://www.neopets.com/inventory.phtml":
            pageType = "Inventory";
            break;
        case "https://www.neopets.com/quickstock.phtml":
            pageType = "Quick Stock";
            break;
        default:
            if (currUrl.startsWith("https://www.neopets.com/objects.phtml?")) {
                pageType = "Standard Shop";
                break;
            }
            if (currUrl.startsWith("https://www.neopets.com/browseshop.phtml?")) {
                pageType = "User Shop";
                paginationControls = [
                    {
                        selector: ".bsp-pagination-btn",
                        listener: "click"
                    }
                ];
                reAddPagination = true;
                break;
            }
            if (currUrl.startsWith("https://www.neopets.com/market.phtml?type=your")) {
                pageType = "Shop Stock";
                break;
            }
            if (currUrl.startsWith("https://www.neopets.com/safetydeposit.phtml")) {
                pageType = "SDB";
                paginationControls = [
                    {
                        selector: ".sdb-pagination-btn",
                        listener: "click"
                    },
                    {
                        selector: ".sdb-pagination-jump .np-stepper-input",
                        listener: "change"
                    },
                    {
                        selector: ".sdb-filters .sdb-select, .sdb-filters .sdb-search-input",
                        listener: "change"
                    }
                ]
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

    let itemsNotInCache = [];
    let itemsOnPage = [];
    processItems();

    if (paginationControls) {
        addPaginationListeners();
    }

    async function addPaginationListeners() {
        if (sleepBeforeAddingListeners) {
            await sleep(sleepBeforeAddingListeners);
        }

        paginationControls.forEach((thing) => {
            const controls = document.querySelectorAll(thing.selector);
            controls.forEach((c) => {
                c.addEventListener(thing.listener, async () => {
                    await sleep(100);
                    console.log("Re-processing");
                    processItems();

                    if (reAddPagination) {
                        addPaginationListeners();
                    }
                });
            });
        });
    }

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
        let allItemsQuerySelector = "";
        let getNameFromEl = null;
        let getPriceFromEl = null;
        let otherActionsOnEl = null;
        let skipCondition = null;
        let sleepTime = 0;

        switch (pageType) {
            case "Almost Abandoned Attic":
                allItemsQuerySelector = "ul#items li";
                getNameFromEl = (el) => el.getAttribute("oname");
                getPriceFromEl = (el) => parseInt(el.getAttribute("oprice").replaceAll(",", ""));
                otherActionsOnEl = (el) => {
                    el.style.height = "auto";
                    el.style.padding = 0;
                    el.style.margin = "2px";
                }
                break;
            case "Igloo Garage Sale":
                allItemsQuerySelector = ".igs-item";
                getNameFromEl = (el) => el.querySelector("p b").innerText;
                getPriceFromEl = (el) => {
                    const priceEl = el.querySelector("p:has(b) + p"),
                        priceString = priceEl.innerText.match(/[0-9]+/)[0];
                    return parseInt(priceString);
                }
                break;
            case "Standard Shop":
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
            case "User Shop":
                allItemsQuerySelector = ".bsp-item > button";
                getNameFromEl = (el) => el.dataset.name;
                getPriceFromEl = (el) => el.dataset.price;
                break;
            case "Money Tree":
                allItemsQuerySelector = ".moneytree-grid > .donated > a";
                getNameFromEl = (el) => el.dataset.name;
                skipCondition = (el) => {
                    const name = getNameFromEl(el);
                    return name.match(/[0-9]+ NP/);
                }
                break;
            case "Second-Hand Shoppe":
                allItemsQuerySelector = ".content > div > table td > a";
                getNameFromEl = (el) => el.querySelector("div:has(img) + div").innerText;
                break;
            case "Rubbish Dump":
                allItemsQuerySelector = "td:has(> a[href^='/takedonation_new.phtml?'])";
                getNameFromEl = (el) => el.querySelector("b").innerText;
                break;
            case "SDB":
                allItemsQuerySelector = ".sdb-item-info";
                getNameFromEl = (el) => el.querySelector(".sdb-item-name").innerText;
                sleepTime = 200;
                break;
            case "Inventory":
                allItemsQuerySelector = ".item-grid .grid-item";
                getNameFromEl = (el) => el.querySelector(".item-name").innerText;
                sleepTime = 200;
                break;
            case "Quick Stock":
                allItemsQuerySelector = ".np-table-row:not(:last-child) > td:first-child";
                getNameFromEl = (el) => el.querySelector("span").innerText;
                sleepTime = 200;
                break;
            case "Shop Stock":
                allItemsQuerySelector = ".market-your-item__info";
                getNameFromEl = (el) => el.querySelector(".market-your-item__name").innerText;
                break;
            default:
                console.log("No item fetch script for page type!");
                return;
        }

        if (sleepTime > 0) {
            await sleep(sleepTime);
        }

        let allItemEls = document.querySelectorAll(allItemsQuerySelector);
        if (allItemEls.length == 0) return null;

        let result = [];

        allItemEls.forEach((itemEl) => {
            if (skipCondition && skipCondition(itemEl)) return;

            if (otherActionsOnEl) {
                otherActionsOnEl(itemEl);
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
        let additionalStyling = {};
        let displayMarketPrice = true;
        let displayPriceDiff = item.price && item.price > 0;
        let displayRarity = false;

        switch (pageType) {
            case "Almost Abandoned Attic":
                displayRarity = true;
                break;
            case "Money Tree":
                displayRarity = true;
                additionalStyling = {
                    textAlign: "center"
                };
                break;
            case "Second-Hand Shoppe":
                displayRarity = true;
                additionalStyling = {
                    fontWeight: "normal"
                };
                break;
            case "Rubbish Dump":
                displayRarity = true;
                break;
            case "Standard Shop":
                displayRarity = true;
                additionalStyling = {
                    fontFamily: '"MuseoSansRounded500", "Arial", sans-serif',
                    textAlign: "center"
                };
                break;
            case "User Shop":
                displayRarity = true;
                break;
            case "Igloo Garage Sale":
                displayRarity = true;
                break;
            case "SDB":
                highlightMarketPriceThreshold = 0;
                break;
            case "Inventory":
                additionalStyling = {
                    textAlign: "center"
                }
                break;
            case "Quick Stock":
                additionalStyling = {
                    marginLeft: "2rem"
                }
                break;
            case "Shop Stock":
                highlightMarketPriceThreshold = 0;
                additionalStyling = {
                    textAlign: "start"
                }
                break;
            default:
                console.log("No item handler for page type!");
                return;
        }

        const itemData = cachedItems[item.name];
        if (!itemData.marketPrice) return;

        const price = itemData.marketPrice;
        let content = "";
        let highlight = false;
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

        highlight = highlightMarketPriceThreshold > 0 && price > highlightMarketPriceThreshold;

        if (displayPriceDiff) {
            let priceDiff = itemData.marketPrice - item.price;
            if (content.length > 0) {
                content += "<br>";
            }
            content += `<span>Price Difference: <strong>${priceDiff}</strong></span>`;

            if (highlightPriority == "diff") {
                highlight = highlightPriceDiffThreshold > 0 && priceDiff > highlightPriceDiffThreshold;
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

        if (highlight) {
            Object.assign(item.el.style, highlightStyle);
        }

        if (negativeIndicator) {
            Object.assign(item.el.style, negativeStyle);
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
        return new Promise(r => setTimeout(r, 2000));
    }

})();