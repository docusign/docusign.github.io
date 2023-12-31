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
GetAgentUserAuthorizations|Authorizations:getAgentUserAuthorizations|esign-rest-api/reference/accounts/authorizations/getagentuserauthorizations/
GetBrand|AccountBrands:get|esign-rest-api/reference/accounts/accountbrands/get/
AccountBrands:getLogo|AccountBrands:getLogo|esign-rest-api/reference/accounts/accountbrands/getlogo/
GetBrands|AccountBrands:list|esign-rest-api/reference/accounts/accountbrands/list/
GetClickwraps|ClickWraps:getClickwraps|click-api/reference/accounts/clickwraps/getclickwraps/
GetCloudStorageProvider|CloudStorageProviders:list|esign-rest-api/reference/cloudstorage/cloudstorageproviders/list/
GetConsumerDisclosure|AccountConsumerDisclosures:get|esign-rest-api/reference/accounts/accountconsumerdisclosures/get/
GetDocumentImage|Envelopes:getPageImage|esign-rest-api/reference/envelopes/envelopes/getpageimage/
Templates:getDocumentPageImage|Templates:getDocumentPageImage|esign-rest-api/reference/templates/templates/getdocumentpageimage/
GetDocumentTemplates|EnvelopeTemplates:listByDocument|esign-rest-api/reference/envelopes/envelopetemplates/listbydocument/
GetEnvelope|Envelopes:get|esign-rest-api/reference/envelopes/envelopes/get/
GetEnvelopeCustomFields|EnvelopeCustomFields:list|esign-rest-api/reference/envelopes/envelopecustomfields/list/
GetEnvelopeDocumentPDFList|EnvelopeDocuments:list|esign-rest-api/reference/envelopes/envelopedocuments/list/
GetEnvelopeNotification|Envelopes:getNotificationSettings|esign-rest-api/reference/envelopes/envelopes/getnotificationsettings/
Templates:getNotificationSettings|Templates:getNotificationSettings|esign-rest-api/reference/templates/templates/getnotificationsettings/
GetEnvelopeRecipients|EnvelopeRecipients:list|esign-rest-api/reference/envelopes/enveloperecipients/list/
TemplateRecipients:list|TemplateRecipients:list|esign-rest-api/reference/templates/templaterecipients/list/
GetEnvelopeTemplates|EnvelopeTemplates:list|esign-rest-api/reference/envelopes/envelopetemplates/list/
GetFolderList|Folders:list|esign-rest-api/reference/folders/folders/list/
GetInvoicePastDueSummary|Invoices:listPastDue|esign-rest-api/reference/billing/invoices/listpastdue/
GetNotary|Notary:getNotary|esign-rest-api/reference/notary/notary/getnotary/
GetPowerFormsList|PowerForms:list|esign-rest-api/reference/powerforms/powerforms/list/
GetTabs|CustomTabs:list|esign-rest-api/reference/customtabs/customtabs/list/
GetTutorials
GetUserDashboard
GetUserCustomSettings|UserCustomSettings:list|esign-rest-api/reference/users/usercustomsettings/list/
GetUserProfile|UserProfiles:get|esign-rest-api/reference/users/userprofiles/get/
GetUserProfileImage|Users:getProfileImage|esign-rest-api/reference/users/users/getprofileimage/
GetUserSettings|Users:getSettings|esign-rest-api/reference/users/users/getsettings/
GetUserSignatures|UserSignatures:list|esign-rest-api/reference/users/usersignatures/list/
GetWorkflow|EnvelopeWorkflowDefinition:getEnvelopeWorkflowDefinition|esign-rest-api/reference/envelopes/envelopeworkflowdefinition/getenvelopeworkflowdefinition/
InitiateChunkedUpload|ChunkedUploads:create|esign-rest-api/reference/envelopes/chunkeduploads/create/
RequestEnvelopes|Envelopes:listStatusChanges|esign-rest-api/reference/envelopes/envelopes/liststatuschanges/
RequestRecipientToken|EnvelopeViews:createRecipient|esign-rest-api/reference/envelopes/envelopeviews/createrecipient/
RequestTemplate|Templates:get|esign-rest-api/reference/templates/templates/get/
RequestTemplates|Templates:list|esign-rest-api/reference/templates/templates/list/
SaveTemplates|Templates:create|esign-rest-api/reference/templates/templates/create/
SetEnvelopeLock|EnvelopeLocks:create|esign-rest-api/reference/envelopes/envelopelocks/create/
TemplateLocks:create|TemplateLocks:create|esign-rest-api/reference/templates/templatelocks/create/
UpdateAccountSettings|Accounts:updateSettings|esign-rest-api/reference/accounts/accounts/updatesettings/
UpdateEnvelope|Envelopes:update|esign-rest-api/reference/envelopes/envelopes/update/
UpdateEnvelopeNotification|Envelopes:updateNotificationSettings|esign-rest-api/reference/envelopes/envelopes/updatenotificationsettings/
UpdateEnvelopeRecipients|EnvelopeRecipients:update|esign-rest-api/reference/envelopes/enveloperecipients/update/
TemplateRecipients:update|TemplateRecipients:update|esign-rest-api/reference/templates/templaterecipients/update/
UpdateEnvelopeTabs|EnvelopeRecipientTabs:update|esign-rest-api/reference/envelopes/enveloperecipienttabs/update/
UpdateTemplate|Templates:update|esign-rest-api/reference/templates/templates/update/
GetUserSignatureImage|UserSignatures:getImage|esign-rest-api/reference/users/usersignatures/getimage/`;

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

