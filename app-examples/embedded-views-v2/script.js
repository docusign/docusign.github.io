// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
//
// Test embedded views v2  

/**
 * 
{
    "returnUrl": , // url required
    "viewAccess": , // "envelope" or "template" required  
                    // (use "template" for embedded template edit)
    "settings": {
        "startingScreen":  //"Prepare" or "Tagger"
        "sendButtonAction": // "send", "redirect",
        "showBackButton":  // "true", "false"
        "backButtonAction": // "previousPage", "redirect"
        "showHeaderActions": // "true", "false",
        "showDiscardAction": // "true", "false",
        "showAdvancedOptions": // "true", "false", // FUTURE
        "lockToken": // token_value,
        "recipientSettings": {              /// NOT recipients
            "showEditRecipients": // "true", "false",
            "showEditMessage": // "true", "false", // FUTURE
            "showBulkSend": // "true", "false",    // FUTURE
            "showContactsList": // "true", "false"
        },
        "documentSettings": {  /// not documents
            "showEditDocuments": // "true", "false",
            "showEditDocumentVisibility": // "true", "false",
            "showEditPages": // "true", "false",
            "showSaveAsDocumentCustomField": // "true", "false" // FUTURE
        },
        "taggerSettings": {  /// not tagging
            "paletteSections":  // "default", "none", "custom"
            "paletteDefault": // "custom", "merge", "notary", "seals",
                              // "smartContracts", "annotations", "smartSections"
            "paletteSettings": { // only when paletteSections is “custom”  // FUTURE
                "custom": {"show": } // "true", "false",
                "merge": {"show": }// "true", "false",
                "notary": {"show": }// "true", "false",
                "seals": {"show": }// "true", "false",
                "smartContracts": {"show": }// "true", "false",
                "annotations": {"show": }// "true", "false",
                "smartSections": {"show": }// "true", "false",
            }
        },
        "envelopeCustomFieldSettings": {    
            "showEnvelopeCustomFields": // "true", "false" // FUTURE
        },
        "templateSettings": {  // not for templates edit request
            "showMatchingTemplatesPrompt": // "true", "false"
        }   
    }
}
 * 
 * 
 */


import {
    CallApi,
    ImplicitGrant,
    UserInfo
} from "../library/callapi.js" 
//} from "https://docusign.github.io/app-examples/library/callapi.js" 
 
import {
    msg,
    htmlMsg,
    adjustRows,
    errMsg,
    workingUpdate,
    usingHttps,
    getStoredAccountId,
    setStoredAccountId,
    toast,
    //switchAccountsModal
} from "../library/utilities.js" 
//} from "https://docusign.github.io/app-examples/library/utilities.js" 

import { CheckTemplates 
} from "../library/checkTemplates.js";
//} from "https://docusign.github.io/app-examples/library/checkTemplates.js";

$(function () {
    const USE_CURL_QP = "curl"; // if QP curl=1 then use curl, not CORS
    const SHOW_INTERNAL_AUTH_QP = "internal"; // If this QP is present then show internal login options
    const OPEN_EMBEDDED_VIEW_QP = "openview"; // If set to 0, then don't open the embedded view
    const DEBUG_QP = "debug"; // if set to 1, same as openEmbeddedView set to 0
    const CLIENT_ID_QP = "clientid"; // if set, use this client ID
    const OAUTH_PROVIDER_QP = "oauthserver";  // if set, use this OAuth Service Provider
    const SHOW_IN_IFRAME = true;
    const TEMPLATE_EDIT_ACTION = "Template Edit";
    let action = "Envelope Send";
    let useCurl = false;
    let blankET = false // start with a blank envelope/template
    let clientId = "demo";
    let clientIDqp = false;
    let oauthServiceProvider = false;
    let showInternalLogin = false;
    let openEmbeddedView = true;
    // Viewing settings 
    const dsReturnUrlDefault = "https://docusign.github.io/jsfiddleDsResponse.html";
    //const iframeitUrl = "https://docusign.github.io/app-examples/embedded-views-v2-bc/iframeit.html";
    const iframeitUrl = "iframeit.html"; // same dir as this app
    let dsReturnUrl = dsReturnUrlDefault;
    let envelopeId = null;
    let comment = ""; // The user's comment about this config
    let showFormImages = false; // Show WYSIWYG form images
    /**
     *   qpSender 
     *   Holds the in-memory version of the parameters
     *   Initialized here to defaults (but will be overridden if this page
     *   is provided with defaults via the URL)
     * 
     *   The setter/getter for qpSender also uses qpCheckbox to determine
     *   if special checkbox handling is needed.
     */
    let qpSender = {
          startingScreen: "prepare" // or tagging
        , sendButtonAction: "send" // "redirect"
        , showBackButton: "true" // "false"
        , backButtonAction: "previousPage" // "redirect"
        , showHeaderActions: "true" // "false"
        , showDiscardAction: "true" // "false"
        , showAdvancedOptions: "true"
        , showEditRecipients: "true" // "false"
        , showEditMessage: "true"
        , showBulkSend: "true"
        , showContactsList: "true"
        , showEditDocuments: "true" // "false"
        , showEditDocumentVisibility: "true" // "false"
        , showEditPages: "true" // "false"
        , showSaveAsDocumentCustomField: "true" // "false"
        , showMatchingTemplatesPrompt: "true" // "false" 
        , paletteSections: "default"
        , paletteDefault: "custom"
        , psSettingsCustomShow: "true"
        , psSettingsMergeShow: "true"
        , psSettingsNotaryShow: "true"
        , psSettingsSealsShow: "true"
        , psSettingsSmartContractsShow: "true"
        , psSettingsAnnotationsShow: "true"
        , psSettingsSmartSectionsShow: "true"
        , showEnvelopeCustomFields: "true"
    };
    const qpCheckbox = { // which attributes are boolean / shown as checkboxes in the UX
          showBackButton: true
        , showHeaderActions: true
        , showDiscardAction: true
        , showAdvancedOptions: true
        , showEditRecipients: true
        , showEditMessage: true
        , showBulkSend: true
        , showContactsList: true
        , showEditDocuments: true
        , showEditDocumentVisibility: true
        , showEditPages: true
        , showSaveAsDocumentCustomField: true
        , showMatchingTemplatesPrompt: true 
        , psSettingsCustomShow: true
        , psSettingsMergeShow: true
        , psSettingsNotaryShow: true
        , psSettingsSealsShow: true
        , psSettingsSmartContractsShow: true
        , psSettingsAnnotationsShow: true
        , psSettingsSmartSectionsShow: true
        , showEnvelopeCustomFields: true
    }
    
    /**
     * Only the following attributes are implemented for the v2 
     * Embedded Views release. The HTML has been marked with
     * "Future" next to the other settings.
     * "startingScreen",
     * "sendButtonAction",
     * "showBackButton", 
     * "backButtonAction",
     * "showHeaderActions",
     * "showDiscardAction",
     * "lockToken",
     * {
     *  // recipientSettings
     *  "showEditRecipients",
     *  "showContactList"
     * },
     * {
     *  // documentSettings
     *  "showEditDocuments",
     *  "showEditDocumentVisibility",
     *  "showEditPages"
     * },
     * {
     *  // templateSettings
     *  "showMatchingTemplatesPrompt"
     * },
     * {
     *  // taggerSettings
     *  "paletteSections",
     *  "paletteDefault",
     * }
     */

    /**
     *   FUTURE items
        "showAdvancedOptions"
        "recipientSettings": {  
            "showEditMessage":
            "showBulkSend"
        },
        "documentSettings": { 
            "showSaveAsDocumentCustomField"
        }
        "taggerSettings": {  
            "paletteSettings": { // only when paletteSections is “custom”
                "custom": {"show": },
                "merge": {"show": },
                "notary": {"show": },
                "seals": {"show": },
                "smartContracts": {"show": },
                "annotations": {"show": },
                "smartSections": {"show": },
            }
        },
        "envelopeCustomFieldSettings": {    
            "showEnvelopeCustomFields":
        }
     */

    // Set basic variables
    const logLevel = 0; // 0 is terse; 9 is verbose
    let embeddedViewWindow = null;
    let accountName, accountId, accountExternalId, 
        accountBaseUrl, accountIsDefault, corsError; // current account info

    // Example settings
    let templates = [
        {
            url:  "https://docusign.github.io/examples/templates/Anchor_text_with_checkboxes_v2",
            name: "DevCenter example: Anchor text with checkboxes v2",
            description:
                "This DevCenter example template includes one PDF file with anchor text. Checkboxes are grouped to require that exactly one of the boxes is included. The template includes text fields and envelope metadata.",
            templateId: null
        }
    ];

    debugger; // used with debugger open to find the right JS file.

    /*
     * The doit2 function is the example that is triggered by the
     * button. The user is already logged in (we have an access token).
     */
    let doit2 = async function doit2f(event) {
        $("#doit").addClass("hide");
        if (!checkToken()) {
            // Check that we have a valid token
            return;
        }
        workingUpdate(true);
        updateQp();
        const needsEnv = {
            "Recipient Preview": true, "Recipient Manual Review": true}
        if (needsEnv[action] && !envelope) {
            toast("Problem: create an envelope")
        } else {
            if (action === "Envelope Send") {
                await embeddedSend()
            } else if (action === "Envelope Correct") {
                await embeddedCorrect()
            } else if (action === "Envelope Recipient Preview") {
                // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/enveloperecipients/createenveloperecipientpreview/
                await embeddedRecipientPreview() 
            } else if (action === "Envelope Recipient Manual Review") {
                // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/enveloperecipients/createrecipientmanualreviewview/
                await embeddedRecipientManualReview()
            } else if (action === "Template Edit") {
                await embeddedTemplateEdit()
            } else if (action === "Template Recipient Preview") {
                await embeddedTemplateRecipientPreview()
            }
        }
        $("#doit").removeClass("hide");
        workingUpdate(false);
    };
    doit2 = doit2.bind(this);

    /*
     * The doit3 function copies the config to the clipboard as a URL.
     */
    let doit3 = async function doit3f(event) {
        updateQp();
        let url = window.location.origin + window.location.pathname + "#";
        url += `action=${encodeURIComponent(action).replace(/\%20/g, '+')}&`;
        if (showInternalLogin) {
            url += `${SHOW_INTERNAL_AUTH_QP}=1&`
        }
        if (clientIDqp) {
            url += `${CLIENT_ID_QP}=${clientIDqp}&`
        }
        if (oauthServiceProvider) {
            url += `${OAUTH_PROVIDER_QP}=${encodeURIComponent(oauthServiceProvider)}&`
        }
        if (!openEmbeddedView) {
            url += `${OPEN_EMBEDDED_VIEW_QP}=0&${DEBUG_QP}=1&`
        }
        if (useCurl) {
            url += `${USE_CURL_QP}=1&`
        }
        url += `comment=${encodeURIComponent(comment).replace(/\%20/g, '+')}&`;

        if (action !== TEMPLATE_EDIT_ACTION) {
            for (const property in qpSender) {
                url += `${property}=${encodeURIComponent(qpSender[property]).replace(/\%20/g, '+')}&`;
            }
            url += `showFormImages=${encodeURIComponent(showFormImages).replace(/\%20/g, '+')}&`;
        }
        url += `blankET=${encodeURIComponent(blankET)}`;
        await navigator.clipboard.writeText(url);
        Toastify({ // https://github.com/apvarun/toastify-js/blob/master/README.md
            text: "Copied to the Clipboard!",
            duration: 5000,
            close: true,
            gravity: "top", // `top` or `bottom`
            position: "center", // `left`, `center` or `right`
            stopOnFocus: true, // Prevents dismissing of toast on hover
            style: {
              background: "linear-gradient(to right, #00b09b, #96c93d)",
            },
          }).showToast();
    };
    doit2 = doit2.bind(this);

    /**
     * Update the in-memory QP obj from the form 
     */
    function updateQp() {
        dsReturnUrl = dsReturnUrlDefault;
        action = $(`#action`).val();
        comment = $("#comment").val();
        showFormImages = $(`#showFormImages`).prop('checked');
        blankET = $(`#blankET`).prop('checked');
        for (const property in qpSender) {
            qpSender[property] = qpCheckbox[property] ? $(`#${property}`).prop('checked') : $(`#${property}`).val();
        }
    }

    /**
     * Update the form from the URL's query parameters
     */
    function setQp() {
        if (!window.location.hash) {return}
        const hash = window.location.hash.substring(1);
        let query = {};
        const pairs = hash.split('&');
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i].split('=');
            if (pair.length !== 2) {continue}
            query[decodeURIComponent(pair[0])] = 
                decodeURIComponent(pair[1].replace(/\+/g, '%20') || '');
        }
        if ("action" in query) {
            $(`#action`).val(query["action"]);
        }
        if (CLIENT_ID_QP in query) {
            clientIDqp = query[CLIENT_ID_QP];
        }
        if (OAUTH_PROVIDER_QP in query) {
            oauthServiceProvider = query[OAUTH_PROVIDER_QP];
        }
        if (USE_CURL_QP in query) {
            useCurl = query[USE_CURL_QP] === "1";
        }
        if ("comment" in query) {
            $("#comment").val(query["comment"]);
        }
        if ("showFormImages" in query) {
            $("#showFormImages").prop('checked', query["showFormImages"]==="true");
        }
        if ("blankET" in query) {
            $(`#blankET`).prop('checked', query.blankET === "true");
        }
        showFormImagesChange();
        if (SHOW_INTERNAL_AUTH_QP in query) {
            showInternalLogin = query[SHOW_INTERNAL_AUTH_QP] === "1";
            if (showInternalLogin) {
                $("#internalLogin").removeClass("hide");
                if (!clientIDqp) {
                    // Shown internal login to Stage
                    $("#internalLogin").text("Stage Login");
                }
            }
        }
        openEmbeddedView = 
            !(OPEN_EMBEDDED_VIEW_QP in query && query[OPEN_EMBEDDED_VIEW_QP] === "0")
        if (DEBUG_QP in query && query[DEBUG_QP] === "1") {
            openEmbeddedView = false
        }
        for (const property in query) {
            if (property in qpSender) {
                if (qpCheckbox[property]) {
                    $(`#${property}`).prop('checked', query[property]==="true");
                } else {
                    $(`#${property}`).val(query[property]);
                }
            }
        }
    }

    /**
     * Create an embeddedSenderView:
     * 1. Create envelope
     * 2. Call embeddedSenderView and open a browser window with the result
     */
    async function embeddedSend() {
        const signer = {
            name: data.userInfo.name,
            email: data.userInfo.email,
            clientUserId: 1000,
            draft: true
        };
        if (useCurl) {
            envelopeId = "000-ENVELOPE-ID-000"
        } else {
            envelopeId = await createEnvelope(signer);
        }
        if (envelopeId) {
            msg(`Envelope ${envelopeId} created.`);
            await embeddedSenderView({
                envelopeId: envelopeId,
                signer: signer
            });
        }
    }

    async function embeddedCorrect() {
        const signer = {
            name: data.userInfo.name,
            email: data.userInfo.email,
            draft: false
        };
        if (useCurl) {
            envelopeId = "000-ENVELOPE-ID-000"
        } else {
            envelopeId = await createEnvelope(signer);
        }
        if (envelopeId) {
            msg(`Envelope ${envelopeId} created.`);
            await embeddedCorrectView({
                envelopeId: envelopeId,
                signer: signer
            });
        }
    }

    /*
     *  Create an envelope, either a blank or from a template
     *  on the Docusign platform
     */
    async function createEnvelope({ name, email, clientUserId, draft }) {
        const req = blankET ? {
            status: draft ? "created" : "sent"
        } : {
            status: draft ? "created" : "sent",
            compositeTemplates: [
                {
                    compositeTemplateId: "1",
                    serverTemplates: [
                        {
                            sequence: "1",
                            templateId: templates[0].templateId
                        }
                    ],
                    inlineTemplates: [
                        {
                            sequence: "1",
                            recipients: {
                                signers: [
                                    {
                                        email: email,
                                        name: name,
                                        // clientUserId: clientUserId,
                                        roleName: "Signer1",
                                        recipientId: "1",
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        };

        // Make the create envelope API call
        msg(`Creating envelope...`);
        const apiMethod = `/accounts/${accountId}/envelopes`;
        const httpMethod = "POST";
        const results = await data.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: httpMethod,
            req: req
        });
        if (results === false) {
            return false;
        }
        if (logLevel > 0) {
            htmlMsg(
                `<p>Envelope created. Response:</p><p><pre><code>${JSON.stringify(
                    results,
                    null,
                    4
                )}</code></pre></p>`
            );
        }
        return results.envelopeId;
    }

    /*
     * Create an embedded sender view, open a new tab with it
     */
    async function embeddedSenderView({ envelopeId, signer }) {
        const req = makeEmbeddedViewRequest("envelope");
        const apiMethod = `/accounts/${accountId}/envelopes/${envelopeId}/views/sender`;

        if (useCurl) {
            let curl = `curl \\\n`;
            curl += `-H "Content-Type: application/json" \\\n`;
            curl += `-H "Authorization: Bearer ${data.implicitGrant.accessToken}  " \\\n`;
            curl += `--data '${JSON.stringify(req, null, 4)}' \\\n`
            curl += `--request POST \\\n`;
            curl += `${accountBaseUrl}${apiMethod}`
            window.focus();
            await navigator.clipboard.writeText(curl);
            Toastify({ // https://github.com/apvarun/toastify-js/blob/master/README.md
                text: "Curl command is on clipboard: replace the envelope ID!",
                duration: 5000,
                close: true,
                gravity: "top", // `top` or `bottom`
                position: "center", // `left`, `center` or `right`
                stopOnFocus: true, // Prevents dismissing of toast on hover
                style: {
                  background: "linear-gradient(to right, #00b09b, #96c93d)",
                },
              }).showToast();
            return
        }

        // Make the API call
        const httpMethod = "POST";
        const results = await data.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: httpMethod,
            req: req
        });
        if (results === false) {
            return false;
        }
        if (logLevel > 5) {
            htmlMsg(
                `<p>Embedded Sending view created. Response:</p><p><pre><code>${JSON.stringify(
                    results,
                    null,
                    4
                )}</code></pre></p>`
            );
        }
        const resultsUrl = results.url
        msg(`Sender view URL: ${resultsUrl}`);
        if (openEmbeddedView) {
            if (SHOW_IN_IFRAME) {
                embeddedViewWindow = window.open(
                    `${iframeitUrl}?label=Embedded+Sender+View&url=${encodeURIComponent(resultsUrl)}`, "_blank");
            } else {
                embeddedViewWindow = window.open(resultsUrl, "_blank")
            }
            if(!embeddedViewWindow || embeddedViewWindow.closed || 
            typeof embeddedViewWindow.closed=='undefined') {
                // popup blocked
                alert ("Please enable the popup window");
            }
            embeddedViewWindow.focus();
        } else {
            htmlMsg ("<h3>Debugging mode</h3><p>1. Open a new tab (incognito window best) and an inspector window<br />2. Load one of these URLs:</p>");
            htmlMsg (`<p><a href="${resultsUrl}">Embedded Sender View</a></p>
            <p><a href="${iframeitUrl}?label=Embedded+Sender+View&url=${encodeURIComponent(resultsUrl)}">Embedded Sender View in an iFrame</a></p>`);
        }
        return true;
    }

    /*
     * Create an embedded correct view, open a new tab with it
     */
    async function embeddedCorrectView({ envelopeId, signer }) {
        const req = makeEmbeddedViewRequest("envelope");
        const apiMethod = `/accounts/${accountId}/envelopes/${envelopeId}/views/correct`;

        // Make the API call
        const httpMethod = "POST";
        const results = await data.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: httpMethod,
            req: req
        });
        if (results === false) {
            return false;
        }
        const resultsUrl = results.url
        msg(`Correct view URL: ${resultsUrl}`);
        if (openEmbeddedView) {
            if (SHOW_IN_IFRAME) {
                embeddedViewWindow = window.open(
                    `${iframeitUrl}?label=Embedded+Correct+View&url=${encodeURIComponent(resultsUrl)}`, "_blank");
            } else {
                embeddedViewWindow = window.open(resultsUrl, "_blank")
            }
            if(!embeddedViewWindow || embeddedViewWindow.closed || 
            typeof embeddedViewWindow.closed=='undefined') {
                // popup blocked
                alert ("Please enable the popup window");
            }
            embeddedViewWindow.focus();
        } else {
            htmlMsg ("<h3>Debugging mode</h3><p>1. Open a new tab (incognito window best) and an inspector window<br />2. Load one of these URLs:</p>");
            htmlMsg (`<p><a href="${resultsUrl}">Embedded Correct View</a></p>
            <p><a href="${iframeitUrl}?label=Embedded+Correct+View&url=${encodeURIComponent(resultsUrl)}">Embedded Correct View in an iFrame</a></p>`);
        }
        return true;
    }

    /**
     * 
     * @param {string} style -- "envelope" or "template" 
     */
    function makeEmbeddedViewRequest (style) {
        function b (v) {
            // Use "true" and "false" instead of true and false
            return v ? "true" : "false"
        }
        let request = {
            "returnUrl": dsReturnUrl, // required
            "viewAccess": style, // required  // (use "template" for embedded template edit)
            "settings": {
                "startingScreen": qpSender.startingScreen, //"prepare" // or tagging
                "sendButtonAction": qpSender.sendButtonAction,
                "showBackButton": b(qpSender.showBackButton),
                "backButtonAction": qpSender.backButtonAction, // or redirect
                "showHeaderActions": b(qpSender.showHeaderActions),
                "showDiscardAction": b(qpSender.showDiscardAction),
                "showAdvancedOptions": b(qpSender.showAdvancedOptions),
                // "lockToken": token_value,
                "recipientSettings": {              /// NOT recipients
                    "showEditRecipients": b(qpSender.showEditRecipients),
                    "showEditMessage": b(qpSender.showEditMessage),
                    "showBulkSend": b(qpSender.showBulkSend),
                    "showContactsList": b(qpSender.showContactsList)
                },
                "documentSettings": {  /// not documents
                    "showEditDocuments": b(qpSender.showEditDocuments),
                    "showEditDocumentVisibility": b(qpSender.showEditDocumentVisibility),
                    "showEditPages": b(qpSender.showEditPages),
                    "showSaveAsDocumentCustomField": b(qpSender.showSaveAsDocumentCustomField)
                },
                "taggerSettings": {  /// not tagging
                    "paletteSections": qpSender.paletteSections, // or custom, none
                    "paletteDefault": qpSender.paletteDefault, // or custom, none
                    "paletteSettings": { // only when “showPalette” is “custom”
                        "custom": {"show": b(qpSender.psSettingsCustomShow)},
                        "merge": {"show": b(qpSender.psSettingsMergeShow)},
                        "notary": {"show": b(qpSender.psSettingsNotaryShow)},
                        "seals": {"show": b(qpSender.psSettingsSealsShow)},
                        "smartContracts": {"show": b(qpSender.psSettingsSmartContractsShow)},
                        "annotations": {"show": b(qpSender.psSettingsAnnotationsShow)},
                        "smartSections": {"show": b(qpSender.psSettingsSmartSectionsShow)},
                    }
                },
                "envelopeCustomFieldSettings ": { /// NOT envelopeCustomFields
                    "showEnvelopeCustomFields": b(qpSender.showEnvelopeCustomFields)
                }
            }
        }
        if (style === "envelope") {
            request.settings.templateSettings = {  // not for templates edit request
                "showMatchingTemplatesPrompt": b(qpSender.showMatchingTemplatesPrompt)
            }
        }

        htmlMsg(`<h4>Embedded View request object</h4>
            <pre><code>${JSON.stringify(request, null, 4)}</code></pre></p>`);
        return request
    }
    
    /*
     * Create an embedded template edit view, open a new tab with it
     */
    async function embeddedTemplateEdit() {
        let templateId, apiMethod, httpMethod, results, req;
        if (useCurl) {
            templateId = "000-TEMPLATE-ID-000";
            apiMethod = `/accounts/${accountId}/templates/${templateId}/views/edit`;
            req = makeEmbeddedViewRequest ("template");
            let curl = `curl \\\n`;
            curl += `-H "Content-Type: application/json" \\\n`;
            curl += `-H "Authorization: Bearer ${data.implicitGrant.accessToken}  " \\\n`;
            curl += `--data '${JSON.stringify(req, null, 4)}' \\\n`
            curl += `--request POST \\\n`;
            curl += `${accountBaseUrl}${apiMethod}`
            window.focus();
            await navigator.clipboard.writeText(curl);
            Toastify({ // https://github.com/apvarun/toastify-js/blob/master/README.md
                text: "Curl command is on clipboard: replace the envelope ID!",
                duration: 5000,
                close: true,
                gravity: "top", // `top` or `bottom`
                position: "center", // `left`, `center` or `right`
                stopOnFocus: true, // Prevents dismissing of toast on hover
                style: {
                  background: "linear-gradient(to right, #00b09b, #96c93d)",
                },
              }).showToast();
            return
        }

        if (blankET) {
            // create a blank template
            apiMethod = `/accounts/${accountId}/templates`;
            httpMethod = "POST";
            req = {description: "Created by Embedded Views example app"}
            results = await data.callApi.callApiJson({
                apiMethod: apiMethod,
                httpMethod: httpMethod,
                req: req
            });
            if (results === false) {
                return false; // error!
            }
            templateId = results.templateId;
        } else {
            // use the existing template
            templateId = templates[0].templateId;
        }

        // Make the API call for the embedded view
        req = makeEmbeddedViewRequest ("template");
        apiMethod = `/accounts/${accountId}/templates/${templateId}/views/edit`;
        httpMethod = "POST";
        results = await data.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: httpMethod,
            req: req
        });
        if (results === false) {
            return false;
        }
        if (logLevel > 5) {
            htmlMsg(
                `<p>Embedded Template Edit view created. Response:</p><p><pre><code>${JSON.stringify(
                    results,
                    null,
                    4
                )}</code></pre></p>`
            );
        }
        const resultsUrl = results.url
        msg(`Embedded Template Edit View URL: ${resultsUrl}`);
        if (openEmbeddedView) {
            if (SHOW_IN_IFRAME) {
                embeddedViewWindow = window.open(
                    `${iframeitUrl}?label=Embedded+Template+Edit+View&url=${encodeURIComponent(resultsUrl)}`, "_blank");
            } else {
                embeddedViewWindow = window.open(resultsUrl, "_blank")
            }
            if(!embeddedViewWindow || embeddedViewWindow.closed || 
            typeof embeddedViewWindow.closed=='undefined') {
                // popup blocked
                alert ("Please enable the popup window");
            }
            embeddedViewWindow.focus();
        } else {
            htmlMsg ("<h3>Open the URL in an incognito window</h3>")
        }
        return true;
    }

    /*
     * embeddedViewEnded
     * After the embedded view ends (in its own tab),
     * the browser tab is redirected to the returnUrl, defined
     * in constant dsReturnUrl, above.
     * Source:
     * https://github.com/docusign/docusign.github.io/blob/master/jsfiddleDsResponse.html
     *
     * That page runs Javascript to send a message via window.postMessage.
     * The message is tagged with source `dsResponse`.
     * The function messageListener (in mainline section) receives and
     * dispatches the different types of incoming messages.
     * When a dsResponse message is received, this function is called.
     */
    function embeddedViewEnded(data) {
        if (data.source !== "dsResponse") {
            return; // Sanity check
        }
        embeddedViewWindow.close(); // close the browser tab
        const href = data.href; // "http://localhost:3000/?event=signing_complete"
        const sections = href.split("?");
        const hasEvents = sections.length === 2;
        const qps = hasEvents ? sections[1].split("&") : [];
        if (!hasEvents) {
            errMsg(`Unexpected embedded view response: ${data.href}.`);
            return;
        }
        let msg = `<p><b>Embedded view Response</b><br/>`;
        msg += `<small>Information Security tip: do not make business decisions based on this data since they can be spoofed. Instead, use the API.</small>`;

        qps.forEach((i) => {
            const parts = i.split("=");
            msg += `<br/>Query parameter <b>${parts[0]} = "${parts[1]}"</b>`;
        });
        msg += "</p>";
        htmlMsg(msg);
    }

    /**
     * 
     */
    function actionChange(e) {
        updateQp();
        if (action === TEMPLATE_EDIT_ACTION) {
            $(".formItems").addClass("hide")
        } else {
            $(".formItems").removeClass("hide")
        }
    }
    
    /**
     * showFormImagesChange
     */
    function showFormImagesChange(e) {
        showFormImages = $("#showFormImages").prop('checked');

        if (showFormImages) {
            doShowFormImages ()
        } else {
            doNotShowFormImages ()
        }
    }

    const senderUxXY = {
          sendButtonAction: {top: 1640, left: 800}
        , showBackButton: {top: 2530, left: 830}
        , backButtonAction: {top: 2530, left: 830}
        , showHeaderActions: {top: -100, left: 840}
        , showDiscardAction: {top: -70, left: 840}
        , showEditRecipients: {top: 280, left: 500}
        , showContactsList: {top: 400, left: 350}
        , showEditDocuments: {top: -220, left: 230}
        , showEditDocumentVisibility: {top: 1760, left: 830}
        , showEditPages: {top: 1760, left: 830}
        , paletteSections: {top: 1275, left: 250}
        , paletteDefault: {top: 1275, left: 203}
    }
    const senderUxHide = {  // Hide future settings
          showAdvancedOptions: true
        , showMatchingTemplatesPrompt: true 
        , showEditMessage: true
        , showBulkSend: true
        , showSaveAsDocumentCustomField: true
        , psSettingsCustomShow: true
        , psSettingsMergeShow: true
        , psSettingsNotaryShow: true
        , psSettingsSealsShow: true
        , psSettingsSmartContractsShow: true
        , psSettingsAnnotationsShow: true
        , psSettingsSmartSectionsShow: true
        , showEnvelopeCustomFields: true
    }

    function doShowFormImages () {
        $("#uxForm").addClass("formBackgroundSender");
        $("#uxForm div").addClass("formBackground");
        for (const property in senderUxXY) {
            $(`#${property}`).parent()
                .css({"top":`${senderUxXY[property].top}px`, "left":`${senderUxXY[property].left}px`})
        }
        for (const property in senderUxHide) {
            $(`#${property}`).parent().addClass("hide")
        }
        $("#uxForm div select").css({"width":"fit-content"});
    }
    function doNotShowFormImages () {
        $("#uxForm").removeClass("formBackgroundSender");
        $("#uxForm div").removeClass("formBackground");
        for (const property in senderUxXY) {
            $(`#${property}`).parent().css({"top":``, "left":``})
        }
        for (const property in senderUxHide) {
            $(`#${property}`).parent().removeClass("hide")
        }
        $("#uxForm div select").css({"width":""});
    }

    /////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////

    /* Checks that the access token is still good.
     * Prompts for login if not
     */
    function checkToken() {
        if (data.implicitGrant.checkToken()) {
            // ok
            return true;
        } else {
            // not ok
            $("#login").removeClass("hide");
            $("#doit").addClass("hide");
            // reset everything
            msg("Please login");
        }
    }

    /*
     * Receives and dispatches incoming messages
     */
    let messageListener = async function messageListenerf(event) {
        if (!event.data) {
            return;
        }
        const source = event.data.source;
        if (source === "dsResponse") {
            embeddedViewEnded(event.data);
            return;
        }
        if (source === "oauthResponse" && data.implicitGrant) {
            await implicitGrantMsg(event.data);
            return;
        }
    };
    messageListener = messageListener.bind(this);

    /*
     * Process incoming implicit grant response
     */
    async function implicitGrantMsg(eventData) {
        const oAuthResponse = data.implicitGrant.handleMessage(eventData);
        if (oAuthResponse === "ok") {
            await completeLogin()
        } else if (oAuthResponse === "error") {
            $("#login").removeClass("hide");
            const errHtml = `<p class="text-danger">${data.implicitGrant.errMsg}</p>`;
            htmlMsg(errHtml);
        }
    }
    
    /*
     * Complete login process including
     * Get user information
     * Set up CallApi object
     * Get templates set
     * update the user
     */
    async function completeLogin() {
        data.userInfo = new UserInfo({
            accessToken: data.implicitGrant.accessToken,
            workingUpdateF: workingUpdate
        });
        let ok = await data.userInfo.getUserInfo();
        corsAccountReport();
        ok = ok || useCurl;
        ok = ok && await setAccountId(getStoredAccountId());
        if (!ok) {
            // Did not complete the login or templates issue
            $("#login").removeClass("hide");
            if (data.userInfo.errMsg) {
                const errHtml = `<p class="text-danger">${data.userInfo.errMsg}</p>`;
                htmlMsg(errHtml);
            }
        }
        return ok
    }

    /*
     *  corsAccountReport -- report on the user's accounts/cors status
     */
    function corsAccountReport(){
        let corsErr = data.userInfo.accounts.find(a => a.corsError);
        corsErr = !!corsErr;
        if (!corsErr) {return} // EARLY RETURN
        htmlMsg(`<h5>Your Accounts and CORS Access</h5>`);
        data.userInfo.accounts.forEach(account => {
            const aId = account.corsError ? `<b>CORS Error:</b> ${account.corsError}` : 
                `#${account.accountExternalId}`;
            htmlMsg(`<p class="mb-0">${account.accountName} (${account.accountId}) (${aId})</p>`)
        }) 
        if (corsErr) {
            errMsg(`One or more of your accounts has not enabled CORS for this application`);
            htmlMsg(`<p class="mb-0">To enable CORS, your account administer will use the 
            <b>CORS</b> page of the eSignature Settings web app. 
            <a href="https://developers.docusign.com/platform/single-page-applications-cors/enable-disable-cors/" target="_blank">Documentation.</a></p>
            <p class="mb-0"><small>Note: if this application is not yet in production, then the problem could also be caused by an app configuration issue:</small></p>
            <ul><small>
<li>The domain where the script is hosted is not one of the allowed origins for the app.</li>
<li>The request did not use one of the allowed HTTP methods for the app.</li>
<li>The cors scope was not specified during authentication.</li>
<li>The request did not include an OAuth access token.</li>
<li>The request is not using eSignature REST API v2.1.</li>
<li>The API endpoint path did not include /accounts/{account_id}.</li>
            </ul></small>`); 
        }
    }

    /* 
     * setAccountId(accountId)
     * If the accountId is null then use the account server's default.
     * Also:
     * 1. Check that the user has access to the account and cors is on
     *    for this app.
     * 2. Update the account-related settings
     * 3. Store the account as the user's default in the browser storage
     * 4. Update the callApi and checkTemplates objects
     *
     * RETURNS ok
     */
    async function setAccountId(accountIdArg) {
        // if the accountId is null then use the account server's default
        function useDefault() {
            const account = data.userInfo.accounts[data.userInfo.defaultAccountIndex];
            ({ accountName, accountId, accountExternalId, accountBaseUrl,
              accountIsDefault, corsError } = account);            
        }
        
        $("#doit").addClass("hide");
        let ok = true;
        
        // 1. Check that the user has access to the account.
        // 2. Update the account-related settings
        if (accountIdArg) {
            const account = data.userInfo.accounts.find(a => a.accountId === accountIdArg);
            if (account) {
                // user has access to the desired account
                ({ accountName, accountId, accountExternalId, accountBaseUrl,
                  accountIsDefault, corsError } = account);            
            } else {
                useDefault();
            }
        } else {
            // No accountId parameter -- use user's default
            useDefault();
        }
        
        // Display the current user and account info
        $("#lname").text(data.userInfo.name);
        $("#lemail").text(data.userInfo.email);
        let aid = `Account #${accountExternalId}`;
        if (accountIsDefault) {aid += ` (Default)`}
        $("#laccount").text(aid);
        $("#laccountname").text(accountName);
        if (data.userInfo.accounts.length > 1) {
            $("#saccount").removeClass("hide");
        }
        $("#loggedin").removeClass("hide");
        
        if (!useCurl && corsError) {
            errMsg(`Error: this account (${accountName}) has not enabled CORS for this application. Please switch accounts or login again.`);
            return false; // EARLY RETURN
        }
        
        // 3. Store the account as the user's default in the browser storage
        setStoredAccountId(accountId);
        
        // 4. Update the callApi and checkTemplates objects
        data.callApi = new CallApi({
            accessToken: data.implicitGrant.accessToken,
            apiBaseUrl: accountBaseUrl
        });
        data.checkTemplates = new CheckTemplates({
            callApi: data.callApi, 
            accountId: accountId
        });
        msg('Checking templates...');
        templates = await data.checkTemplates.check(templates);
        if (data.checkTemplates.msg) {
            msg(data.checkTemplates.msg)
        }
        if (data.checkTemplates.errMsg) {
            errMsg(data.checkTemplates.errMsg)
            ok = false;
        }
        if (ok || useCurl) {
            $("#doit").removeClass("hide");
        }
        msg('done.'); // done with templates
     
        return ok;
    }
    
    /*
     * Login or LoginStage button was clicked
     */
    let login = async function loginf(event) {
        $("#login").addClass("hide");
        clientId = "demo";
        data.implicitGrant = new ImplicitGrant({
            workingUpdateF: workingUpdate,
            clientId: clientId
        });
        await data.implicitGrant.login();
    };
    login = login.bind(this);

    let loginInternal = async function loginInternalf(event) {
        event.preventDefault;
        const target = event.target;

        $("#login").addClass("hide");
        if (clientIDqp) { // if client ID was set via QP, use it
            clientId = clientIDqp;
        } else {
            clientId = "stage"
        }
        data.implicitGrant = new ImplicitGrant({
            workingUpdateF: workingUpdate,
            clientId: clientId,
            oauthServiceProvider: oauthServiceProvider
        });
        await data.implicitGrant.login();
    };
    loginInternal = loginInternal.bind(this);
    
    /*
     * Switch Accounts was clicked
     * Displays the modal and processes clicks using the supplied
     * callback function
     */
    let switchAccountsButton = function(event) {
        const accounts = data.userInfo.accounts;

        // Only use accounts that include CORS access
        const accountsList = accounts.filter (
            a => a.accountExternalId && a.accountId !== accountId);
        const modalEl = $("#switchAccountModal");
        const bodyEl = modalEl.find(".modal-body");
        bodyEl.empty();
        accountsList.forEach((a, i) => {
            bodyEl.append(`
            <div class="accountRow ${i < (accountsList.length - 1) ? "": "accountRowLast"}"
            data-accountId="${a.accountId}">
            <p>
              ${a.accountName} - ${a.accountExternalId} 
              ${a.accountIsDefault ? "(Default)":""}
            </p>
            </div>`)
        });
    }
    switchAccountsButton = switchAccountsButton.bind(this);
    
    /**
     *
     */
    let accountClicked = async function accountClickedFunc(event) {
        let target = event.target;
        if (target.nodeName === 'P') {
            target = $(target).parent()[0];
        }
        const newAccountId = $(target).attr("data-accountId");
        $("#switchAccountModal").modal('hide');
        await setAccountId(newAccountId);
    }
    accountClicked = accountClicked.bind(this);

    // Mainline
    let data = {
        implicitGrant: null,
        userInfo: null,
        callApi: null,
        checkTemplates: null,
    };

    // The mainline
    if (usingHttps()) {
        adjustRows();
        window.addEventListener("message", messageListener);
        $("#btnOauth").click(login);
        $("#internalLogin").click(loginInternal);
        $("#btnDoit2").click(doit2);
        $("#btnDoit3").click(doit3);
        $("#saccount a").click(switchAccountsButton);
        $("#switchAccountModal .modal-body").click(accountClicked);
        $('#showFormImages').change(showFormImagesChange);
        $('#action').change(actionChange);

        setQp();
        showFormImagesChange();
    }    
});
