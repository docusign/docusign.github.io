// Copyright © 2022 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
// Set basic variables
const oAuthServiceProviderProd = "https://account.docusign.com"; // prod
const oAuthServiceProviderDemo = "https://account-d.docusign.com"; 
const oAuthServiceProviderStage = "https://account-s.docusign.com"; 
const authPath = "/oauth/auth";
const userInfoPath = "/oauth/userinfo";
// Client IDs are NOT secrets. See
// https://www.rfc-editor.org/rfc/rfc6749.html#section-2.2
const oAuthClientIDdemo = ""; // demo
const oAuthClientIDstage = "ec5769e4-ec17-494c-98a7-bcc0a289e214"; // stage
const oAuthClientIDprod = ""; // prod

const oAuthScopes = "signature cors";
const eSignBase = "/restapi/v2.1";
const oAuthReturnUrl =
    "https://docusign.github.io/jsfiddleImplicitGrantReturn.html";
const logLevel = 0; // 0 is terse; 9 is verbose

/*
 * CLASS AuthCodePkce
 * AuthCodePkce handles the functionality of the 
 * authentication code grant flow with PKCE without a secret
 * -- for public clients
 *
 * It opens, then later closes, a new browser tab.
 * The client app must call handleMessage when the window receives a message event
 * 
 * Constructor
 *   args -- an object containing attributes:
 *   workingUpdateF -- function called when working state changes
 *   platform === "stage", "demo", or "prod" -- selects the DocuSign platform
 *
 * public values
 *   .oAuthClientID
 *   .oAuthScopes
 *   .platform
 *   .errMsg -- null or contains the error information
 *   .working -- is the grant flow in process?
 *   .accessToken -- the access_token or null
 *   .accessTokenExpires -- a Date object or null
 *   .refreshToken
 */
class AuthCodePkce {
    /**
     * See https://jackhenry.dev/open-api-docs/authentication-framework/overview/pkce/
     *  
     */
    constructor(args) {
        // set platform
        if (args.platform) {
            if (args.platform === "prod") {
                this.oAuthServiceProvider = oAuthServiceProviderProd;
                this.oAuthClientID = oAuthClientIDprod
            } else if (args.platform === "demo") {
                this.oAuthServiceProvider = oAuthServiceProviderDemo;
                this.oAuthClientID = oAuthClientIDdemo
            } else if (args.platform === "stage") {
                this.oAuthServiceProvider = oAuthServiceProviderStage;
                this.oAuthClientID = oAuthClientIDstage
            }
        }

        this.authPath = authPath;
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

        await this.createCodeVerifierChallenge();

        // Get a random nonce to use with OAuth call
        // See https://oauth.net/articles/authentication/#access-token-injection
        // Using https://www.random.org/clients/http/
        this._nonce = Date.now(); // default nounce
        this._nonce = (await this.randomNounce()) || this._nonce;
        const url =
            `${this.oAuthServiceProvider}${this.authPath}` +
            `?response_type=code` +
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

    /**
     * Create 
     * this.codeVerifier -- a secret
     * this.codeChallenge -- SHA256(this.CodeVerifier)
     * See https://stackoverflow.com/a/63336562/64904
     */
    async createCodeVerifierChallenge() {
        this.codeVerifier = this.generateCodeVerifier();
        
        function sha256(plain) {
            // returns promise ArrayBuffer
            const encoder = new TextEncoder();
            const data = encoder.encode(plain);
            return window.crypto.subtle.digest("SHA-256", data);
        }
          
        function base64urlencode(a) {
            let str = "";
            let bytes = new Uint8Array(a);
            let len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              str += String.fromCharCode(bytes[i]);
            }
            return btoa(str)
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, "");
        }
          
        const hashed = await sha256(this.codeVerifier);
        this.codeChallenge = base64urlencode(hashed);
        // Check the code verifier and challenge here:
        // https://example-app.com/pkce
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

      

}

export { AuthCodePkce };
