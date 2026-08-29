// ==UserScript==
// @name         Lunar Temple Puzzle
// @namespace    http://tampermonkey.net/
// @version      2026-03-26
// @description  Highlight the correct answer to the lunar temple puzzle.
// @author       rose@byanyothername.me
// @match        https://www.neopets.com/shenkuu/lunar/?show=puzzle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var puzzleImgString = swf.attributes.swf; // swf should be a existing global var
    console.log("Puzzle image URL: " + puzzleImgString);
    var puzzleImgUrl = new URL(puzzleImgString);
    var angleKreludor = puzzleImgUrl.searchParams.get("angleKreludor");
    console.log("angleKreludor: " + angleKreludor);
    var answerNumber = Math.round(angleKreludor / 22.5);
    console.log("Correct Answer: " + answerNumber);

    var radioValue = (answerNumber + 8) % 16;
    console.log("Radio Value: " + radioValue);

    var choice = document.querySelector("input[name='phase_choice'][value='" + radioValue + "']");
    highlight(choice.closest("td"));

    function highlight(el) {
        el.style.boxShadow = "0 0 5px red";
        el.style.borderRadius = "5px";
    }
})();