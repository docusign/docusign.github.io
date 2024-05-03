// Copyright © 2022 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
// Set basic variables
const oAuthServiceProviderProd = "https://account.docusign.com"; // prod
const oAuthServiceProviderDemo = "https://account-d.docusign.com"; 
const oAuthServiceProviderStage = "https://account-s.docusign.com"; 
const authPath = "/oauth/auth";
const tokenPath = "/oauth/token";
// Client IDs are NOT secrets. See
// https://www.rfc-editor.org/rfc/rfc6749.html#section-2.2
const oAuthClientIDdemo = ""; // demo
const oAuthClientIDstage = "ec5769e4-ec17-494c-98a7-bcc0a289e214"; // stage
const oAuthClientIDprod = ""; // prod

const oAuthScopes = "signature cors";
const oAuthReturnUrl =
    "https://docusign.github.io/authGrantReturn.html";
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
        this.tokenPath = tokenPath;
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

        // Make a random nonce to use with OAuth call
        this._nonce = this.generateCodeVerifier()

        const url =
            `${this.oAuthServiceProvider}${this.authPath}` +
            `?response_type=code` +
            `&scope=${this.oAuthScopes}` +
            `&client_id=${this.oAuthClientID}` +
            `&code_challenge=${this.codeChallenge}` +
            `&code_challenge_method=S256` +
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
     * handleMessage processes the incoming response message
     * from the Authorization Service Provider
     */
    async handleMessage(data) {               
        if (!data || data.source !== "oauthResponse") {
            return "skip";
        }
        // OAuth response
        if (this._loginWindow) {
            this._loginWindow.close(); // close the browser tab used for OAuth
        }
        const queryString = data.search;
        if (!queryString) {
            this.err ("Bad OAuth response");
            return ("error");
        }
        const params = new URLSearchParams(queryString);
        const code = params.get("code"); // the authorization code
        const state = params.get("state"); // the returned state
        if (!code) {
            this.err ("Bad OAuth response");
            return ("error");
        }
        if (state !== this._nonce) {
            this.err ("Bad state response. Possible attacker!?!");
            return "error";
        }

        // exchange the authorization code for the access token
        // https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3

        // Token exchange example response:
        /**
         *  {
            "access_token":"eyJ0eX...6-tOlc8jCM9OSY_rTpW5wyQ3N2rWEcBuAG9GRpn0raO6rGI9H0-ZYYag",
            "token_type":"Bearer",
            "refresh_token":"eyJ0eX...AiOiJNVCIsImFsZyI6I85lJTMjU2IpWhA4yEosLcVg64WI0JRwWI5Rw",
            "expires_in":28800,
            "scope":"signature cors"
            }
        */ 

        let returnStatus;
        try {
            const formData = new FormData();
            formData.append('grant_type', 'authorization_code');
            formData.append('code', code);
            formData.append('client_id', this.oAuthClientID);
            formData.append('code_verifier', this.codeVerifier);
            const url = `${this.oAuthServiceProvider}${this.tokenPath}`;
            const rawResponse = await fetch(url,
                    {mode: 'cors',
                    method: 'POST',
                    headers: new Headers({"X-DocuSign-SDK": "CodePen"}), 
                    body: formData
                    });
            const response = rawResponse && rawResponse.ok && await rawResponse.json();
            if (response) {
                this.accessToken = response.access_token;
                this.refreshToken = response.refresh_token;
                this.accessTokenExpires = new Date(
                    Date.now() + response.expires_in * 1000
                );
                console.log (`\n\n#### Access Token expiration: ${response.expires_in / 60 / 60} hours`);
                console.log (`\n\n#### Access Token expiration datetime: ${this.accessTokenExpires}`);
                returnStatus = "ok";    
            } else {
                returnStatus = "error";
                this.err ("Could not exchange code for tokens");
            }
            // done!
        } catch (e) {
            this.err ("Bad OAuth response");
            returnStatus = "error";
        } finally {
            this.working = false;
            if (this.workingUpdateF) {
                this.workingUpdateF(this.working);
            }
            return returnStatus;
        }
    }

    err (msg) {
        this.errMsg = msg;
        this.working = false;
        if (this.workingUpdateF) {
            this.workingUpdateF(this.working);
        }
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
        
        async function sha256(plain) {
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
