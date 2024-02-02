// Copyright © 2022 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
// Set basic variables
const oAuthServiceProviderProd = "https://account.docusign.com"; // prod
const oAuthServiceProviderDemo = "https://account-d.docusign.com"; 
const oAuthServiceProviderStage = "https://account-s.docusign.com"; 
let oAuthServiceProvider = oAuthServiceProviderProd; // prod
const implicitGrantPath = "/oauth/auth";
const userInfoPath = "/oauth/userinfo";
// Client IDs are NOT secrets. See
// https://www.rfc-editor.org/rfc/rfc6749.html#section-2.2
const oAuthClientIDdemo = "f399b5fa-1807-4cc2-8498-2fba58d14759"; // demo
const oAuthClientIDstage = "75db0d4b-a09f-47c0-af54-8d533dd59ea5"; // stage
const oAuthClientIDprod = "8dd0204d-d969-4097-b121-f4bc77b81a44"; // prod
let oAuthClientID = oAuthClientIDprod;
const oAuthScopes = "signature cors";
const eSignBase = "/restapi/v2.1";
const oAuthReturnUrl =
    "https://docusign.github.io/jsfiddleImplicitGrantReturn.html";
const logLevel = 0; // 0 is terse; 9 is verbose

/*
 * CLASS AuthCodePkce
 * AuthCodePkce handles the functionality of the implicit grant flow
 *
 * It opens, then later closes, a new browser tab.
 * The client app must call handleMessage when the window receives a message event
 *
 * args -- an object containing attributes:
 *   workingUpdateF -- function called when working state changes
 *
 * public values
 *   .errMsg -- null or contains the error information
 *   .working -- is the implicit grant flow in process?
 *   .accessToken -- the access_token or null
 *   .accessTokenExpires -- a Date object or null
 */
class AuthCodePkce {
    constructor(args) {
        // set ClientId
        if (args.clientId) {
            if (args.clientId === "prod") {
                oAuthServiceProvider = oAuthServiceProviderProd;
                oAuthClientID = oAuthClientIDprod
            } else if (args.clientId === "demo") {
                oAuthServiceProvider = oAuthServiceProviderDemo;
                oAuthClientID = oAuthClientIDdemo
            } else if (args.clientId === "stage") {
                oAuthServiceProvider = oAuthServiceProviderStage;
                oAuthClientID = oAuthClientIDstage
            }
        }

        this.oAuthServiceProvider = oAuthServiceProvider;
        this.implicitGrantPath = implicitGrantPath;
        this.oAuthClientID = oAuthClientID;
        this.oAuthScopes = oAuthScopes;
        this.oAuthReturnUrl = oAuthReturnUrl;
        this.workingUpdateF = args.workingUpdateF || null;

        // public variables
        this.working = false;
        this.accessToken = null;
        this.accessTokenExpires = null;
        this.errMsg = null;

        // internal
        this._loginWindow = null;
        this._nonce = null;
    }

    /*
     * Start the login process in a new browser tab
     */
    async login() {
        this.working = true;
        this.errMsg = null;
        if (this.workingUpdateF) {
            this.workingUpdateF(this.working);
        }

        // Get a random nonce to use with OAuth call
        // See https://oauth.net/articles/authentication/#access-token-injection
        // Using https://www.random.org/clients/http/
        this._nonce = Date.now(); // default nounce
        this._nonce = (await this.randomNounce()) || this._nonce;
        const url =
            `${this.oAuthServiceProvider}${this.implicitGrantPath}` +
            `?response_type=token` +
            `&scope=${this.oAuthScopes}` +
            `&client_id=${this.oAuthClientID}` +
            `&redirect_uri=${this.oAuthReturnUrl}` +
            `&state=${this._nonce}`;
        this._loginWindow = window.open(url, "_blank");
        const newTab = this._loginWindow;
        if (!newTab || newTab.closed || typeof newTab.closed=='undefined') {
            // POPUP BLOCKED
            alert ("Please enable the popup login window. Then reload this page.")
        }
        this._loginWindow.focus();
    }

    /*
     * Obtain a random value from random.org
     */
    async randomNounce() {
        try {
            const url =
                "https://www.random.org/strings/?num=1&len=20&digits=on&upperalpha=on&loweralpha=on&unique=on&format=plain&rnd=new";
            let results = await fetch(url, {
                mode: "cors",
                headers: new Headers({
                    Accept: `text/html`
                })
            });
            if (results && results.ok) {
                // remove the last character, a CR
                return (await results.text()).slice(0, -1);
            }
        } catch (e) {}
        return false;
    }

    /*
     * handleMessage processes the incoming response message
     * from the Authorization Service Provider
     */
    handleMessage(data) {
        if (!data || data.source !== "oauthResponse") {
            return "skip";
        }
        // OAuth response
        if (this._loginWindow) {
            this._loginWindow.close(); // close the browser tab used for OAuth
        }
        const hash = data.hash.substring(1); // remove the #
        const items = hash.split(/\=|\&/);
        let i = 0;
        let response = {};
        while (i + 1 < items.length) {
            response[items[i]] = items[i + 1];
            i += 2;
        }
        const newState = response.state;
        if (newState !== this._nonce) {
            this.errMsg = "Bad state response. Possible attacker!?!";
            this.working = false;
            if (this.workingUpdateF) {
                this.workingUpdateF(this.working);
            }
            return "error";
        }
        this.accessToken = response.access_token;
        this.accessTokenExpires = new Date(
            Date.now() + response.expires_in * 1000
        );
        // done!
        this.working = false;
        if (this.workingUpdateF) {
            this.workingUpdateF(this.working);
        }
        return "ok";
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

export { AuthCodePkce };
