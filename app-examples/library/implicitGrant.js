// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
// Set basic variables
const oAuthServiceProviderProd = "https://account.docusign.com"; // prod
const oAuthServiceProviderDemo = "https://account-d.docusign.com"; 
const oAuthServiceProviderStage = "https://account-s.docusign.com"; 
const implicitGrantPath = "/oauth/auth";
// Client IDs are NOT secrets. See
// https://www.rfc-editor.org/rfc/rfc6749.html#section-2.2
const oAuthClientIDdemo = "f399b5fa-1807-4cc2-8498-2fba58d14759"; // demo -- Larry corp account
//const oAuthClientIDdemo = "2e105c2b-bcc3-47eb-8420-2221f1fb0fb6"; // ISV v2.1 account
const oAuthClientIDstage = "66e5a6d0-aa3a-4a81-b31a-42163d9877e1"; //"75db0d4b-a09f-47c0-af54-8d533dd59ea5"; // "00bd4cc7-6852-4d6d-a56d-8b006695dc9a"; // ; // stage
const oAuthClientIDprod = ""; // prod
const oAuthScopes = "signature cors";
const IMPLICIT_NONCE = "Implicit OAuth Nonce"
const logLevel = 0; // 0 is terse; 9 is verbose

/*
 * CLASS ImplicitGrant
 * ImplicitGrant handles the functionality of the implicit grant flow
 *
 * It opens, then later closes, a new browser tab.
 * The client app must call handleMessage when the window receives a message event
 *
 * args -- an object containing attributes:
 *   showMsg -- function to show a msg to the human
 *   clientId -- "prod", "demo" (default), "stage", or the actual clientId
 *   oAuthServiceProvider -- only used if clientId is the actual clientId
 *   oAuthReturnUrl -- url for the app itself 
 *
 * public values
 *   .accessToken -- the access_token or null
 *   .accessTokenExpires -- a Date object or null
 *   .oAuthClientID
 */
class ImplicitGrant {
    constructor(args) {
        // set ClientId
        if (args.clientId) {
            if (args.clientId === "prod") {
                this.oAuthServiceProvider = oAuthServiceProviderProd;
                this.oAuthClientID = oAuthClientIDprod
            } else if (args.clientId === "demo") {
                this.oAuthServiceProvider = oAuthServiceProviderDemo;
                this.oAuthClientID = oAuthClientIDdemo
            } else if (args.clientId === "stage") {
                this.oAuthServiceProvider = oAuthServiceProviderStage;
                this.oAuthClientID = oAuthClientIDstage
            } else {
                this.oAuthServiceProvider = args.oauthServiceProvider;
                this.oAuthClientID = args.clientId
            }
        }
        this.oAuthReturnUrl = args.oAuthReturnUrl;
        this.showMsg = args.showMsg;

        // public variables
        this.accessToken = null;
        this.accessTokenExpires = null;

        // internal
        this._loginWindow = null;
        this._nonce = null;

        // check the page URL to see if we have the OAuth response
        this.oauthResponse()
    }

    /*
     * Start the login process in the current browser tab
     */
    login() {
        // Get a random nonce to use with OAuth call
        // See https://oauth.net/articles/authentication/#access-token-injection
        this._nonce = this.generateCodeVerifier();
        this.storeNonce()
        const url =
            `${this.oAuthServiceProvider}${implicitGrantPath}` +
            `?response_type=token` +
            `&scope=${oAuthScopes}` +
            `&client_id=${this.oAuthClientID}` +
            `&redirect_uri=${this.oAuthReturnUrl}` +
            `&state=${this._nonce}`;
        location.href = url; // In the current tab, goto the OAuth URL 
    }

    /**
     * return codeVerifier -- a secret
     * 43 - 128 bytes
     * Characters English letters A-Z or a-z, Numbers 0-9, Symbols “-”, “.”, “_” or “~”.
     * Note that this solution can return varying string lengths
     * See https://crypto.stackexchange.com/q/109579/8680 
     */
    generateCodeVerifier() {
        const len = 128;
        const array = new Uint32Array( len / 8);
        window.crypto.getRandomValues(array);
        return Array.from(array, x => x.toString(16)).join("");
    }

    /**
     * storeNonce -- stores the nonce in the browser's storage 
     */
    storeNonce() {
        try {
            localStorage.setItem(IMPLICIT_NONCE, this._nonce)
        } catch {};
    }
    /**
     * storeNonce -- stores the nonce in the browser's storage 
     */
    getNonce() {
        this._nonce = null;
        try {
            this._nonce = localStorage.getItem(IMPLICIT_NONCE)
        } catch {};
    }

    /*
     * oauthResponse checks and processes the page's hash
     */
    oauthResponse() {
        const hash = location.hash.substring(1); // remove the #
        if (!hash.length) {return} // EARLY RETURN (Nothing to see here!)
        window.history.pushState("", "", `${location.origin}${location.pathname}`);
        const items = hash.split(/\=|\&/);
        let i = 0;
        let response = {};
        while (i + 1 < items.length) {
            response[items[i]] = items[i + 1];
            i += 2;
        }
        const newState = response.state;
        this.getNonce()
        if (newState !== this._nonce) {
            console.error({incoming_nonce: newState, stored_nonce: this._nonce});
            this.showMsg("OAuth problem: Bad state response. Possible attacker!?!");
        }
        this.accessToken = response.access_token;
        this.accessTokenExpires = new Date(
            Date.now() + response.expires_in * 1000
        );
    }

    logout() {
        this.accessToken = null;
        this.accessTokenExpires = null;
    }

    /* Will the access token will expire in the next 15 minutes ? */
    checkToken() {
        const bufferTime = 15 * 60 * 1000;
        const ok =
            this.accessToken &&
            this.accessTokenExpires &&
            Date.now() + bufferTime < this.accessTokenExpires.getTime();
        return ok;
    }
}

export { ImplicitGrant };
