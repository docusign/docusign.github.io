/**
 * Copyright (c) 2023 - DocuSign, Inc. (https://www.docusign.com)
 * License: The MIT License. See the LICENSE file.
 */

/**
 * File: utils.js
 * Utilities used across the project
 */

/**
 * 
 * @param {string} msg -- text or html 
 * @param {string} title -- text 
 * @param {string} status -- INFO, SUCCESS, DANGER, WARNING 
 */
function toast (msg, status="INFO") {
    let toast = {
        title: msg,
        status: TOAST_STATUS[status],
        timeout: 3000
    }
    Toast.setPlacement(TOAST_PLACEMENT.TOP_CENTER);
    Toast.create(toast);
}

/**
 * Retrieve the settings from local storage
 */
const settingsKey = "apiLogger"
function settingsGet() {
    let settings;
    try {
        settings = localStorage.getItem(settingsKey);
        settings = JSON.parse(settings);
    } catch (error) {
        settings = {}
    }
    if (!settings) {settings = {}}
    return settings
}

/**
 * Store the settings to local storage
 */
function settingsSave(settings) {
    try {
        const s = JSON.stringify(settings);
        localStorage.setItem(settingsKey, s);
        toast(`Settings saved!`, "SUCCESS")
    } catch (error) {
        toast(`Could not save settings: ${error.message}`, "DANGER")
    }
}

export {toast, settingsGet, settingsSave}