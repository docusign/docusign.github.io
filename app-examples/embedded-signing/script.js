// Copyright © 2024 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
//
// Embedded Signing main JS script

import {
    ImplicitGrant,
} from "../library/implicitGrant.js" 

import {
    CallApi,
    UserInfo
} from "../library/callapi.js" 

import { CheckTemplates 
} from "../library/checkTemplates.js";

import {
    switchToHttps,
    toast,
    messageModal,
    LoadingModal,
    processUrlHash,
    storageGet, 
    storageSet
} from "../library/utilities.js" 

import {Click2Agree} from "./click2agree.js"

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
        supp2signerMustAcknowledge: "accept"
    }
    const formCheckboxes = {
        supp1include: true, 
        supp2include: true, 
    }

    /***
     * signClickToAgree -- start the signing process
     */
    let signClickToAgree = async function signF (e) {
        e.preventDefault();
        formToConfiguration();
        const supplemental = [
            {include: configuration.supp1include, signerMustAcknowledge: configuration.supp1signerMustAcknowledge},
            {include: configuration.supp2include, signerMustAcknowledge: configuration.supp2signerMustAcknowledge}];
        await data.click2agree.sign({supplemental: supplemental});
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
        const signing = data.click2agree && data.click2agree.signing // OR another mode.signing
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
            data.click2agree = new Click2Agree({
                showMsg: toast,
                messageModal: messageModal,
                loadingModal: data.loadingModal,
                clientId: oAuthClientID,
                accountId: accountId,
                callApi: data.callApi,
                mainElId: "main",
                signElId: "signing-ceremony",
            })
        } else {
            // Did not complete the login
            toast(data.userInfo.errMsg);
        }
        return ok;
    }

    // Mainline
    let data = {
        implicitGrant: null,
        userInfo: null,
        callApi: null,
        click2agree: null,
        loadingModal: new LoadingModal(),
    };

    switchToHttps();
    const config = processUrlHash("supp1signerMustAcknowledge");
    if (config) {storageSet(CONFIG_STORAGE, config)}
    // The Implicit grant constructor looks at hash data to see if we're 
    // now receiving the OAuth response
    data.implicitGrant = new ImplicitGrant({
        oAuthReturnUrl: `${location.origin}${location.pathname}`,
        clientId: CLIENT_ID,
        showMsg: toast
    });
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
        data.loadingModal.delayedHide("Logged In!")
    }

    $("#modalLogin button").click(login);
    $("#signClickToAgree").click(signClickToAgree);
    $("#saveToUrl").click(saveToUrl);
    $('#myTab [data-bs-toggle="tab"]').on('show.bs.tab', (e) => {
        storageSet(MODE_STORAGE, $(e.target)[0].id)}); // save the mode
    window.addEventListener("beforeunload", beforeUnloadHandler);
})
