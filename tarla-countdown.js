// ==UserScript==
// @name         Tarla's Non-Toolbar Countdown
// @namespace    http://tampermonkey.net/
// @version      2026-08-29
// @description  Count down until the next Tarla time
// @author       You
// @match        https://www.neopets.com/freebies/tarlastoolbar.phtml
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const nextPrizeTime = "20:21"; // time in NST aka US Pacific Time
    // I don't know how people are getting these times for posting on the board, so until them this will need to be updated manually
    // Thread: https://www.neopets.com/neoboards/topic.phtml?topic=161867176

    const getDropPrizeInstead = false;

    const nstTimezone = "America/Los_Angeles";
    const prizeType = getDropPrizeInstead ? "Drop prize" : "Main prize";

    const contentEl = document.querySelector(".content");
    if (!contentEl.innerText.includes("Tarla is at the prize warehouse right now. Check back later to see if she's here!")) return;

    const countdownBox = document.createElement("div");
    Object.assign(countdownBox.style, {
        color: "red",
        fontSize: "2rem",
        fontWeight: "bold",
        textAlign: "center"
    });

    contentEl.appendChild(countdownBox);

    if (typeof Temporal !== 'undefined') {
        console.log("can use Temporal");
        updateDuration();
        window.setInterval(updateDuration, 60000);
    }

    function getDurationUntilDrop() {
        const now = Temporal.Now.zonedDateTimeISO();
        const dropTime = Temporal.ZonedDateTime.from(now).withTimeZone(nstTimezone).withPlainTime(nextPrizeTime);

        let duration = now.until(dropTime, { smallestUnit: "minutes" });

        if (duration.sign < 0) {
            duration = duration.add({ days: 1 });
        }

        if (getDropPrizeInstead) {
            duration = duration.add({ minutes: 15 });
        }

        console.log("Time until prize: ", duration);

        return duration;
    }

    function updateDuration() {
        let duration = getDurationUntilDrop();
        countdownBox.innerHTML = `${prizeType} in ${duration.hours} hrs ${duration.minutes} minutes`;
    }
})();