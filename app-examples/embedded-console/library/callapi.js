// Copyright © 2022 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

import {
    storageGet, 
    storageSet,
} from "./utilities.js" 


// Set basic variables
const oAuthServiceProviderProd = "https://account.docusign.com"; // prod
const oAuthServiceProviderDemo = "https://account-d.docusign.com"; 
const oAuthServiceProviderStage = "https://account-s.docusign.com"; 
let oAuthServiceProvider = oAuthServiceProviderDemo; // prod
const userInfoPath = "/oauth/userinfo";
const eSignBase = "/restapi/v2.1";

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
            } else if (args.platform === "demo") {
                oAuthServiceProvider = oAuthServiceProviderDemo;
            } else if (args.platform === "stage") {
                oAuthServiceProvider = oAuthServiceProviderStage;
            }
        }
        this.accessToken = args.accessToken;
        this.workingUpdateF = args.workingUpdateF || null;
        this.loadingMessageShow = args.loadingMessageShow || (msg => {});
        this.oAuthServiceProvider = oAuthServiceProvider;
        this.userInfoPath = userInfoPath;
        this.eSignBase = eSignBase;

        // constants
        this.USE_ACCOUNT_CACHE = true;
    
        // public variables
        this.working = false;
        this.errMsg = null;
        this.corsErr = null; // Cors error with the account
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
        this.errMsg = null;
        this.corsErr = false;
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
        let foundDefault = false;
        this.accounts.forEach((a, i) => {
            if (a.accountIsDefault) {
                this.defaultAccountIndex = i
                foundDefault = true;    
            }
        });
        if (!foundDefault) {
            // No default account! This should never happen, but it does.
            // Use the first account as the default
            this.defaultAccountIndex = 0;
        }
        this.defaultAccount = this.accounts[this.defaultAccountIndex].accountId;
        this.defaultAccountName = this.accounts[this.defaultAccountIndex].accountName;
        this.defaultBaseUrl = this.accounts[this.defaultAccountIndex].accountBaseUrl;
        if (this.accounts[this.defaultAccountIndex].corsError) {
            this.corsErr = true;
            this.errMsg =
            `<p>Problem while completing login. Check the CORS configuration for account ` +
            `${this.defaultAccountName} (${this.defaultAccount})</p><p>` +
            `Error: ${this.accounts[this.defaultAccountIndex].corsError}</p>`;
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
        let i = this.accounts.length;
        this.loadingMessageShow(`Loading ${i} account ${i > 1 ? "details" : "detail"}`);
        for (const account of this.accounts) {
            // We need all account info to populate the change account options
            await this.checkAccount(account);
            i -= 1;
        }
    }

    async checkAccount (account) {
        const accountKey = `account_${account.accountId}`;
        if (this.USE_ACCOUNT_CACHE) {
            const cacheResult = storageGet(accountKey);
            if (cacheResult) {
                account.accountExternalId = cacheResult.externalAccountId;
                return
            }
        }
        try {
            const url = `${account.accountBaseUrl}/accounts/${account.accountId}`;
            const response = await fetch(url,
                    {mode: 'cors',
                    method: 'GET',
                    headers: new Headers({
                        Authorization: `Bearer ${this.accessToken}`,
                        Accept: `application/json`,
                        "X-DocuSign-SDK": "Template Editor"}) 
                    });
            const data = response && await response.json();
            if (response.ok) {
                account.accountExternalId = data.externalAccountId
                if (this.USE_ACCOUNT_CACHE) {
                    storageSet(accountKey, {externalAccountId: data.externalAccountId});
                }
            } else {
                account.corsError = `${data.errorCode}; ${data.message}`
            }
        } catch (e) {
            account.corsError = e instanceof TypeError
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
                "X-DocuSign-SDK": "Template Editor"
            })
        });
    }

    /***
     * accountsEntry(accountId)
     */
    accountsEntry(accountId) {
        return this.accounts.find(a => a.accountId === accountId)
    }

    /***
     * accountName(accountId)
     */
    accountName(accountId) {
        const account = this.accounts.find(a => a.accountId === accountId);
        return account ? account.accountName : `${accountId} not found!`;
    }

    /***
     * addAccountOptions(elId)
     * Adds option elements to the select element for switching accounts
     */
    addAccountOptions(elId) {
        let html = "";
        for (const account of this.accounts) {
            html += `\n<option value="${account.accountId}">${account.accountName}${account.accountIsDefault ? " (default)":""}`;
            html += ` ${account.accountExternalId}</option>`
        }
        $(`#${elId}`).append(html);
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
     * req -- a JSON object string that will be stringified and sent as the request body
     * 
     * qp -- array of two element arrays. Eg [ ['n1', 'val1'], ['n2', 'val2'] ]. See
     * https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams
     * 
     * headers array of objects: h (header_name) and v (value).
     * Eg [{h: "Content-Type", v: contentTypeValue}]
     * 
     * body -- the body to be used. Eg a buffer If supplied, req is ignored.
     */
    async callApiJson({ apiMethod, httpMethod, req, qp, headers = [], body}) {
        this.errMsg = "";
        if (httpMethod === "POST" || httpMethod === "PUT") {
            if (!body) {
                // JSON object
                body = JSON.stringify(req, null, 4);
            }
        }

        try {
            let headersReq = {
                Accept: `application/json`,
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
                "X-DocuSign-SDK": "Template Editor"
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
                "X-DocuSign-SDK": "Template Editor",
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
    
    /***
     * splice together array of arrayBuffers
     * https://stackoverflow.com/a/78490330/64904
     */
    spliceBuffers(buffers) {
        const len = buffers.map(
            (buffer) => buffer.byteLength).reduce(
                (prevLength, curr) => {return prevLength + curr}, 0);
        const tmp = new Uint8Array(len);
        let bufferOffset = 0;
        for (let i=0; i < buffers.length; i++) {
            tmp.set(new Uint8Array(buffers[i]), bufferOffset);
            bufferOffset += buffers[i].byteLength;
        }
        return tmp;
    }
}


export { CallApi, UserInfo };
