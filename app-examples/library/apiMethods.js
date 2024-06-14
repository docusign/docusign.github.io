/**
 * Copyright (c) 2024 - Docusign, Inc. (https://www.docusign.com)
 * License: The MIT License. See the LICENSE file.
 */

/**
 * File: apiMethods.js
 * Provides translation between the Docusign API urls 
 * and the API's name used in the Developer Center documentation
 */

// API name|url|httpOperation|regex
const urlPrefix = "https://developers.docusign.com/docs/";
const data = 
`Envelopes:create|esign-rest-api/reference/envelopes/envelopes/create/|post|^.*\/restapi\/v2.1\/accounts\/.*\/envelopes$
EnvelopeViews:createRecipient|esign-rest-api/reference/envelopes/envelopeviews/createrecipient/|post|^.*\/restapi\/v2.1\/accounts\/.*\/envelopes/.*\/views\/recipient$
Templates:list|esign-rest-api/reference/templates/templates/list/|get|^.*\/restapi\/v2.1\/accounts\/.*\/templates$
AccountServer:userInfo|https://developers.docusign.com/platform/auth/reference/user-info/|get|^.*\/oauth\/userinfo$
Users:getProfileImage|esign-rest-api/reference/users/users/getprofileimage/|get|^.*\/restapi\/v2.1\/accounts\/.*\/users\/.*\/profile\/image$
Accounts:listSettings|esign-rest-api/reference/accounts/accounts/listsettings/|get|^.*\/restapi\/v2.1\/accounts\/.*\/settings$
AccountBrands:getLogo|esign-rest-api/reference/accounts/accountbrands/getlogo/|get|^.*\/restapi\/v2.1\/accounts\/.*\/brands\/.*\/logos\/.*$
AccountBrands:list|esign-rest-api/reference/accounts/accountbrands/list/|get|^.*\/restapi\/v2.1\/accounts\/.*\/brands$
AccountBrands:list|esign-rest-api/reference/accounts/accountbrands/list/|get|^.*\/restapi\/v2.1\/accounts\/.*\/brands\?.*$
Accounts:get|esign-rest-api/reference/accounts/accounts/get/|get|^.*\/restapi\/v2.1\/accounts\/.*$`; // Must be last!

class ApiMethods {
    constructor() {
        // build the database
        this.db = {post: [], get:[], delete:[], put:[]}; // Initialize our database
        const dataArray = data.split("\n");
        dataArray.forEach(val => {
            const items = val.split("|");
            const op = items[2].toLowerCase();
            this.db[op].push({name: items[0], docs: items[1], regExp: new RegExp(items[3])})
        })
    }

    find(op, url) {
        let result = {name: null, docs: null};
        const list = this.db[op.toLowerCase()];
        if (!list || list.length === 0) {return result}; // EARLY return
        for (let i=0; i < list.length; i++) {
            if (list[i].regExp.test(url)) {
                result.name = list[i].name;
                result.docs = this.docsUrl(list[i].docs);
                return result
            }
        }
        return result
    }

    docsUrl(docs) {
        if (!docs) {return ''}; // EARLY return
        if (docs.slice(0, 6) === "https:") {return docs};
        return urlPrefix + docs;
    }
}
export { ApiMethods };

