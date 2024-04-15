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
import { ClassicSigning } from "./classicEmbeddedSigning.js";

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
const CLASSIC_RESULT = 'classicResult'; // store the classic non-iframe signing result

$(async function () {
    let oAuthClientID;
    let accountId;
    let configuration = {
        mode: "click2agree-tab", 
        supp1include: false, 
        supp1signerMustAcknowledge: "view",
        supp2include: false, 
        supp2signerMustAcknowledge: "accept",
        supp11include: false, 
        supp11signerMustAcknowledge: "view",
        supp12include: false, 
        supp12signerMustAcknowledge: "accept",
        supp21include: false, 
        supp21signerMustAcknowledge: "view",
        supp22include: false, 
        supp22signerMustAcknowledge: "accept",
        supp31include: false, 
        supp31signerMustAcknowledge: "view",
        supp32include: false, 
        supp32signerMustAcknowledge: "accept",
        buttonPosition1: "bottom-right",
        buttonText1: "Submit",
        buttonText1: "Agree",
        backgroundColor1: "#000000",
        textColor1: "#FFFFFF",
        backgroundColor2: "#f7ba00",
        textColor2: "#333333",
        backgroundColor3: "#000000",
        textColor3: "#FFFFFF",
        signername1: "",
        signername2: "",
        signername3: "",
        useSigningCeremonyDefaultUx: true,
        useIframe: true,
        locale: "default",
        locale1: "default",
        locale2: "default",
        locale3: "default",
    }
    const formCheckboxes = {
        supp1include: true, 
        supp2include: true, 
        supp11include: true, 
        supp12include: true, 
        supp21include: true, 
        supp22include: true,
        supp31include: true, 
        supp32include: true,
        useSigningCeremonyDefaultUx: true,
        useIframe: true, 
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
        if (!checkToken()){return}
        const supplemental = [
            {include: configuration.supp1include, signerMustAcknowledge: configuration.supp1signerMustAcknowledge},
            {include: configuration.supp2include, signerMustAcknowledge: configuration.supp2signerMustAcknowledge}];
        await data.click2agree.sign({
            supplemental: supplemental,
            name: data.userInfo.name,
            email: data.userInfo.email,
            modelButtonId: "modelButton3",
            locale: configuration.locale
        })
    }.bind(this)

    /***
     * signFocusView -- Focus View example
     */
    let signFocusView = async function signFocusViewF (e) {
        e.preventDefault();
        formToConfiguration();
        if (!checkToken()){return}
        const supplemental = [
            {include: configuration.supp11include, signerMustAcknowledge: configuration.supp11signerMustAcknowledge},
            {include: configuration.supp12include, signerMustAcknowledge: configuration.supp12signerMustAcknowledge}];
        await data.focusedViewSigning.sign({
            templateId: templates[0].templateId,
            supplemental: supplemental,
            name: configuration.signername1,
            email: data.userInfo.email,
            modelButtonId: "modelButton1",
            modelButtonPosition: "buttonPosition1",
            locale: configuration.locale1
            });
    }.bind(this)

    /***
     * dsjsDefault -- Focus View example
     */
    let dsjsDefault = async function dsjsDefaultF (e) {
        e.preventDefault();
        formToConfiguration();
        if (!checkToken()){return}
        const supplemental = [
            {include: configuration.supp21include, signerMustAcknowledge: configuration.supp21signerMustAcknowledge},
            {include: configuration.supp22include, signerMustAcknowledge: configuration.supp22signerMustAcknowledge}];
        await data.dsjsDefaultSigning.sign({
            templateId: templates[0].templateId,
            supplemental: supplemental,
            name: configuration.signername2,
            email: data.userInfo.email,
            modelButtonId: "modelButton2",
            locale: configuration.locale2,
            });
    }.bind(this)

    /***
     * classicSign signing ceremony
     */
    let classicSign = async function classicSignF (e) {
        e.preventDefault();
        formToConfiguration();
        if (!checkToken()){return}
        const supplemental = [
            {include: configuration.supp31include, signerMustAcknowledge: configuration.supp31signerMustAcknowledge},
            {include: configuration.supp32include, signerMustAcknowledge: configuration.supp32signerMustAcknowledge}];
        await data.classicSigning.sign({
            templateId: templates[0].templateId,
            supplemental: supplemental,
            name: configuration.signername3,
            email: data.userInfo.email,
            useIframe: configuration.useIframe,
            locale: configuration.locale3
            });
    }.bind(this)

    /***
     * A view button was clicked
     * Call the right function
     */
    let view = async function viewF (e) {
        formToConfiguration();
        const sectionName = $(e.target).closest(".tab-pane").attr("id");
        if (sectionName === 'focusedView-tab-pane') {
            await data.focusedViewSigning.view()
        } else if (sectionName === 'click2agree-tab-pane') {
            await data.click2agree.view()
        } else if (sectionName === 'dsjsDefault-tab-pane') {
            await data.dsjsDefaultSigning.view()
        } else if (sectionName === 'classic-tab-pane') {
            await data.classicSigning.view(configuration.useIframe)
        }
    }.bind(this)


    /////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////

    // Engine room stuff is below

    /***
     * envelopeCreated
     * An envelope was created, enable buttons to show it 
     */
    function envelopeCreated(e) {
        if (e.data !== "envelopeCreated") {return}
        // show the buttons for sending a current envelope
        $(".env-view").removeClass("hide");
    }

    /***
     * checkToken returns true if we're good to go.
     */
    function checkToken() {
        const tokenOk = data.implicitGrant.checkToken();
        if (!tokenOk) {
            messageModal("Your Login Session Has Expired", 
            `<p>Your 8 hour login session has expired.</p>
            <p>Recommendation: use <b>Save to URL</b>
            (top navigation) to save your work, then reload
            this page from the URL and login again.</p>`)
        }
        return tokenOk
    }

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
            if (configuration.useSigningCeremonyDefaultUx) {
                $(`.classicColor`).attr("disabled", true);
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
            data.classicSigning = new ClassicSigning({
                showMsg: toast,
                messageModal: messageModal,
                loadingModal: data.loadingModal,
                clientId: oAuthClientID,
                accountId: accountId,
                callApi: data.callApi,
                mainElId: "main",
                signElId: "signing-ceremony",
                envelopes: data.envelopes,
                CLASSIC_RESULT: CLASSIC_RESULT,
            });
            data.classicSigning.showResults();
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

    // Register event handlers
    $("#modalLogin button").click(login);
    $("#signClickToAgree").click(signClickToAgree);
    $("#signFocusView").click(signFocusView);
    $("#dsjsDefault").click(dsjsDefault);
    $("#classicSign").click(classicSign);
    $("#saveToUrl").click(saveToUrl);
    $(".env-view").click(view);
    $('#myTab [data-bs-toggle="tab"]').on('show.bs.tab', e => {
        storageSet(MODE_STORAGE, $(e.target)[0].id)}); // save the mode 
    window.addEventListener("beforeunload", beforeUnloadHandler);
    window.addEventListener("message", envelopeCreated);
    $("#useSigningCeremonyDefaultUx").change(e => {
        $(`.classicColor`).attr("disabled", 
        $("#useSigningCeremonyDefaultUx").prop('checked'))});   

    // Starting up...
    switchToHttps();
    // Does the hash include a config item? Then save it.
    const config = processUrlHash("supp1signerMustAcknowledge");
    if (config) {storageSet(CONFIG_STORAGE, config)}
    const classicResults = processUrlHash("classicResults");
    if (classicResults) {storageSet(CLASSIC_RESULT, classicResults)}
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
        $(`#signername3`).val(data.userInfo.name);
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
        data.modelButton3Changes = new ButtonOnChange({
            buttonId: "modelButton3",
            backgroundColorId: "backgroundColor3",
            textColorId: "textColor3"
        });
    }
})
