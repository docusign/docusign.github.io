/**
 * Copyright (c) 2023 - Docusign, Inc. (https://www.docusign.com)
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
 * Retrieve the K settings from local storage
 */
const kSettingsKey = "apiLogger"
function kSettingsGet() {
    let kSettings;
    try {
        kSettings = localStorage.getItem(kSettingsKey);
        kSettings = JSON.parse(kSettings);
    } catch (error) {
        kSettings = {}
    }
    if (!kSettings) {kSettings = {}}
    return kSettings
}

/**
 * Store the K Settings to local storage
 */
function kSettingsSave(kSettings) {
    try {
        const s = JSON.stringify(kSettings);
        localStorage.setItem(kSettingsKey, s);
        toast(`Settings saved!`, "SUCCESS")
    } catch (error) {
        toast(`Could not save settings: ${error.message}`, "DANGER")
    }
}

/**
 * Retrieve the column settings from local storage
 */
const columnSettingsKey = "apiLoggerColumns"
function columnSettingsGet() {
    let columnSettings;
    try {
        columnSettings = localStorage.getItem(columnSettingsKey);
        columnSettings = JSON.parse(columnSettings);
    } catch (error) {
        columnSettings = {}
    }
    if (!columnSettings) {columnSettings = {}}
    return columnSettings
}

/**
 * Store the column Settings to local storage
 */
function columnSettingsSave(columnSettings) {
    try {
        const s = JSON.stringify(columnSettings);
        localStorage.setItem(columnSettingsKey, s);
        toast(`Column settings saved!`, "SUCCESS")
    } catch (error) {
        toast(`Could not save column settings: ${error.message}`, "DANGER")
    }
}

export {toast, kSettingsGet, kSettingsSave, columnSettingsGet, columnSettingsSave} 