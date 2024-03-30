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
    workingUpdate,
    switchToHttps,
    getStoredAccountId,
    setStoredAccountId,
    toast,
    //switchAccountsModal
} from "../library/utilities.js" 

const CLIENT_ID = "demo";

$(async function () {
    // #####################################################
    const logLevel = 0; // 0 is terse; 9 is verbose
    // Change the log level to see the requests / responses
    // #####################################################

    let sign = function signF () {


    }.bind(this)

    let login = function loginF() {
        data.implicitGrant.login();
    }.bind(this);

    async function completeLogin() {
        data.userInfo = new UserInfo({
            accessToken: data.implicitGrant.accessToken,
        });
        const ok = await data.userInfo.getUserInfo();
        if (ok) {
            data.callApi = new CallApi({
                accessToken: data.implicitGrant.accessToken,
                apiBaseUrl: data.userInfo.defaultBaseUrl
            });
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
    };

    switchToHttps();
    data.implicitGrant = new ImplicitGrant({
        workingUpdateF: workingUpdate,
        oAuthReturnUrl: `${location.origin}${location.pathname}`,
        clientId: CLIENT_ID,
        showMsg: toast
    });
    if (!data.implicitGrant.checkToken()) {
        const loginModal = new bootstrap.Modal('#modalLogin');
        loginModal.show();
    } else {
        // logged in
        const loadingModal = new bootstrap.Modal('#loading');
        loadingModal.show();
        await completeLogin();
        loadingModal.hide();
        toast("Logged In!")
    }

    //window.addEventListener("message", messageListener);
    $("#modalLogin button").click(login);
    $("#sign").click(sign);
    const smsEl = document.querySelector("#sms");

})
