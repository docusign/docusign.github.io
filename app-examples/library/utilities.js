// Copyright © 2022 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

// Local storage account key
const DSexampleAccountId = "DSCodePenAccountId";

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

function storageGet(name) {
    let response = null;
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

function toast (msg) {
    Toastify({ // https://github.com/apvarun/toastify-js/blob/master/README.md
        text: msg,
        duration: 5000,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "center", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
          background: "linear-gradient(to right, #00b09b, #96c93d)",
        },
      }).showToast();
}

function messageModal(title, msg) {
    $("#messageModal .modal-title").text(title);
    $("#messageModal .modal-body").html(msg);
    const modal = new bootstrap.Modal('#messageModal');
    modal.show();
}

/***
 * processUrlHash 
 * Arg: qp
 * If the hash includes the qp then return the hash as an object and
 * clear the hash
 */
function processUrlHash(qp) {
    let hash = location.hash && location.hash.substring(1); // remove the #
    if (!hash.length || hash.indexOf(qp) === -1) {return} // EARLY RETURN (Nothing to see here!)

    let search = location.search && location.search.substring(1); // rm ?
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
    delayedHide(msg, timeoutSec=3) {
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
        
        // prevent action when the model button is clicked
        $(`#${this.buttonId}`).click(e => e.preventDefault());
        // handlers for modifying the button's UX
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
        const val = $(event.target).val();

        if (targetInfo[1] === "text") {
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

/////////////////////
export { msg, htmlMsg, adjustRows, errMsg, workingUpdate, usingHttps, LoadingModal,
    getStoredAccountId, setStoredAccountId, toast, switchToHttps, messageModal, 
    processUrlHash, storageGet, storageSet, ButtonOnChange};
