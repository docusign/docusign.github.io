import {
    ImplicitGrant,
} from "../library/implicitGrant.js" 

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

$(function () {
    // #####################################################
    const logLevel = 0; // 0 is terse; 9 is verbose
    // Change the log level to see the requests / responses
    // #####################################################



    let login = function loginF() {
        data.implicitGrant.login();
    }.bind(this);

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
        toast("Logged In!")
    }


    //window.addEventListener("message", messageListener);
    $("#modalLogin button").click(login);
    $("#btnDoit").click(doit);
    $("#chooseFile").change(chooseFile);
    const smsEl = document.querySelector("#sms");

})
