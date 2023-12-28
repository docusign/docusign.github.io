/**
 * Copyright (c) 2023 - DocuSign, Inc. (https://www.docusign.com)
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
    toast, settingsSave, settingsGet
} from "./lib/utils.js";

// Using jQuery
$(function() {

    let loadZipFileModal = null;
    let settings = settingsGet();
    
    // upload and process a zip file in the browser
    async function loadZipFile(e) {
        const el = $("#loadZipFile")[0];
        const file = el.files[0];
        
        if (file) {
            toast (`Loading ${file.name}...`);
            await logger.loadZipFile(file);
        } else {
            toast ("Problem: Please choose a file", "DANGER")
        }
    }

    // Save the settings in local browser storage
    function saveSettings(e) {
        settings = {
            ver: 1,
            useCustomSbutton: $("#useCustomSbutton").val() === "true", // convert to boolean
            customBtnLetter: $("#customBtnLetter").val(),
            customBtnLabel: $("#customBtnLabel").val(),
            customTemplate: $("#customTemplate").val()
        }
        if (!settings.useCustomSbutton) {settings = {}}; // reset
        settingsSave(settings);
        // refresh the grid
        gridOps.refresh(settings);
    }

    // set settings modal to the current settings
    function currentSettings() {
        if (!settings.ver) {
            $("#useCustomSbutton").val("false");
        } else {
            $("#useCustomSbutton").val(settings.useCustomSbutton ? "true" : "false");
            $("#customBtnLetter").val(settings.customBtnLetter);
            $("#customBtnLabel").val(settings.customBtnLabel);
            $("#customTemplate").val(settings.customTemplate);
        }
    }

    // FAQ display
    function faqDisplay() {
        const converter = new showdown.Converter();
        const text = ""; 
        const html = converter.makeHtml(mdtext);

    }

    function startup() {
        //modal autofocus. See https://getbootstrap.com/docs/5.3/components/modal/#how-it-works
        const myModal1 = document.getElementById('modalLoadZip')
        const myInput1 = document.getElementById('loadZipFile')
        myModal1.addEventListener('shown.bs.modal', () => {
            myInput1.focus()
        })
        $("#modalLoadZip .btn-primary").on("click", loadZipFile.bind(this));
        $("#modalSettings .btn-primary").on("click", saveSettings.bind(this));

        
        // Proactively open the LoadZipFile modal upon startup
        // The user can also open via the top nav item
        loadZipFileModal = new bootstrap.Modal("#modalLoadZip");
        loadZipFileModal.show();
        currentSettings();
    }

    const logger = new Logger();
    const gridOps = new GridOps(logger, settings);
    startup();
});
