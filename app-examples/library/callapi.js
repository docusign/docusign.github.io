// Copyright © 2022 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
// Set basic variables
const oAuthServiceProviderProd = "https://account.docusign.com"; // prod
const oAuthServiceProviderDemo = "https://account-d.docusign.com"; 
const oAuthServiceProviderStage = "https://account-s.docusign.com"; 
let oAuthServiceProvider = oAuthServiceProviderDemo; // prod
const implicitGrantPath = "/oauth/auth";
const userInfoPath = "/oauth/userinfo";
// Client IDs are NOT secrets. See
// https://www.rfc-editor.org/rfc/rfc6749.html#section-2.2
const oAuthClientIDdemo = "f399b5fa-1807-4cc2-8498-2fba58d14759"; // demo
const oAuthClientIDstage = "75db0d4b-a09f-47c0-af54-8d533dd59ea5"; // stage
const oAuthClientIDprod = "8dd0204d-d969-4097-b121-f4bc77b81a44"; // prod
let oAuthClientID = oAuthClientIDdemo;
const oAuthScopes = "signature cors";
const eSignBase = "/restapi/v2.1";
const oAuthReturnUrl =
    "https://docusign.github.io/jsfiddleImplicitGrantReturn.html";
const logLevel = 0; // 0 is terse; 9 is verbose

/*
 * CLASS ImplicitGrant
 * ImplicitGrant handles the functionality of the implicit grant flow
 *
 * It opens, then later closes, a new browser tab.
 * The client app must call handleMessage when the window receives a message event
 *
 * args -- an object containing attributes:
 *   workingUpdateF -- function called when working state changes
 *   oAuthServiceProvider;
 *   clientId -- "prod", "demo" (default), "stage", or the actual clientId
 *
 * public values
 *   .errMsg -- null or contains the error information
 *   .working -- is the implicit grant flow in process?
 *   .accessToken -- the access_token or null
 *   .accessTokenExpires -- a Date object or null
 */
class ImplicitGrant {
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
            } else {
                oAuthServiceProvider = args.oauthServiceProvider;
                oAuthClientID = args.clientId
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

/*
 * UserInfo fetches the authenticated person's user information
 *
 * args -- an object containing attributes:
 *   accessToken
 *   workingUpdateF -- function called when working state changes
 *
 * public values
 *   .working -- is the fetch in process?
 *   .errMsg -- null or contains the error information
 *   .name
 *   .userId
 *   .email
 *   .defaultAccount
 *   .defaultAccountName
 *   .defaultBaseUrl -- including eSign path
 *   .defaultAccountIndex -- the index for default accounts entry
 *   .accounts -- an array of objects with attributes:
 *      .accountId
 *      .accountExternalId 
 *      .accountName
 *      .accountIsDefault (default from the account server)
 *      .accountBaseUrl -- including eSign path
 *      .corsError -- true if the externalId lookup failed with a cors error
 *
 *   .userInfoResponse -- the complete response
 *
 */
class UserInfo {
    constructor(args) {
        if (args.platform) {
            if (args.platform === "prod") {
                oAuthServiceProvider = oAuthServiceProviderProd;
                oAuthClientID = oAuthClientIDprod
            } else if (args.platform === "demo") {
                oAuthServiceProvider = oAuthServiceProviderDemo;
                oAuthClientID = oAuthClientIDdemo
            } else if (args.platform === "stage") {
                oAuthServiceProvider = oAuthServiceProviderStage;
                oAuthClientID = oAuthClientIDstage
            }
        }
        this.accessToken = args.accessToken;
        this.workingUpdateF = args.workingUpdateF || null;
        this.onlyCheckDefaultAccount = args.onlyCheckDefaultAccount; // cors check 
        this.oAuthServiceProvider = oAuthServiceProvider;
        this.userInfoPath = userInfoPath;
        this.eSignBase = eSignBase;
    
        // public variables
        this.working = false;
        this.errMsg = null;
        this.name = null;
        this.userId = null;
        this.email = null;
        this.defaultAccount = null;
        this.defaultAccountName = null;
        this.defaultBaseUrl = null;
        this.userInfoResponse = null;
        this.accounts = [];
    }

    // returns true for success, false for a problem (see .errMsg)
    async getUserInfo() {
        this.working = true;
        if (this.workingUpdateF) {
            this.workingUpdateF(this.working);
        }

        let userInfoResponse;
        try {
            userInfoResponse = await this.fetchUserInfo();
        } catch (e) {
            this.errMsg =
                `Problem while completing login. ` +
                `Error: ${e.toString()}. Please repeat your login.`;
            this.working = false;
            if (this.workingUpdateF) {
                this.workingUpdateF(this.working);
            }
            return false;
        }
        if (!userInfoResponse || !userInfoResponse.ok) {
            this.errMsg =
                `Problem while completing login. ` +
                `Error:${userInfoResponse.statusText} Please repeat your login.`;
            this.working = false;
            if (this.workingUpdateF) {
                this.workingUpdateF(this.working);
            }
            return false;
        }

        const userInfo = await userInfoResponse.json();
        this.userInfoResponse = userInfo;
        this.name = userInfo.name;
        this.userId = userInfo.sub;
        this.email = userInfo.email;
        this.accounts = userInfo.accounts.map(a => 
            ({
                accountId: a.account_id,
                accountExternalId: null,
                accountName: a.account_name,
                accountIsDefault: a.is_default,
                accountBaseUrl: a.base_uri + this.eSignBase,
                corsError: false
            }))
        await this.fetchExternalAccountIds();
        this.accounts.forEach((a, i) => {
            if (a.accountIsDefault) {
                this.defaultAccountIndex = i    
            }
        });
        this.defaultAccount = this.accounts[this.defaultAccountIndex].accountId;
        this.defaultAccountName = this.accounts[this.defaultAccountIndex].accountName;
        this.defaultBaseUrl = this.accounts[this.defaultAccountIndex].accountBaseUrl;
        if (this.accounts[this.defaultAccountIndex].corsError) {
            this.errMsg =
            `Problem while completing login. Check the CORS configuration for account ` +
            `${this.defaultAccountName} (${this.defaultAccount}) ` +
            `Error: ${this.accounts[this.defaultAccountIndex].corsError}`;
            this.working = false;
            if (this.workingUpdateF) {
                this.workingUpdateF(this.working);
            }
            return false;
        }

        this.working = false;
        if (this.workingUpdateF) {
            this.workingUpdateF(this.working);
        }
        return true;
    }
    
    /*
     * fetchExternalAccountIds
     * If an account doesn't support CORS from this client ID, then the external
     * account lookup will fail.
     *
     * External account IDs are used in the Switch Account modal. 
     */
    async fetchExternalAccountIds() {
        for (const account of this.accounts) {
            if (this.onlyCheckDefaultAccount && !account.accountIsDefault) {continue}
            try {
                const url = `${account.accountBaseUrl}/accounts/${account.accountId}`;
                const response = await fetch(url,
                        {mode: 'cors',
                        method: 'GET',
                        headers: new Headers({
                            Authorization: `Bearer ${this.accessToken}`,
                            Accept: `application/json`,
                            "X-DocuSign-SDK": "CodePen"}) 
                        });
                const data = response && await response.json();
                if (response.ok) {
                    account.accountExternalId = data.externalAccountId
                } else {
                    account.corsError = `${data.errorCode}; ${data.message}`
                }
            } catch (e) {
                account.corsError = e instanceof TypeError
            }
        }
    }

    /*
     * CORS request to userInfo API method
     */
    async fetchUserInfo() {
        return fetch(`${this.oAuthServiceProvider}${this.userInfoPath}`, {
            mode: "cors",
            headers: new Headers({
                Authorization: `Bearer ${this.accessToken}`,
                Accept: `application/json`,
                "X-DocuSign-SDK": "CodePen"
            })
        });
    }
}

/*
 * CallApi includes helper functions for calling the API
 *
 * constructor args -- an object containing attributes:
 *   accessToken
 *   apiBaseUrl 
 *
 * public values
 *   .errMsg -- null or contains the error information
 */
class CallApi {
    constructor(args) {
        this.accessToken = args.accessToken;
        this.apiBaseUrl = args.apiBaseUrl;

        // public variables
        this.errMsg = null;
    }

    /*
     * Makes an eSign API call with JSON request and results
     * 
     * apiMethod -- the API endpoint but without the server nor
     *     "/restapi/v2.1" parts of the URL
     * httpMethod -- GET / POST / PUT / DELETE
     * req -- object that will be stringified and sent as the request body
     * qp -- array of two element arrays. Eg [ ['n1', 'val1'], ['n2', 'val2'] ]. See
     * https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams 
     */
    async callApiJson({ apiMethod, httpMethod, req, qp, headers = []}) {
        let body = null;
        this.errMsg = "";
        if (httpMethod === "POST" || httpMethod === "PUT") {
            body = JSON.stringify(req, null, 4);
        }

        try {
            let headersReq = {
                Accept: `application/json`,
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
                "X-DocuSign-SDK": "CodePen v2"
            }
            headers.forEach (header => {headersReq[header.h] = header.v})

            let url = `${this.apiBaseUrl}${apiMethod}`;
            if (qp) {
                url += '?' + new URLSearchParams(qp);
            }
            let results = await fetch(url, {
                method: httpMethod,
                mode: "cors",
                headers: new Headers(headersReq),
                body: body
            });
            if (results && results.ok) {                
                return await results.json();
            } else {
                const res = await results.text();
                this.errMsg =
                    `Problem while making API call. ` +
                    `Error: ${results ? results.statusText : "no response"}.` +
                    res;
                return false;
            }
        } catch (e) {
            this.errMsg =
                `Problem while making API call. ` + `Error: ${e.toString()}.`;
            return false;
        }
    }

    /*
     * GET an image and return it as a dataUrl.
     */
    async getImageDataUrl(apiMethod) {
        try {
            let url = `${this.apiBaseUrl}${apiMethod}`;
            let headersReq = {
                Accept: `application/json`,
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
                "X-DocuSign-SDK": "CodePen v2",
                Accept: `*/*`
            }

            let results = await fetch(url, {
                mode: "cors",
                headers: new Headers(headersReq)
            });
            if (results && results.ok) {
                const image = await results.blob().then(this.blobToDataUrl);
                return image;
            } else {
                this.errMsg = 
                    `Problem while making API call. ` +
                        `Error: ${results ? results.statusText : "no response"}`;
                return false;
            }
        } catch (e) {
            this.errMsg = 
                `Problem while making API call. ` + `Error: ${e.toString()}.`;
            return false;
        }
    }

    /*
     * GET a document from a CORS source and return it as a string
     * with BASE64 encoding.
     */
    async getDocB64(docUrl) {
        try {
            let results = await fetch(docUrl, {
                mode: "cors",
                headers: new Headers({
                    Accept: `*/*`
                })
            });
            if (results && results.ok) {
                const doc = await results.blob().then(this.blobToBase64);
                return doc;
            } else {
                this.errMsg = 
                    `Problem while making API call. ` +
                        `Error: ${results ? results.statusText : "no response"}`;
                return false;
            }
        } catch (e) {
            this.errMsg = 
                `Problem while making API call. ` + `Error: ${e.toString()}.`;
            return false;
        }
    }
    
    /*
     * GET a non-binary document from a CORS source and return it as a string.
     */
    async getDoc(docUrl) {
        try {
            let results = await fetch(docUrl, {
                mode: "cors",
                headers: new Headers({
                    Accept: `*/*`
                })
            });
            if (results && results.ok) {
                const doc = await results.text();
                return doc;
            } else {
                this.errMsg = 
                    `Problem while making API call. ` +
                        `Error: ${results ? results.statusText : "no response"}`;
                return false;
            }
        } catch (e) {
            this.errMsg = 
                `Problem while making API call. ` + `Error: ${e.toString()}.`;
            return false;
        }
    }

    /*
     * https://stackoverflow.com/a/61226119/64904
     * Create a data URL, then strip the extra stuff to leave just
     * the content with BASE64 encoding
     */
    async blobToBase64(blob) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        return new Promise((resolve) => {
            reader.onloadend = () => {
                resolve(reader.result.split(",")[1]);
            };
        });
    }    

    async blobToDataUrl(blob) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        return new Promise((resolve) => {
            reader.onloadend = () => {
                resolve(reader.result);
            };
        });
    }    
}

export { CallApi, ImplicitGrant, UserInfo };
