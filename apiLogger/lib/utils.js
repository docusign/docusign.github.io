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
const kustoSettingsKey = "apiLogger"
function kustoSettingsGet() {
    let kustoSettings;
    try {
        kustoSettings = localStorage.getItem(kustoSettingsKey);
        kustoSettings = JSON.parse(kustoSettings);
    } catch (error) {
        kustoSettings = {}
    }
    if (!kustoSettings) {kustoSettings = {}}
    return kustoSettings
}

/**
 * Store the kustoSettings to local storage
 */
function kustoSettingsSave(kustoSettings) {
    try {
        const s = JSON.stringify(kustoSettings);
        localStorage.setItem(kustoSettingsKey, s);
        toast(`Settings saved!`, "SUCCESS")
    } catch (error) {
        toast(`Could not save settings: ${error.message}`, "DANGER")
    }
}

export {toast, kustoSettingsGet, kustoSettingsSave}