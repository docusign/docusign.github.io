// Copyright © 2022 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

// Local storage account key
const DSexampleAccountId = "DSCodePenAccountId";
const CACHE_ACCOUNT_INFO = true; // user picture too


function switchToHttps() {
    if (location.protocol !== "https:" && location.origin !== "http://localhost") {
        location.protocol = "https:"
        location.replace(location.href())
    }
}

function storageGet(name, dflt=null) {
    let response = dflt;
    try {
        response = JSON.parse(localStorage.getItem(name));
    } catch {};
    return response
}

function storageSet(name, val) {
    try {
        localStorage.setItem(name, JSON.stringify(val))
    } catch {};
}

function settingsGet(configuration) {
    const settings = storageGet(EMBEDDED_SIGNING_SETTINGS_STORAGE);
    if (settings) {
        Object.keys(settings).forEach(item => {
            configuration[item] = settings [item]
        })
    }
}

function settingsSet(configuration) {
    let settings = {};
    EMBEDDED_SIGNING_SETTINGS.forEach(item => {
        settings[item] = configuration [item];
    });
    storageSet(EMBEDDED_SIGNING_SETTINGS_STORAGE, settings); // save the settings 
}

function toast (msg, durationSec = 5) {
    Toastify({ // https://github.com/apvarun/toastify-js/blob/master/README.md
        text: msg,
        duration: 1000 * durationSec,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "center", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
          background: "linear-gradient(to right, #00b09b, #96c93d)",
        },
      }).showToast();
}

/***
 * Arguments
 *   style: text | qr
 *   title
 *   msg -- can be html
 *   url
 *   usingChrome -- 1 means signing ceremony includes app chrome. Not recommended for mobile.
 * qr mode uses a template
 */
function messageModal({style, title, msg, url, usingChrome}) {
    $("#messageModal .modal-title").text(title);
    if (style === "text") {
        $("#messageModal .modal-body").html(msg);
    } else if (style === "qr") {
        const chrome = usingChrome ? 
            `<p><small> Note: this will not be the best mobile experience because you’re including application “chrome” with the signing ceremony.
            Use the <b>Settings</b> (top navigation) to turn off the iframe/chrome setting.</small></p>`
            : "";
        const body = `<p>Open the URL to see the Signing Ceremony</p>`
            + `<p><a href='${url}' target='_blank'>url</a></p>`
            + `<p>Sign on your mobile by opening the URL via the QR Code</p>`
            + chrome
            + `<div>${qrcode(url)}</div>`;
        $("#messageModal .modal-body").html(body);
    }
    const modal = new bootstrap.Modal('#messageModal');
    modal.show();
}

/***
 * Manage the loading modal and its text
 */
const LOADING_ID = "loading";
const LOADING_SELECTOR = `#${LOADING_ID}`;
class LoadingModal {
    constructor(args) {
        this.modal = new bootstrap.Modal(LOADING_SELECTOR);
        this.titleEl = $(`${LOADING_SELECTOR} .modal-title`)[0];
        this.shown = false; // Is the loader being shown?
    }

    /***
     * show -- set the loader's message, show the loader
     *      can be called additional times to update the msg 
     */
    show(msg) {
        $(this.titleEl).text(msg);
        if (!this.shown) {
            this.modal.show();
            this.shown = true;
        }
    }

    /***
     * delayedHide -- show a final message for a couple of seconds,
     *      then hide the modal
     */
    delayedHide(msg, timeoutSec=2) {
        $(this.titleEl).text(msg);
        setTimeout(() => {this.modal.hide()}, timeoutSec * 1000);
        this.shown = false;
    }

    /***
     * hide -- immediately close the loader
     */
    hide() {
        this.modal.hide();
        this.shown = false;
    }
}

/***
 * userPictureAccountBrand
 * Add the user's picture and account info
 */
async function userPictureAccountBrand({accountId, userInfo, callApi}){
    const pictureId = "user-picture";
    const accountBrandId = "account-brand";
    const accountInfo = "account-info";
    const userPictureKey = `picture_${userInfo.userId}`;
    const accountLogoKey = `logo_${accountId}`;

    // user's picture
    let pictureResults;
    if (CACHE_ACCOUNT_INFO) {
        pictureResults = storageGet(userPictureKey);
    }
    if (!pictureResults) {
        const apiMethod = `/accounts/${accountId}/users/${userInfo.userId}/profile/image`;
        pictureResults = await callApi.getImageDataUrl(apiMethod);
    }
    if (CACHE_ACCOUNT_INFO && pictureResults) {
        storageSet(userPictureKey, pictureResults)
    }
    if (pictureResults) {
        $(`#${pictureId}`).html(`<div class="user-photo"><img src="${pictureResults}" class="user-photo" /></div>`)
    } else {
        const firstI = userInfo.given_name ? userInfo.given_name.charAt(0) : userInfo.name.charAt(0);
        const lastI = userInfo.family_name ? userInfo.family_name.charAt(0) : '';
        $(`#${pictureId}`).html(`<span class="user-initials">${firstI}${lastI}</span>`);
    }

    // Account name and id
    let text;
    const accountsEntry = userInfo.accountsEntry(accountId);
    if (accountsEntry) {
        text = `Account #${accountsEntry.accountExternalId}<br/>${accountsEntry.accountName}`;
    } else {
        text = "??";
    }
    $(`#${accountInfo}`).html(`<div class="me-4 pt8">${text}</div>`); 

    // account brand image
    $(`#${accountBrandId}`).empty();
    let logo;
    if (CACHE_ACCOUNT_INFO) {
        logo = storageGet(accountLogoKey);
    }
    if (!logo) {
        let apiMethod = `/accounts/${accountId}/brands?include_logos=true`;
        const results = await callApi.callApiJson({
            apiMethod: apiMethod, httpMethod: "GET", req: null});
        if (!results) {return} // EARLY return
        // look for a logoBrand
        let logoBrand;
        const brands = results.brands;
        if (brands) {
            for(let i = 0; i < brands.length; i++){
                const brand = brands[i];
                if((brand.isSendingDefault || brand.isSigningDefault) && brand.logos && brand.logos.primary) {
                    logoBrand = brand.logos.primary;
                    break;
                }
            }
        }    
        if (!logoBrand) {return} // EARLY return
        apiMethod = `/accounts/${accountId}${logoBrand}`;
        logo = await callApi.getImageDataUrl(apiMethod);
    }
    if (CACHE_ACCOUNT_INFO && logo) {
        storageSet(accountLogoKey, logo)
    }
    if (logo) {
        $(`#${accountBrandId}`).html(`<img src="${logo}" class="brand-logo me-3" />`)
    }
}

/***
 * checkAccountSettings -- check that the account can do embedded signing
 * @returns ok
 */
async function checkAccountSettings({accountId, userInfo, callApi}) {
    // get account settings
    const apiMethod = `/accounts/${accountId}/settings`;
    const results = await callApi.callApiJson({
        apiMethod: apiMethod, httpMethod: "GET", req: null});
    if (!results) {return true} // EARLY return
    const inSessionEnabled = results.inSessionEnabled === 'true';
    if (!inSessionEnabled) {
        messageModal({style: "text", title: "Account Setting Error", 
        msg: `<p>The account requires the "inSessionEnabled" setting.</p>` + 
        `<p>Switch your default account to a new Developer Account or contact Docusign Customer Support.</p>`})
    }
    return inSessionEnabled;
}



/////////////////////
export { LoadingModal,
    toast, switchToHttps, messageModal, 
    storageGet, storageSet, settingsGet, settingsSet,
    userPictureAccountBrand, checkAccountSettings,
};
