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
    LoadingModal
} from "../library/utilities.js" 

import {Click2Agree} from "./click2agree.js"

const CLIENT_ID = "demo";
const CONFIG_STORAGE = "embeddedSigning";

$(async function () {
    let oAuthClientID;
    let accountId;
    let configuration = {
        mode: "click2sign", supp1include: true, supp1signerMustAcknowledge: "view",
        supp2include: true, supp2signerMustAcknowledge: "accept"
    }

    let sign = async function signF (e) {
        e.preventDefault();

        const supplemental = [{include: true, signerMustAcknowledge: "view"},
           {include: true, signerMustAcknowledge: "accept"}];
        // no_interaction, view, accept, view_accept

        await data.click2agree.sign({supplemental: supplemental});
    }.bind(this)

    let login = function loginF() {
        data.implicitGrant.login();
    }.bind(this);

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
        data.loadingModal.delayedHide("Logged In!")
    }

    //window.addEventListener("message", messageListener);
    $("#modalLogin button").click(login);
    $("#sign").click(sign);
    const smsEl = document.querySelector("#sms");

})
