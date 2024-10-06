// Copyright © 2022 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

// Local storage account key
const DSexampleAccountId = "DSCodePenAccountId";
const EMBEDDED_SIGNING_SETTINGS_STORAGE = "embeddedSigningSettings";
const EMBEDDED_SIGNING_SETTINGS = ["outputStyle", "useIframe", "authStyle", "idvConfigId", "smsNational", "smsCc"]; // names of the settings
const CACHE_ACCOUNT_INFO = true; // user picture too

// Monitor screen size changes and adjust the signing div
function monitorSigningHeight({signingId, padding}) {
    const fixHeight = function fixHeightF(evnt) {
        const data = evnt.data;
        const padding = data.padding;
        const windowHeight = window.innerHeight;
        $(`#${data.signingId} > iframe`).css('height', `${windowHeight - padding}px`)
    }
    $(window).on('resize', {signingId: signingId, padding: padding}, fixHeight);
}


// Busy indicator
const workingUpdate = function workingUpdateF(working) {
    if (working) {
        $("#spinner").removeClass("hide");
    } else {
        $("#spinner").addClass("hide");
    }
};

// Add the text message to the log as a new paragraph
function msg(s) {
    $("#msg").append(`<p>${s}<\p>`);
    $("#msg > *").last()[0].scrollIntoView({
        behavior: "smooth"
    });
}

// Add an HTML message
function htmlMsg(s) {
    $("#msg").append(s);
    $("#msg > *").last()[0].scrollIntoView({
        behavior: "smooth"
    });
}

// Add the error text message to the log as a new paragraph
function errMsg(s) {
    $("#msg").append(`<p class="text-danger">${s}<\p>`);
    $("#msg > *").last()[0].scrollIntoView({
        behavior: "smooth"
    });
}

// UsingHttps
function usingHttps() {
    // Using https?
    if (location.protocol === "https:" || location.origin === "http://localhost") {
        $("#login").removeClass("hide");
        return true;
    } else {
        $("#login").addClass("hide");
        const errHtml = `<p class="text-danger">Error: please reload this page using https</p>`;
        htmlMsg(errHtml);
        return false;
    }
}

function switchToHttps() {
    if (location.protocol !== "https:" && location.origin !== "http://localhost") {
        location.protocol = "https:"
        location.replace(location.href())
    }
}

function getStoredAccountId() {
    let accountId = null;
    try {
        accountId = localStorage.getItem(DSexampleAccountId)
    } catch {};
    return accountId
}

function setStoredAccountId(accountId) {
    try {
        localStorage.setItem(DSexampleAccountId, accountId)
    } catch {};
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

function getPhoneNumber(iti) {
    let phoneNumber;
    let resp = {smsNational: null, smsCc: null};
    const rawTel = iti.getNumber() || "";
    try {
        phoneNumber = libphonenumber.parsePhoneNumber(rawTel);
    } catch (error) {
        phoneNumber = null;
    }
    if (phoneNumber) {
        resp.smsNational = phoneNumber.nationalNumber;
        resp.smsCc = phoneNumber.countryCallingCode;
    }
    return resp;
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

// https://github.com/nayuki/QR-Code-generator/blob/master/typescript-javascript/Readme.markdown
function qrcode (url) {
    const QRC = qrcodegen.QrCode;
    const qr0 = QRC.encodeText(url, QRC.Ecc.MEDIUM);
    const svg = toSvgString({qr: qr0});  // See qrcodegen-input-demo
    return svg
}

// https://github.com/nayuki/QR-Code-generator/blob/master/typescript-javascript/qrcodegen-input-demo.ts#L171C1-L189C1
function toSvgString({qr, border = 0, lightColor = "white", darkColor = "black"}){
    let parts = [];
    for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
            if (qr.getModule(x, y))
                parts.push(`M${x + border},${y + border}h1v1h-1z`);
        }
    }
    return `
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${qr.size + border * 2} ${qr.size + border * 2}" stroke="none">
    <rect width="100%" height="100%" fill="${lightColor}"/>
    <path d="${parts.join(" ")}" fill="${darkColor}"/>
</svg>
`;
}


/***
 * processUrlHash 
 * Arg: qp
 * If the hash includes the qp then return the hash as an object and
 * clear the hash
 */
function processUrlHash(qp) {
    let hash = location.hash && location.hash.substring(1); // remove the #
    let search = location.search && location.search.substring(1); // rm ?
    if ((!hash.length && !search.length) ||
         (hash.indexOf(qp) === -1 && search.indexOf(qp) === -1)) {return} // EARLY RETURN (Nothing to see here!)

    // sometimes the hash includes the search (qp) part too!
    // eg '#classicResults=1&envelopeId=aaddc7b3-50d9-461f-957c-599dc9aa9d48?event=signing_complete'
    const searchInHash = hash.indexOf('?') !== -1;
    if (searchInHash) {
        const splitHash = hash.split('?');
        hash = splitHash[0];
        search = splitHash[1];
    }

    window.history.pushState("", "", `${location.origin}${location.pathname}`);
    let query = {};
    let pairs;
    for (let mode = 0; mode < 2; mode++) {
        if (mode === 0) {
            // process hash
            pairs = hash.split('&');
        } else {
            // process search
            pairs = search.split('&');
        }
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i].split('=');
            if (pair.length !== 2) {continue}
            let val = decodeURIComponent(pair[1].replace(/\+/g, '%20') || '');
            if (val === "true") {val = true}
            if (val === "false") {val = false} 
            query[decodeURIComponent(pair[0])] = val;
        }
    }

    return query
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

/***
 * Manage the "on change" events for a button's colors and text
 * constructor args
 * buttonId -- the model button
 * textId -- the text input field
 * backgroundColorId
 * textColorId
 */
class ButtonOnChange{
    constructor(args) {
        this.buttonId = args.buttonId;
        this.textId = args.textId;
        this.backgroundColorId  = args.backgroundColorId;
        this.textColorId  = args.textColorId;
        this.defaultText = args.defaultText;
        
        // prevent action when the model button is clicked
        $(`#${this.buttonId}`).click(e => e.preventDefault());
        // handlers for modifying the button's UX
        this.changed = this.changed.bind(this);
        if (this.textId) {$(`#${this.textId}`).on("input", this.changed)}
        $(`#${this.backgroundColorId}`).on("input", this.changed);
        $(`#${this.textColorId}`).on("input", this.changed);

        // Update the target button to reflect current values
        if (this.textId) {this.changed({target: $(`#${this.textId}`)})}
        this.changed({target: $(`#${this.backgroundColorId}`)});
        this.changed({target: $(`#${this.textColorId}`)});
    }

    /***
     * One of the fields changed. figure out which one and update the button
     */
    changed(event) {
        const modelButtonData = $(event.target).data("modelbutton");
        if (!modelButtonData) {return}
        const targetInfo = modelButtonData.split("-");
        // [0] -- id of the button
        // [1] -- operation; {text, textcolor, background}
        let val = $(event.target).val();

        if (targetInfo[1] === "text") {
            if (!val) {val = this.defaultText}
            $(`#${targetInfo[0]} span`).text(val);
        } else if (targetInfo[1] === "textcolor") {
            $(`#${targetInfo[0]} span`).css('color', val);
        } else if (targetInfo[1] === "background") {
            $(`#${targetInfo[0]}`).css('background-color', val);
        }
    }

    // Save the settings to browser storage
    save() {

    }
    // Restore the settings from browser storage
    restore() {

    }
}

/**
 * adjustRows implements the adjustable rows support
 * Based on https://htmldom.dev/create-resizable-split-views/
 */
function adjustRows() {
    const resizer = document.getElementById("dragMe");
    const topSide = resizer.previousElementSibling;
    const bottomSide = resizer.nextElementSibling;
    const prevSibling = resizer.previousElementSibling;
    let prevSiblingHeight = 0;

    // The current position of mouse
    let x = 0;
    let y = 0;

    // Height of top side
    let topHeight = 0;

    // Handle the mousedown event
    // that's triggered when user drags the resizer
    const mouseDownHandler = function (e) {
        // Get the current mouse position
        x = e.clientX;
        y = e.clientY;
        const rect = prevSibling.getBoundingClientRect();
        prevSiblingHeight = rect.height;

        // Attach the listeners to `document`
        document.addEventListener("mousemove", mouseMoveHandler);
        document.addEventListener("mouseup", mouseUpHandler);
    };

    const mouseMoveHandler = function (e) {
        document.body.style.cursor = "row-resize";
        topSide.style.userSelect = "none";
        topSide.style.pointerEvents = "none";

        bottomSide.style.userSelect = "none";
        bottomSide.style.pointerEvents = "none";

        // How far the mouse has been moved
        const dy = e.clientY - y;

        const h =
            ((prevSiblingHeight + dy) * 100) /
            resizer.parentNode.getBoundingClientRect().height;
        prevSibling.style.height = `${h}%`;
    };

    const mouseUpHandler = function () {
        resizer.style.removeProperty("cursor");
        document.body.style.removeProperty("cursor");

        topSide.style.removeProperty("user-select");
        topSide.style.removeProperty("pointer-events");

        bottomSide.style.removeProperty("user-select");
        bottomSide.style.removeProperty("pointer-events");

        // Remove the handlers of `mousemove` and `mouseup`
        document.removeEventListener("mousemove", mouseMoveHandler);
        document.removeEventListener("mouseup", mouseUpHandler);
    };

    // Attach the handler
    resizer.addEventListener("mousedown", mouseDownHandler);
}

// https://stackoverflow.com/questions/14226803/wait-5-seconds-before-executing-next-line
const delay = (ms) => new Promise((res) => setTimeout(res, ms));


/////////////////////
export { msg, htmlMsg, adjustRows, errMsg, workingUpdate, usingHttps, LoadingModal,
    getStoredAccountId, setStoredAccountId, toast, switchToHttps, messageModal, 
    processUrlHash, storageGet, storageSet, ButtonOnChange, settingsGet, settingsSet,
    userPictureAccountBrand, checkAccountSettings, monitorSigningHeight, getPhoneNumber,
};
