// Copyright © 2022 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

import {
    CallApi,
    UserInfo
} from "https://docusign.github.io/app-examples/library/callapi.js" 

import {
    AuthCodePkce
} from "../library/authCodePkce.js";
 
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
} from "https://docusign.github.io/app-examples/library/utilities.js" 
// View the source at https://codepen.io/docusign/pen/OJoLNvQ
import { CheckTemplates } from "https://docusign.github.io/app-examples/library/checkTemplates.js";

$(function () {
    let platform = "demo";
    // Viewing settings 
    const dsReturnUrlDefault = "https://docusign.github.io/jsfiddleDsResponse.html";
    //const iframeitUrl = "https://docusign.github.io/app-examples/embedded-views/iframeit.html";
    const iframeitUrl = "iframeit.html"; // same dir as the app
    let dsReturnUrl = dsReturnUrlDefault;
    let envelopeId = null;
    let comment = ""; // The user's comment about this config
    let qpSender = { // defaults
          sendButtonAction: "send" // "redirect"
        , backButtonAction: "previousPage" // "redirect"
        , showBackButton: "true" // "false"
        , showEditRecipients: "true" // "false"
        , showEditDocuments: "true" // "false"
        , showEditDocumentVisibility: "true" // "false"
        , showEditPages: "true" // "false"
        , showMatchingTemplatesPrompt: "true" // "false" 
        , showHeaderActions: "true" // "false"
        , showDiscardAction: "true" // "false"
        , send: "1" // 0 - start in prepare, 1 - start in tagger
        , showTabPalette: "true" // "false"
        , tabPaletteType: "custom" //  standard, custom, merge, notary
    }            // seals, smartcontracts, annotations, smartSections
    
    const qpSenderOptions = {
        sendButtonAction: ["send", "redirect"]
      , backButtonAction: ["previousPage", "redirect"]
      , showBackButton: ["true", "false"]
      , showEditRecipients: ["true", "false"]
      , showEditDocuments: ["true", "false"]
      , showEditDocumentVisibility: ["true", "false"]
      , showEditPages: ["true", "false"]
      , showMatchingTemplatesPrompt: ["true", "false"] 
      , showHeaderActions: ["true", "false"]
      , showDiscardAction: ["true", "false"]
      , send: ["0", "1"] // 0 - start in prepare, 1 - start in tagger
      , showTabPalette: ["true", "false"]
      , tabPaletteType: ["standard", "custom", "merge", "notary",
            "seals", "smartcontracts", "annotations", "smartSections"]
  }

    // Set basic variables
    const logLevel = 0; // 0 is terse; 9 is verbose
    let embeddedViewWindow = null;
    let accountName, accountId, accountExternalId, 
        accountBaseUrl, accountIsDefault, corsError; // current account info

    // Example settings
    let templates = [
        {
            url:     "https://docusign.github.io/examples/templates/Anchor_text_with_checkboxes_v2",
            name: "DevCenter example: Anchor text with checkboxes v2",
            description:
                "This DevCenter example template includes one PDF file with anchor text. Checkboxes are grouped to require that exactly one of the boxes is included. The template includes text fields and envelope metadata.",
            templateId: null
        }
    ];

    debugger; // uncomment with debugger open to find the right JS file.

    /*
     * The doit2 function is the example that is triggered by the
     * button. The user is already logged in (we have an access token).
     */
    let doit2 = async function doit2f(event) {
        $("#doit").addClass("hide");
        const action = $(`#action`).val();
        if (!checkToken()) {
            // Check that we have a valid token
            return;
        }
        workingUpdate(true);
        updateQp();
        const needsEnv = {
            "Edit": true, "Correct": true, "Recipient Preview": true, "Recipient Manual Review": true}
        if (needsEnv[action] && !envelope) {
            toast("Problem: create an envelope")
        } else {
            if (action === "Envelope Send") {
                await embeddedSend()
            } else if (action === "Envelope Edit") {
                await embeddedEdit()
            } else if (action === "Envelope Correct") {
                await embeddedCorrect()
            } else if (action === "Envelope Recipient Preview") {
                // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/enveloperecipients/createenveloperecipientpreview/
                await embeddedRecipientPreview() 
            } else if (action === "Envelope Recipient Manual Review") {
                // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/enveloperecipients/createrecipientmanualreviewview/
                await embeddedRecipientManualReview()
            } else if (action === "Template Edit") {
                await embeddedTemplateEdit({
                    templateId: templates[0].templateId,
                })
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
        for (const property in qpSender) {
            url += `${property}=${encodeURIComponent(qpSender[property]).replace(/\%20/g, '+')}&`;
        }
        url += `dsReturnUrl=${dsReturnUrl === dsReturnUrlDefault ? "true&" : "false&"}`;
        url += `comment=${encodeURIComponent(comment).replace(/\%20/g, '+')}`;
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
     * Update the QP obj from the form 
     */
    function updateQp() {
        dsReturnUrl = $("#dsReturnUrl").val() === "true" ? dsReturnUrlDefault : "";
        comment = $("#comment").val();
        for (const property in qpSender) {
            qpSender[property] = $(`#${property}`).val();
        }
    }

    /**
     * Update the form from this page's QP
     */
    function setQp() {
        if (!window.location.hash) {return}
        const hash = window.location.hash.substring(1);
        let query = {};
        const pairs = hash.split('&');
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i].split('=');
            query[decodeURIComponent(pair[0])] = 
                decodeURIComponent(pair[1].replace(/\+/g, '%20') || '');
        }

        if ("dsReturnUrl" in query) {
            $("#dsReturnUrl").val(query["dsReturnUrl"]);
        }
        if ("comment" in query) {
            $("#comment").val(query["comment"]);
        }
        for (const property in query) {
            if (property in qpSender) {
                $(`#${property}`).val(query[property]);
            }
        }
    }

    async function embeddedSend() {
        const signer = {
            name: data.userInfo.name,
            email: data.userInfo.email,
            clientUserId: 1000
        };
        envelopeId = await createEnvelope(signer);
        if (envelopeId) {
            msg(`Envelope ${envelopeId} created.`);
            await embeddedSenderView({
                envelopeId: envelopeId,
                signer: signer
            });
        }
    }

    /*
     *  Create the envelope from a template
     *  on the DocuSign platform
     */
    async function createEnvelope({ name, email, clientUserId }) {
        const req = {
            status: "created",
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
                            customFields: {
                                listCustomFields: [
                                    {
                                        name: "Envelope list custom field 1",
                                        show: "true",
                                        value: "value 5"
                                    }
                                ]
                            },
                            recipients: {
                                signers: [
                                    {
                                        email: email,
                                        name: name,
                                        clientUserId: clientUserId,
                                        roleName: "Signer1",
                                        recipientId: "1",
                                        customFields: [
                                            "field1: value 1",
                                            "field2: value 2"
                                        ]
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
        const req = {
            returnUrl: dsReturnUrl
        };

        // Make the API call
        const apiMethod = `/accounts/${accountId}/envelopes/${envelopeId}/views/sender`;
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
        const qp = new URLSearchParams(qpSender);
        const resultsUrl = results.url.replace(/&send=[01]/,''); // remove "&send=1"
        const senderUrl = `${resultsUrl}&${qp.toString()}`;
        msg(`Displaying sender view: ${senderUrl}`); 
        // no iframe: embeddedViewWindow = window.open(senderUrl, "_blank");
        embeddedViewWindow = window.open(
            `${iframeitUrl}?label=Embedded+Sender+View&url=${encodeURIComponent(senderUrl)}`, "_blank");
        
        if(!embeddedViewWindow || embeddedViewWindow.closed || 
           typeof embeddedViewWindow.closed=='undefined') {
            // popup blocked
            alert ("Please enable the popup window");
        }
        embeddedViewWindow.focus();
        return true;
    }
    
    /*
     * Create an embedded template edit view, open a new tab with it
     */
    async function embeddedTemplateEdit({ templateId }) {
        const req = {
            returnUrl: dsReturnUrl
        };

        // Make the API call
        const apiMethod = `/accounts/${accountId}/templates/${templateId}/views/edit`;
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
                `<p>Embedded Template Edit view created. Response:</p><p><pre><code>${JSON.stringify(
                    results,
                    null,
                    4
                )}</code></pre></p>`
            );
        }
        const qp = new URLSearchParams(qpSender);
        const resultsUrl = results.url.replace(/&send=[01]/,''); // remove "&send=1"
        const senderUrl = `${resultsUrl}&${qp.toString()}`;
        msg(`Displaying template edit view: ${senderUrl}`); 
        embeddedViewWindow = window.open(senderUrl, "_blank");
        if(!embeddedViewWindow || embeddedViewWindow.closed || 
           typeof embeddedViewWindow.closed=='undefined') {
            // popup blocked
            alert ("Please enable the popup window");
        }
        embeddedViewWindow.focus();
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


    /////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////

    /* Checks that the access token is still good.
     * Prompts for login if not
     */
    function checkToken() {
        if (data.authCodePkce.checkToken()) {
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
        if (source === "oauthResponse" && data.authCodePkce) {
            await authCodePkceMsg(event.data);
            return;
        }
    };
    messageListener = messageListener.bind(this);

    /*
     * Process incoming implicit grant response
     */
    async function authCodePkceMsg(eventData) {
        const oAuthResponse = data.authCodePkce.handleMessage(eventData);
        if (oAuthResponse === "ok") {
            await completeLogin()
        } else if (oAuthResponse === "error") {
            $("#login").removeClass("hide");
            const errHtml = `<p class="text-danger">${data.authCodePkce.errMsg}</p>`;
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
            accessToken: data.authCodePkce.accessToken,
            workingUpdateF: workingUpdate,
            platform: platform
        });
        let ok = await data.userInfo.getUserInfo();
        corsAccountReport();
        ok = ok && await setAccountId(getStoredAccountId());
        if (!ok) {
            // Did not complete the login or templates issue
            $("#login").removeClass("hide");
            if (data.userInfo.errMsg) {
                const errHtml = `<p class="text-danger">${data.userInfo.errMsg}</p>`;
                htmlMsg(errHtml);
            }
        }
        setQp()
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
            const aId = account.corsError ? `<b>CORS Error</b>` : 
                `#${account.accountExternalId}`;
            htmlMsg(`<p class="mb-0">${account.accountName} (${aId})</p>`)
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
        
        if (corsError) {
            errMsg(`Error: this account (${accountName}) has not enabled CORS for this application. Please switch accounts or login again.`);
            return false; // EARLY RETURN
        }
        
        // 3. Store the account as the user's default in the browser storage
        setStoredAccountId(accountId);
        
        // 4. Update the callApi and checkTemplates objects
        data.callApi = new CallApi({
            accessToken: data.authCodePkce.accessToken,
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
        if (ok) {
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
        platform = "demo";
        data.authCodePkce = new AuthCodePkce({
            workingUpdateF: workingUpdate,
            clientId: platform
        });
        await data.authCodePkce.login();
    };
    login = login.bind(this);

    let loginStage = async function loginStagef(event) {
        $("#login").addClass("hide");
        platform = "stage";
        data.authCodePkce = new AuthCodePkce({
            workingUpdateF: workingUpdate,
            clientId: platform
        });
        await data.authCodePkce.login();
    };
    loginStage = loginStage.bind(this);
    
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
        authCodePkce: null,
        userInfo: null,
        callApi: null,
        checkTemplates: null,
    };

    // The mainline
    if (window.location.host === 'localhost' || usingHttps()) {
        adjustRows();
        window.addEventListener("message", messageListener);
        $("#btnOauth").click(login);
        $("#btnOauthStage").click(loginStage);
        $("#btnDoit").click(doit);
        $("#btnDoit2").click(doit2);
        $("#btnDoit3").click(doit3);
        $("#saccount a").click(switchAccountsButton);
        $("#switchAccountModal .modal-body").click(accountClicked);

    }    
});
