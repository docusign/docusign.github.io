// Copyright © 2024 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
//
// Embedded Signing main JS script


import { ImplicitGrant } from "../library/implicitGrant.js" 
import { CheckTemplates } from "../library/checkTemplates.js";
import { Envelopes } from "./envelopes.js";
import { Click2Agree } from "./click2agree.js"
import { FocusedViewSigning } from "./focusedViewSigning.js";
import { DsjsDefaultSigning } from "./dsjsDefaultSigning.js";

import {
    CallApi,
    UserInfo
} from "../library/callapi.js" 

import {
    switchToHttps,
    toast,
    messageModal,
    LoadingModal,
    processUrlHash,
    storageGet, 
    storageSet,
    ButtonOnChange
} from "../library/utilities.js" 

const CLIENT_ID = "demo";
const CONFIG_STORAGE = "embeddedSigningConfiguration";
const MODE_STORAGE = "embeddedSigningMode";

$(async function () {
    let oAuthClientID;
    let accountId;
    let configuration = {
        mode: "click2agree-tab", 
        supp1include: true, 
        supp1signerMustAcknowledge: "view",
        supp2include: true, 
        supp2signerMustAcknowledge: "accept",
        buttonPosition1: "bottom-right",
        buttonText1: "Submit",
        buttonText1: "Agree",
        backgroundColor1: "#000000",
        textColor1: "#FFFFFF",
        backgroundColor2: "#000000",
        textColor2: "#FFFFFF",
    }
    const formCheckboxes = {
        supp1include: true, 
        supp2include: true, 
    }

    let templates = [
        {
            url:  "https://docusign.github.io/examples/templates/Field_Test",
            name: "DevCenter example: Field Test",
            description:
                "This DevCenter example template includes multiple types of fields.",
            templateId: null
        }
    ];

    /***
     * signClickToAgree -- start the signing process
     */
    let signClickToAgree = async function signClickToAgreeF (e) {
        e.preventDefault();
        formToConfiguration();
        const supplemental = [
            {include: configuration.supp1include, signerMustAcknowledge: configuration.supp1signerMustAcknowledge},
            {include: configuration.supp2include, signerMustAcknowledge: configuration.supp2signerMustAcknowledge}];
        await data.click2agree.sign({
            supplemental: supplemental,
            name: data.userInfo.name,
            email: data.userInfo.email,
            modelButtonId: "modelButton3",
        })
    }.bind(this)

    /***
     * signFocusView -- Focus View example
     */
    let signFocusView = async function signFocusViewF (e) {
        e.preventDefault();
        formToConfiguration();
        await data.focusedViewSigning.sign({
            templateId: templates[0].templateId,
            name: $(`#signername1`).val(),
            email: data.userInfo.email,
            modelButtonId: "modelButton1",
            modelButtonPosition: "buttonPosition1",
            });
    }.bind(this)

    /***
     * dsjsDefault -- Focus View example
     */
    let dsjsDefault = async function dsjsDefaultF (e) {
        e.preventDefault();
        formToConfiguration();
        await data.dsjsDefaultSigning.sign({
            templateId: templates[0].templateId,
            name: $(`#signername2`).val(),
            email: data.userInfo.email,
            modelButtonId: "modelButton2",
            });
    }.bind(this)


    /////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////

    // Engine room stuff is below

    /***
     * formToConfiguration copy data from the form to the configuration object
     * setFormFromConfiguration update form to the configuration
     */
    function formToConfiguration(){
        for (const property in configuration) {
            if (property === "mode") {continue}
            configuration[property] = formCheckboxes[property] ? $(`#${property}`).prop('checked') : $(`#${property}`).val();
        }
        configuration.mode = $(`button.nav-link.active`)[0].id;
    }
    function setFormFromConfiguration() {
        for (const property in configuration) {
            if (property === "mode") {continue}
            if (formCheckboxes[property]) {
                $(`#${property}`).prop('checked', configuration[property]);
            } else {
                $(`#${property}`).val(configuration[property]);
            }
        }
        new bootstrap.Tab(`#${configuration.mode}`).show()
    }

    /***
     * saveToUrl -- create a URL from the configuration
     */
    const saveToUrl = async function saveToUrlF(e) {
        e.preventDefault();
        formToConfiguration();
        let url = window.location.origin + window.location.pathname + "#";
        for (const property in configuration) {
            url += `${property}=${encodeURIComponent(configuration[property]).replace(/\%20/g, '+')}&`;
        }
        await navigator.clipboard.writeText(url);
        toast("Copied to the Clipboard!");
    }.bind(this);

    /***
     * Ask for confirmation before
     */
    const beforeUnloadHandler = function beforeUnloadHandlerF(event) {
        const signing = data.click2agree && data.click2agree.signing
            || data.focusedViewSigning && data.focusedViewSigning.signing
            || data.dsjsDefaultSigning && data.dsjsDefaultSigning.signing;
         
        if (signing) {
            event.preventDefault();
            event.returnValue = ''; // Chrome requires returnValue to be set.
        }
    }.bind(this)
    
    /***
     * Start login process
     */
    const login = function loginF() {
        data.implicitGrant.login();
    }.bind(this);

    /***
     * Complete login process.
     */
    async function completeLogin() {
        oAuthClientID = data.implicitGrant.oAuthClientID;
        data.userInfo = new UserInfo({
            accessToken: data.implicitGrant.accessToken,
            onlyCheckDefaultAccount: true,
        });
        const ok = await data.userInfo.getUserInfo();
        if (ok) {
            accountId = data.userInfo.defaultAccount;
            console.log (`ACCOUNT INFORMATION Account ID: ${accountId}, Name: ${data.userInfo.defaultAccountName}`);
            data.callApi = new CallApi({
                accessToken: data.implicitGrant.accessToken,
                apiBaseUrl: data.userInfo.defaultBaseUrl
            });
            data.checkTemplates = new CheckTemplates({
                callApi: data.callApi, 
                accountId: accountId
            });    
            data.envelopes = new Envelopes({
                showMsg: toast,
                messageModal: messageModal,
                loadingModal: data.loadingModal,
                clientId: oAuthClientID,
                accountId: accountId,
                callApi: data.callApi,
            })
            data.click2agree = new Click2Agree({
                showMsg: toast,
                messageModal: messageModal,
                loadingModal: data.loadingModal,
                clientId: oAuthClientID,
                accountId: accountId,
                callApi: data.callApi,
                mainElId: "main",
                signElId: "signing-ceremony",
                envelopes: data.envelopes,
            });
            data.focusedViewSigning = new FocusedViewSigning({
                showMsg: toast,
                messageModal: messageModal,
                loadingModal: data.loadingModal,
                clientId: oAuthClientID,
                accountId: accountId,
                callApi: data.callApi,
                mainElId: "main",
                signElId: "signing-ceremony",
                envelopes: data.envelopes,
            });
            data.dsjsDefaultSigning = new DsjsDefaultSigning({
                showMsg: toast,
                messageModal: messageModal,
                loadingModal: data.loadingModal,
                clientId: oAuthClientID,
                accountId: accountId,
                callApi: data.callApi,
                mainElId: "main",
                signElId: "signing-ceremony",
                envelopes: data.envelopes,
            });
        } else {
            // Did not complete the login
            toast(data.userInfo.errMsg);
        }
        return ok;
    }

    /***
     * Check the templates
     *   returns result {ok: bool, msg) 
     */
    async function checkTemplates() {
        templates = await data.checkTemplates.check(templates);
        const emptyOk = data.checkTemplates.msg === ''
        const ok = data.checkTemplates.msg || emptyOk;
        const okMsg = emptyOk ? "Done." : data.checkTemplates.msg;
        return {ok: ok, msg: ok ? okMsg : data.checkTemplates.errMsg}
    }

    // Mainline
    let data = {
        implicitGrant: null,
        userInfo: null,
        callApi: null,
        click2agree: null,
        loadingModal: new LoadingModal(),
        modelButton1Changes: null,
    };

    switchToHttps();
    // Start. Does the hash include a config item? Then save it.
    const config = processUrlHash("supp1signerMustAcknowledge");
    if (config) {storageSet(CONFIG_STORAGE, config)}
    // The Implicit grant constructor looks at hash data to see if we're 
    // now receiving the OAuth response
    data.implicitGrant = new ImplicitGrant({
        oAuthReturnUrl: `${location.origin}${location.pathname}`,
        clientId: CLIENT_ID,
        showMsg: toast
    });
    // If we're not logged in, then ask to start the login flow.
    if (!data.implicitGrant.checkToken()) {
        const loginModal = new bootstrap.Modal('#modalLogin');
        loginModal.show();
    } else {
        // logged in
        data.loadingModal.show("Completing Login Process")
        await completeLogin();
        const mode = storageGet(MODE_STORAGE); // restore mode
        if (mode) {configuration.mode = mode}
        let config = storageGet(CONFIG_STORAGE);
        storageSet(CONFIG_STORAGE, false); // reset
        if (config) {configuration = config}; // overwrite from QP
        setFormFromConfiguration();
        data.loadingModal.show("Logged in. Checking templates")
        const result = await checkTemplates(templates);
        if (result.ok) {
            data.loadingModal.delayedHide(result.msg)
        } else {
            data.loadingModal.hide();
            messageModal("Templates issue", `<p>Problem while loading example templates
            to your eSignature account:</p><p>${result.msg}</p>`)
        }
        $(`#signername1`).val(data.userInfo.name);
        $(`#signername2`).val(data.userInfo.name);
        data.modelButton1Changes = new ButtonOnChange({
            buttonId: "modelButton1",
            textId: "buttonText1",
            backgroundColorId: "backgroundColor1",
            textColorId: "textColor1"
        });
        data.modelButton2Changes = new ButtonOnChange({
            buttonId: "modelButton2",
            backgroundColorId: "backgroundColor2",
            textColorId: "textColor2"
        });
        data.modelButton2Changes = new ButtonOnChange({
            buttonId: "modelButton3",
            backgroundColorId: "backgroundColor3",
            textColorId: "textColor3"
        });
    }

    $("#modalLogin button").click(login);
    $("#signClickToAgree").click(signClickToAgree);
    $("#signFocusView").click(signFocusView);
    $("#dsjsDefault").click(dsjsDefault);
    $("#saveToUrl").click(saveToUrl);
    $('#myTab [data-bs-toggle="tab"]').on('show.bs.tab', (e) => {
        storageSet(MODE_STORAGE, $(e.target)[0].id)}); // save the mode
    window.addEventListener("beforeunload", beforeUnloadHandler);
})
