/**
 * Copyright (c) 2023 - DocuSign, Inc. (https://www.docusign.com)
 * License: The MIT License. See the LICENSE file.
 */

/**
 * File: gridOps.js
 * Manages the grid (table) of log entries, the modal display of a single
 * log entry, and implements the grid actions (Save the log entry as 
 * text in the clipboard, copy the traceToken to the clipboard, etc)
 */

import {
    toast
} from "./utils.js";

const Grid = tui.Grid;
const loggerEvent = "loggerEvent";
const gridEl = document.getElementById('grid'); // Container element

class GridOps {

    columns = [
        {name: "view", header: "Action", hidden: false, resizable: true, draggable: true, 
            sortable: false, width: 80, align: "center", 
            renderer: {type: ButtonRenderer, options: {gridOps: this}}},
        {name: "traceToken", header: "Trace Token", hidden: true, resizable: true, 
            formatter: null, sortable: true, draggable: true},
        {name: "timestamp", header: "Timestamp", hidden: false, resizable: true, 
            formatter: null, sortable: true, width: 220, draggable: true,
            comparator: this.timestampComparator.bind(this)},
        {name: "status", header: "Status", hidden: false, resizable: true, 
            formatter: this.statusFormatter, sortable: true, align: "center",
            width: 90, draggable: true},
        {name: "statusCodeString", header: "Status Code", hidden: false, resizable: true, 
            formatter: null, sortable: true, width: 110, draggable: true},
        {name: "operation", header: "Operation", hidden: false, resizable: true, 
            formatter: this.operationFormatter, sortable: true, width: 110, draggable: true},
        {name: "cors", header: "CORS", hidden: true, resizable: true, 
            formatter: this.boolFormatter, sortable: true, draggable: true},
        {name: "multipart", header: "Multipart", hidden: true, resizable: true, 
            formatter: this.boolFormatter, sortable: true, draggable: true},
        {name: "name", header: "API Name", hidden: false, resizable: true, draggable: true, 
            sortable: true, width: 200, 
            renderer: {type: CustomNameRenderer, options: {gridOps: this}}},
        {name: "ndse", header: "NDSE", hidden: true, resizable: true, 
            formatter: this.boolFormatter, sortable: true, draggable: true},
        {name: "url", header: "URL", hidden: false, resizable: true, 
            formatter: null, sortable: true, draggable: true},
        ];

    constructor(logger, settings) {
        this.logger = logger;
        this.settings = settings;
        document.addEventListener(loggerEvent, this.eventDispatcher.bind(this));
        $("#grid").on("click", this.buttonClicked.bind(this));
        // Global grid settings
        Grid.applyTheme('striped'); // Call API of static method
        this.grid = new Grid({
            el: gridEl,
            data: [],
            usageStatistics: false,
            columnOptions: {resizable: true, draggable: true},
            keyColumnName: "timestamp",
            columns: this.columns
        });
        $("#modalLogEntry").on("hidden.bs.modal", this.modalHidden.bind(this));
        $("#modalLogEntry").on("hide.bs.modal", this.modalChange.bind(this));
        $("#modalLogEntry").on("show.bs.modal", this.modalChange.bind(this));
        // Use the window.history object so the backbutton will work as
        // people expect it to with respect to the full page View modal
        // See https://medium.com/@george.norberg/history-api-getting-started-36bfc82ddefc
        // Initialize
        window.history.replaceState({modalStateOpen: false}, null, "");
        window.onpopstate = this.onPopState.bind(this);
    }

    eventDispatcher (e) {
        if (e.detail.key == "loadComplete") {
            this.loadComplete(e);
        }
    }

    loadComplete(e) {
        let newData = [];
        this.logger.logs.forEach(log => {
            newData.push({
                traceToken: log.traceToken, 
                timestamp: log.timestamp, 
                status: log.status, 
                statusCodeString: log.statusCodeString, 
                operation: log.operation,
                cors: log.cors,
                multipart: log.multipart,
                name: log.name,
                url: log.url,
                ndse: log.ndse
            })
        });
        if (!e.detail.loadModeAppend) {
            this.grid.clear();
        }

        this.grid.resetData(newData); // Call API of instance's public method
        this.grid.sort("timestamp", true, false); // https://nhn.github.io/tui.grid/latest/Grid#sort
    }

    refresh(settings) {
        this.settings = settings;
        this.loadComplete({detail: {loadModeAppend: false}})
    }

    // https://github.com/nhn/tui.grid/blob/master/packages/toast-ui.grid/docs/en/sort.md
    timestampComparator(valueA, valueB, rowA, rowB) {
        return this.logger.lookupByTimestamp(valueA).timeMicroSeconds -
        this.logger.lookupByTimestamp(valueB).timeMicroSeconds
    }
      
    operationFormatter(v) {
        // v = {row, column, value}
        const val = v.value;
        let newVal = val;
        let klass = ""
        if (val === "GET") {
            klass = "pill get"
        } else if (val === "POST") {
            klass = "pill post"
        } else if (val === "PUT") {
            klass = "pill put"
        } else if (val === "DELETE") {
            klass = "pill delete";
            newVal = "DEL"
        }
        return `<span class="${klass}">${newVal}</span>`
    }
    boolFormatter(v) {
        return v.value ? "✅" : "❌"
    }
    statusFormatter(v) {
        // status {success, failed, other}. Other for 300-level
        let ret;
        if (v.value === "success") {
            ret = "✅";
        } else if (v.value === "failed") {
            ret = "❌";
        } else {
            ret = "⚠️";
        }
        return ret
    }
    nameFormatter(v) {
        return this.logger.lookupByTimestamp(v.row.timestamp).html
    }

    /**
     * The user clicked, maybe on a View button
     * We don't want to add/remove listeners to each button, 
     * so we're listening to all click events.
     * @param {*} event 
     */
    async buttonClicked(event){
        if (event.target.nodeName !== 'BUTTON') {return}
        const rowKey = event.target.getAttribute('data-rowkey');
        if (!rowKey) {return}
        const buttonOp = event.target.getAttribute('data-button-op');
        if (!buttonOp) {return}

        if (buttonOp === "view") {this.buttonView(rowKey)}
        if (buttonOp === "c") {this.buttonCopyToClipboard(event)}
        if (buttonOp === "custom") {this.buttonCustomCopyToClipboard(event)}
    }

    /**
     * Populate the modal view of the log entry, the modal was just opened
     * @param {string} rowKey 
     */
    buttonView(rowKey) {
        const logEntry = this.logger.lookupByTimestamp(rowKey);
        let requestBody, responseBody;
        if (logEntry.requestJson) {
            requestBody = `<pre><code class="language-json">${JSON.stringify(logEntry.requestJson, null, 4)}</code></pre>`
        } else {
            requestBody = `<pre>${logEntry.requestBody}</pre>`
        }
        if (logEntry.responseJson) {
            responseBody = `<pre><code class="language-json">${JSON.stringify(logEntry.responseJson, null, 4)}</code></pre>`
        } else {
            responseBody = `<pre>${logEntry.responseBody}</pre>`
        }

        // Set header row of the modal
        let title = `<span class="me-5">${logEntry.fileName}</span>`;
        if (logEntry.docsUrl) {
            title += `<a href="${logEntry.docsUrl}" target="_blank">${logEntry.name}</a>`
        } else {
            title += `${logEntry.name}`;
        }
        const closeBtn = `<button type="button" class="btn btn-primary me-5" data-bs-dismiss="modal">Close</button>`;
        const copyToClipboardBtn = `<button type="button" class="btn btn-sm ms-5 btn-outline-success ctclip"  
            data-rowkey="${rowKey}" data-button-op="clipboard-copy">Copy Log Entry to Clipboard</button>`;
        const customBtn = (this.settings.ver && this.settings.useCustomSbutton && this.settings.customBtnLabel) ?
            `<button type="button" class="btn btn-sm ms-5 btn-outline-success customButton"` +
            `data-rowkey="${rowKey}" data-button-op="clipboard-copy">` +
            `${this.settings.customBtnLabel}</button>` : "";

        $("#modalLogEntryLabel").empty().html(closeBtn + title + copyToClipboardBtn + customBtn);
        $("#modalLogEntryLabel .ctclip").on("click", this.buttonCopyToClipboard.bind(this));
        $("#modalLogEntryLabel .customButton").on("click", this.buttonCustomCopyToClipboard.bind(this));

        // log-body-intro
        const ttbtn = `
        <button type="button" class="btnimg" data-rowkey="${rowKey}" data-button-op="trace-copy"
            id="btn-trace-copy">
            <img src="assets/copy-to-clipboard28.png" height="28" width="28" />
        </button>`;
        const cors = logEntry.cors ? ' <span class="allcaps">cors</span>' : "";
        const multipart = logEntry.multipart ? ' <span class="allcaps">multipart</span>' : "";
        const ndse = logEntry.ndse ? ' <span class="allcaps">ndse</span>' : "";
        const traceToken = `<span class="ms-5">Tracetoken: ${logEntry.traceToken}</span>${ttbtn}`;
        $("#log-body-intro").empty().append(
            `${logEntry.statusCodeString}${cors}${multipart}${ndse}${traceToken}`
        )
        $("#btn-trace-copy").on("click", this.buttonCopyTraceToClipboard.bind(this));
        $("#request-tab-pane").empty().append(
            `<p><pre class="whitebgnd">Timestamp: ${logEntry.timestamp}\n\n` + 
            `${logEntry.requestHeaders}</pre></p>${requestBody}`);
        $("#response-tab-pane").empty().append(
            `<p><pre class="whitebgnd">${logEntry.responseHeaders}</pre></p>${responseBody}`);
        hljs.highlightAll(); // Add highlighting https://highlightjs.org/
    }

    async buttonCopyToClipboard(event) {
        const rowKey = event.target.getAttribute('data-rowkey');
        if (!rowKey) {return}
        await this.logger.writeToClipboard(rowKey);
    }

    async buttonCopyTraceToClipboard(event) {
        let target = event.target;
        if (target.nodeName === "IMG") {target = target.parentElement}
        const rowKey = target.getAttribute('data-rowkey');
        if (!rowKey) {return}
        const logEntry = this.logger.lookupByTimestamp(rowKey);
        await navigator.clipboard.writeText(logEntry.traceToken);
        toast("Copied to clipboard!", "SUCCESS");
    }

    async buttonCustomCopyToClipboard(event) {
        let target = event.target;
        const rowKey = target.getAttribute('data-rowkey');
        if (!rowKey) {return}
        const logEntry = this.logger.lookupByTimestamp(rowKey);
        let template = this.settings.customTemplate;
        template = template.replaceAll("{TraceToken}", logEntry.traceToken);
        template = template.replaceAll("{Timestamp}", logEntry.timestamp);
        await navigator.clipboard.writeText(template);
        toast("Custom template to clipboard!", "SUCCESS");
    }

    // Cleanup -- delete listeners when modal is closed.
    modalHidden() {
        $("#modalLogEntryLabel .ctclip").off("click");
        $("#modalLogEntryLabel .customButton").off("click");
        $("#btn-trace-copy").off("click");
    }

    /**
     * Manage the window history
     */
    modalChange(event) {
        // Called both when the modal is opening and closing
        if (event.type === "show") {
            window.history.pushState({modalStateOpen: true}, null, "");
        } else if (event.type === "hide") {
            if (window.history.state.modalStateOpen) {
                window.history.back()
            }
        }
        
        console.log(event)
    }
    onPopState(event) {
        // The user pressed the back button.
        // Close the modal. (Calling hide while hidden is a nop.)
        bootstrap.Modal.getInstance("#modalLogEntry").hide();
    }
}


// https://github.com/nhn/tui.grid/blob/master/packages/toast-ui.grid/docs/en/custom-renderer.md#default-renderer-styling
/**
 * For some unknown reason, I can't just use the custom formatter with
 * an "a" element with target="_blank". Sigh. So I'm using a 
 * "custom renderer"
 */
class CustomNameRenderer {
    constructor(props) {
        const el = document.createElement('span');
        this.el = el;
        this.render(props);
    }
    
    getElement() {
        return this.el;
    }
    
    render(props) {
        const { gridOps } = props.columnInfo.renderer.options;    
        const logEntry = gridOps.logger.lookupByTimestamp(props.rowKey);
        const value = props.value; // can be undefined
        const docsUrl = logEntry.docsUrl;
        if (docsUrl) {
            $(this.el).empty().append(`<a href="${docsUrl}" target="_blank">${value}</a>`)
        } else {
            $(this.el).empty().text(value)
        }
    }
}

// https://github.com/nhn/tui.grid/blob/master/packages/toast-ui.grid/docs/en/custom-renderer.md#default-renderer-styling
/**
 * View (and C) button(s)
 */
class ButtonRenderer {
    constructor(props) {
        const el = document.createElement('span');
        this.el = el;
        this.render(props);
    }
    
    getElement() {
        return this.el;
    }
    
    render(props) {
        const { gridOps } = props.columnInfo.renderer.options;
        const settings = gridOps.settings;
        let buttonLetter, buttonOp;
        if (settings.ver && settings.useCustomSbutton) {
            buttonLetter = settings.customBtnLetter;
            buttonOp = "custom";
        } else {
            buttonLetter = "C";
            buttonOp = "c";
        }

        $(this.el).empty().append(
            `<button type="button" class="btn btn-primary btn-sm" data-bs-toggle="modal" 
            data-bs-target="#modalLogEntry" data-rowkey="${props.rowKey}" data-button-op="view">V</button>` +
            `&nbsp;&nbsp;<button type="button" class="btn btn-secondary btn-sm" data-bs-toggle="modal" 
             data-rowkey="${props.rowKey}" data-button-op="${buttonOp}">${buttonLetter}</button>`
            )
    }
}


export { GridOps };