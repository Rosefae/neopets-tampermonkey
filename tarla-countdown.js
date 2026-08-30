// ==UserScript==
// @name         Tarla's Non-Toolbar Countdown
// @namespace    http://tampermonkey.net/
// @version      2026-08-29
// @description  Count down until the next Tarla time
// @author       rose@byanyothername.me
// @match        https://www.neopets.com/freebies/tarlastoolbar.phtml
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @require      https://cdn.jsdelivr.net/npm/simple-notification-sounds@1.0.0/dist/simple-notification-sounds.umd.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    const localStorageKey = "tarlaTimeForRoseScript";

    let { nextPrizeTime = "00:00",
        getDropPrizeInstead = false,
        enableNotifSound = false,
        infoSource = "https://www.neopets.com/neoboards/topic.phtml?topic=161867176"
    } = GM_getValue(localStorageKey, {});

    const nstTimezone = "America/Los_Angeles";
    const contentEl = document.querySelector(".content");
    if (!contentEl.innerText.includes("Tarla is at the prize warehouse right now. Check back later to see if she's here!")) return;

    const countdownBox = document.createElement("div");
    Object.assign(countdownBox.style, {
        color: "rebeccapurple",
        fontSize: "2rem",
        fontWeight: "bold",
        textAlign: "center"
    });

    contentEl.appendChild(countdownBox);

    const timeForm = document.createElement("div");
    timeForm.style.textAlign = "center";
    timeForm.innerHTML = `
    <h2>Enter Next Tarla Prize Time</h2>
    <label><span>Next Prize Time (24 hour HH:mm format)</span><br>
    <input type="text"></label><br>
    <label><input type="checkbox"><span>Count down to drop prize instead of main prize</span></label><br>
    `;
    const infoSourceLink = document.createElement("a");
    Object.assign(infoSourceLink.style, {
        fontSize: "1.2rem",
        fontWeight: "bold",
        margin: "0.5rem",
    });
    infoSourceLink.innerText = "Find Today's Times";
    updateInfoLink();
    timeForm.appendChild(infoSourceLink);

    const timeInput = timeForm.querySelector("input[type='text']"),
        dropPrizeCheckbox = timeForm.querySelector("input[type='checkbox']");

    timeInput.addEventListener("change", updateInfo);
    timeInput.value = nextPrizeTime;
    dropPrizeCheckbox.addEventListener("change", updateInfo);
    dropPrizeCheckbox.checked = getDropPrizeInstead;
    contentEl.appendChild(timeForm);

    const settingsForm = document.createElement("div");
    settingsForm.style.textAlign = "center";
    settingsForm.style.marginTop = "1rem";
    settingsForm.innerHTML = `
    <h2>Countdown & Notification Settings</h2>
    <label><input type="checkbox"><span>Enable notification sound</span></label>
    <button type="button">Test Sound</button><br>
    <label><span>Your "Find Today's Times" URL</span><br><input type="text"></label>
    `;

    const notifSoundCheckbox = settingsForm.querySelector("input[type='checkbox']"),
        testSoundBtn = settingsForm.querySelector("button"),
        infoSourceInput = settingsForm.querySelector("input[type='text']");
    notifSoundCheckbox.addEventListener("change", () => {
        enableNotifSound = notifSoundCheckbox.checked;
        updateCache();
    });
    notifSoundCheckbox.checked = enableNotifSound;
    testSoundBtn.addEventListener("click", playSound);
    infoSourceInput.addEventListener("change", () => {
        infoSource = infoSourceInput.value;
        updateInfoLink();
        updateCache();
    });
    infoSourceInput.value = infoSource;

    contentEl.appendChild(settingsForm);

    if (typeof Temporal !== 'undefined') {
        console.log("can use Temporal");
        updateDuration();
        window.setInterval(updateDuration, 60000);
    }

    function playSound() {
        window.SimpleNotificationSounds.playAttention("long");
        console.log(window.SimpleNotificationSounds);
    }

    function updateInfoLink() {
        if (!infoSource) {
            infoSourceLink.style.display = "none";
        } else {
            infoSourceLink.href = infoSource;
            infoSourceLink.style.display = "inline-block";
        }
    }

    function updateInfo() {
        nextPrizeTime = timeInput.value;
        getDropPrizeInstead = dropPrizeCheckbox.checked;
        updateDuration();
        updateCache();
    }

    function updateCache() {
        GM_setValue(localStorageKey, {
            nextPrizeTime,
            getDropPrizeInstead,
            enableNotifSound,
            infoSource
        });
    }

    function getDurationUntilDrop() {
        const now = Temporal.Now.zonedDateTimeISO();
        const dropTime = Temporal.ZonedDateTime.from(now).withTimeZone(nstTimezone).withPlainTime(nextPrizeTime);

        let duration = now.until(dropTime, { smallestUnit: "minutes" });

        if (getDropPrizeInstead) {
            duration = duration.add({ minutes: 15 });
        }

        if (duration.sign < 0) {
            duration = duration.add({ days: 1 });
        }

        console.log("Time until prize: ", duration);

        return duration;
    }

    function updateDuration() {
        let duration = getDurationUntilDrop();

        if (duration.sign == 0) {
            countdownBox.style.color = "red";
            countdownBox.innerHTML = "PRIZE IS HAPPENING NOW! REFRESH YOUR PAGE!";
            if (enableNotifSound) playSound();
            return;
        }

        countdownBox.innerHTML = `${getDropPrizeInstead ? "Drop prize" : "Main prize"} in ${duration.hours} hrs ${duration.minutes} minutes`;
    }
})();