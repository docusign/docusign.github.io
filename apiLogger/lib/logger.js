/**
 * Copyright (c) 2023 - Docusign, Inc. (https://www.docusign.com)
 * License: The MIT License. See the LICENSE file.
 */

/**
 * File: logger.js
 * The overall log file processing and use.
 */

import {
    toast
} from "./utils.js";
import {
    Log
} from "./log.js";
import {
    ApiNames
} from "./apiNames.js";


const zip = new JSZip();

class Logger {
    constructor() {
        this.apiNames = new ApiNames();
    }

    logs = [];
    loadModeAppend = false;

    /**
     * 
     * @param {FileObject} file 
     * @param {Boolean} append 
     */
    async loadZipFile(file, append = false) {
        this.loadModeAppend = append;
        if (!this.loadModeAppend) {
            this.logs = [];
        }
        const reader = new FileReader();
        reader.onload = this.zipFileLoaded.bind(this);
        reader.readAsArrayBuffer(file); // continues via callback
    }

    // Callback once the file has completing upload to the *browser*
    // (Not uploaded to a server!)
    // Unzip the file and each of the included files
    async zipFileLoaded (e) {
        // e.target.result is the file's content as text
        const fileContents = e.target.result;
        //toast(`Read ${fileContents.byteLength} bytes.`);

        const zipFile = await zip.loadAsync(fileContents);
        const fileNames = Object.keys(zipFile.files).filter ( f => !f.dir);
        for (let i = 0; i < fileNames.length; i++) {
            let data = await zipFile.files[fileNames[i]].async("text");
            this.logs.push(new Log(fileNames[i], data, this.apiNames));
        }
        
        // Notify rest of project that the upload is done.
        // cf gridOps
        const loggerEvent = new CustomEvent("loggerEvent", {
            detail: {key: "loadComplete", loadModeAppend: this.loadModeAppend},
            bubbles: true,
            cancelable: true,
            composed: false
        })
        document.dispatchEvent(loggerEvent);
    }

    /**
     * Look up the log entry via timestamp
     * Future optimization (if warrented) use an associative 
     * lookup instead of the current array scan. But the 
     * amount of optimization may not be worth it. Usually a max
     * of 50 entries in the log array. 
     * @param {string} timestamp 
     * @returns 
     */
    lookupByTimestamp(timestamp) {
        return this.logs.find(v => v.timestamp === timestamp)
    }

    async writeToClipboard(timestamp) {
        const logEntry = this.lookupByTimestamp(timestamp);
        const text = logEntry.asText();
        await navigator.clipboard.writeText(text);
        toast("Copied to clipboard!", "SUCCESS");
    }
}
export { Logger };