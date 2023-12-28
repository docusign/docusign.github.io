/**
 * Copyright (c) 2023 - DocuSign, Inc. (https://www.docusign.com)
 * License: The MIT License. See the LICENSE file.
 */

/**
 * File: apiNames.js
 * Provides translation between the DocuSign internal name(s) used for an API method
 * and the API's name used in the Developer Center documentation
 */

// internal_name|API name|url
const urlPrefix = "https://developers.docusign.com/docs/";
const htmlClass = "apiName";
const data = 
`AddDocumentToEnvelope|EnvelopeDocuments:update|esign-rest-api/reference/envelopes/envelopedocuments/update/
AddEnvelopeRecipients|EnvelopeRecipients:update|esign-rest-api/reference/envelopes/enveloperecipients/update/
TemplateRecipientTabs:create|TemplateRecipientTabs:create|esign-rest-api/reference/templates/templaterecipienttabs/create/
AddEnvelopeTabs|EnvelopeRecipientTabs:create|esign-rest-api/reference/envelopes/enveloperecipienttabs/create/
CommitChunkedUpload|ChunkedUploads:commit|esign-rest-api/reference/envelopes/chunkeduploads/commit/
CreateAndSendEnvelope|Envelopes:create|esign-rest-api/reference/envelopes/envelopes/create/
CreateEnvelope|Envelopes:create|esign-rest-api/reference/envelopes/envelopes/create/
CreateEnvelopeFromTemplatesAndForms|Envelopes:create|esign-rest-api/reference/envelopes/envelopes/create/
DeleteEnvelopeLock|EnvelopeLocks:delete|esign-rest-api/reference/envelopes/envelopelocks/delete/
DeleteEnvelopeRecipients|EnvelopeRecipients:delete|esign-rest-api/reference/envelopes/enveloperecipients/delete/
TemplateRecipientTabs:delete|TemplateRecipientTabs:delete|esign-rest-api/reference/templates/templaterecipienttabs/delete/
DeleteEnvelopeTabs|EnvelopeRecipientTabs:delete|esign-rest-api/reference/envelopes/enveloperecipienttabs/delete/
EnvelopeAuditEvents|Envelopes:listAuditEvents|esign-rest-api/reference/envelopes/envelopes/listauditevents/
FetchComments|Users:commentHistory|
GetAccountInformation|Accounts:get|esign-rest-api/reference/accounts/accounts/get/
GetAccountSettings|Accounts:listSettings|esign-rest-api/reference/accounts/accounts/listsettings/
GetAccountSharedAccess|Accounts:listSharedAccess|esign-rest-api/reference/accounts/accounts/listsharedaccess/
GetAccountSignatureProviders|AccountSignatureProviders:list|esign-rest-api/reference/accounts/accountsignatureproviders/list/
GetAccountUser|Users:get|esign-rest-api/reference/users/users/get/
GetAccountUsers|Users:list|esign-rest-api/reference/users/users/list/
GetAddressBookItems|Contacts:getOrList|esign-rest-api/reference/users/contacts/get/
BulkSend:getBulkSendBatches|BulkSend:getBulkSendBatches|esign-rest-api/reference/bulkenvelopes/bulksend/getbulksendbatches/
GetAgentUserAuthorizations
GetBrand
GetBrands
GetClickwraps
GetCloudStorageProvider
GetConsumerDisclosure
GetDocumentImage
GetDocumentTemplates
GetEnvelope
GetEnvelopeCustomFields
GetEnvelopeDocumentPDFList
GetEnvelopeNotification
GetEnvelopeRecipients
GetEnvelopeTemplates
GetFolderList
GetInvoicePastDueSummary
GetNotary
GetPowerFormsList
GetTabs
GetTutorials
GetUserCustomSettings
GetUserDashboard
GetUserProfile
GetUserProfileImage
GetUserSettings
GetUserSignatures
GetWorkflow
InitiateChunkedUpload
RequestEnvelopes
RequestRecipientToken
RequestTemplate
RequestTemplates
SaveTemplates
SetEnvelopeLock
UpdateAccountSettings
UpdateEnvelope
UpdateEnvelopeNotification
UpdateEnvelopeRecipients
UpdateEnvelopeTabs
UpdateTemplate`;

class ApiNames {
    constructor() {
        // build the database
        this.db = {}; // Initialize our database
        const dataArray = data.split("\n");
        dataArray.forEach(val => {
            const items = val.split("|");
            this.db[items[0]] = {apiName: items[1], url: items[2]}
        })
    }

    html(internalName) {
        let entry = this.db[internalName];
        if (!entry || !entry.apiName) {
            entry = {apiName: internalName, url: null}
        }
        const a = entry.url ? 
            `<a target="_blank" href="${urlPrefix + entry.url}">${entry.apiName}</a>` :
            entry.apiName; 
        //return (`<span class=${htmlClass}>${a}</span>`)
        return a
    }

    docsUrl(internalName) {
        const entry = this.db[internalName];
        let docUrl = entry && entry.url;
        if (docUrl) {
            docUrl = urlPrefix + docUrl
        }
        return docUrl;
    }

    name(internalName) {
        let entry = this.db[internalName];
        return (entry && entry.apiName) ? entry.apiName : internalName
    }

}
export { ApiNames };

