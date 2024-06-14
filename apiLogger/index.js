/**
 * Copyright (c) 2023 - Docusign, Inc. (https://www.docusign.com)
 * License: The MIT License. See the LICENSE file.
 */

/**
 * File: index.js
 * The mainline for the project. 
 */

import {
    Logger
} from "./lib/logger.js";
import {
    GridOps
} from "./lib/gridOps.js";
import {
    toast, kSettingsSave, kSettingsGet, columnSettingsGet, columnSettingsSave
} from "./lib/utils.js";

// Using jQuery
$(function() {
    // columnSettingsAttributes is in index.js and gridOps.js
    const columnSettingsAttributes = ["timestamp", "filename", "traceToken", "status", 
    "statusCodeString", "operation", "cors", "multipart", "name", "ndse", "url"];
    
    // upload and process a zip file in the browser
    async function loadZipFile(e) {
        const el = $("#loadZipFile")[0];
        const file = el.files[0];
        
        if (file) {
            $("#currentfile").text(`File: ${file.name}`); // nav bar file name
            toast (`Loading ${file.name}...`);
            await logger.loadZipFile(file);
        } else {
            toast ("Problem: Please choose a file", "DANGER")
        }
    }

    // Save the kSettings in local browser storage
    function saveKSettings(e) {
        kSettings = {
            ver: 1,
            useCustomSbutton: $("#useCustomSbutton").val() === "true", // convert to boolean
            customBtnLetter: $("#customBtnLetter").val(),
            customBtnLabel: $("#customBtnLabel").val(),
            customTemplate: $("#customTemplate").val()
        }
        if (!kSettings.useCustomSbutton) {kSettings = {}}; // reset
        kSettingsSave(kSettings);
        // refresh the grid
        gridOps.refresh(kSettings, columnSettings);
    }

    // set kSettings modal to the current kSettings
    function currentKSettings() {
        if (!kSettings.ver) {
            $("#useCustomSbutton").val("false");
        } else {
            $("#useCustomSbutton").val(kSettings.useCustomSbutton ? "true" : "false");
            $("#customBtnLetter").val(kSettings.customBtnLetter);
            $("#customBtnLabel").val(kSettings.customBtnLabel);
            $("#customTemplate").val(kSettings.customTemplate);
        }
    }

    // Save the columnSettings in local browser storage
    function saveColumnSettings(e) {
        columnSettings = {ver: 1};
        columnSettingsAttributes.forEach(attr => {
            columnSettings[attr] = $(`#${attr}Ck`).is(":checked")
        });
        columnSettingsSave(columnSettings);
        // refresh the grid
        gridOps.refresh(kSettings, columnSettings);
    }

    // set columnSettings modal to the current columnSettings
    function currentColumnSettings() {
        columnSettingsAttributes.forEach(attr => {
            $(`#${attr}Ck`).prop('checked', columnSettings[attr])
        });
    }

    // FAQ display
    // The FAQ is in Markdown format.
    // Convert it to HTML and update the modal's body
    function faqDisplay() {
        if (faqPoured) {return} // EARLY return
        faqPoured = true;
        const converter = new showdown.Converter();
        const html = converter.makeHtml(window.faqmd); // see lib/faq.md.js
        $("#modalFaq .modal-body").html(html);
        $("#modalFaq .modal-body a").attr("target", "_blank");
    }

    function startup() {
        //modal autofocus. See https://getbootstrap.com/docs/5.3/components/modal/#how-it-works
        const myModal1 = document.getElementById('modalLoadZip')
        const myInput1 = document.getElementById('loadZipFile')
        myModal1.addEventListener('shown.bs.modal', () => {
            myInput1.focus()
        })
        $("#modalLoadZip .btn-primary").on("click", loadZipFile.bind(this));
        $("#modalSettings .btn-primary").on("click", saveKSettings.bind(this));
        $("#modalColumns .btn-primary").on("click", saveColumnSettings.bind(this));
        $("#modalFaq").on("show.bs.modal", faqDisplay.bind(this));

        // Proactively open the LoadZipFile modal upon startup
        // The user can also open via the top nav item
        loadZipFileModal = new bootstrap.Modal("#modalLoadZip");
        loadZipFileModal.show();
        currentKSettings();
        currentColumnSettings();
    }

    //// The MAINLINE //// 
    let loadZipFileModal = null;
    let kSettings = kSettingsGet();
    let columnSettings; // Set below
    let faqPoured = false; // has the FAQ modal been set?
    const logger = new Logger();
    const gridOps = new GridOps(logger, kSettings);
    columnSettings = columnSettingsGet()
    columnSettings = gridOps.initializeColumnSettings(columnSettings);
    startup();
});
