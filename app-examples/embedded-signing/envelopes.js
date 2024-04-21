// Copyright © 2024 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

/*
 * CLASS Envelopes
 * The create the envelopes and their recipient views for the examples
 *
 * args -- an object containing attributes:
 *   showMsg -- function to show a msg to the human
 *   clientId -- the actual clientId
 *   callApi -- instance of CallApi
 *   mainElId -- the id of the element that will be hidden when showing the view
 *   signElId -- the id of the element where the signing ceremony will be shown
 *   
 * public values
 */
const CLIENT_USER_ID = 1000;
// See https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopeviews/createrecipient/#schema__recipientviewrequest_frameancestors
const FRAME_ANCESTORS = ["http://localhost", "https://docusign.github.io", "https://apps-d.docusign.com"]; 
const MESSAGE_ORIGINS = ["https://apps-d.docusign.com"];
const RETURN_URL = `https://docusign.github.io/app-examples/embedded-signing/classicReturnUrl.html`;
const ROLE = "signer" // the role name used by the example templates
const STATIC_DOC_URL = "Web site Access Agreement.pdf";
const SUPP_DOCS_URL = "../../examples/docs/";
const SUPP_DOC_NAMES = ["Terms and Conditions 1.pdf", "Terms and Conditions 2.pdf"];
const SIMPLE_HTML = "simple_with_image.html.txt";
const HTML_RESPONSIVE = "htmlSmartSections.html.txt"

/***
 * instance variables
 * name
 * email
 * templateId
 * useDisclosure
 * envelopeId (or false if there's an issue)
 * recipientViewUrl (or false if there's an issue)
 */
class Envelopes {

    constructor(args) {
        this.showMsg = args.showMsg;
        this.messageModal = args.messageModal;
        this.loadingModal = args.loadingModal;
        this.clientId = args.clientId;
        this.accountId = args.accountId;
        this.callApi = args.callApi;
        this.clientUserId = CLIENT_USER_ID;
        this.role = ROLE;
        this.useDisclosure = true;
        this.returnUrl = RETURN_URL;
        this.defaultReturnUrl = RETURN_URL;
    }

    /***
     * IN PRODUCTION, this method would usually be implemented on
     * the server.
     *  
     * Sets this.envelopeId. Setting it to false indicates an errror
     */
    async sendEnvelope() {
        this.envelopeId = false;
        const results = await this.callApi.callApiJson({
            apiMethod: `/accounts/${this.accountId}/envelopes`,
            httpMethod: "POST",
            req: this.request
        });
        if (results !== false) {
            this.envelopeId = results.envelopeId // good result
            window.postMessage("envelopeCreated");
            return this.envelopeId;
        } else {
            if (this.callApi.errMsg.indexOf("ONESIGNALLSIGN_NOT_SATISFIED") !== -1) {
                // potential settings error:
                // 'Problem while making API call. Error: Bad Request.{"errorCode":"ONESIGNALLSIGN_NOT_SATISFIED",
                //    "message":"Freeform signing is not allowed for your account because it conflicts with other settings, please place signing tabs for each signer."}'
                this.messageModal("Create Envelope Problem: Operation Canceled", 
                    `<p>This account, ${this.accountId}, is not configured for Click To Agree envelopes.
                    Instead, it is configured for the Document Visibility feature.
                    Contact DocuSign customer service to change your account's configuration.
                    Tell them you have the ONESIGNALLSIGN_NOT_SATISFIED error when you are creating a Click To Agree envelope.</p>
                    <p><small>Error message: ${this.callApi.errMsg}</small></p>`)
                return false
            }
            this.messageModal("Create Envelope Problem: Operation Canceled", 
            `<p>Error message: ${this.callApi.errMsg}</p>`)
            return false
        }
    }

    /***
     * createTemplateRequest returns an envelope request
     * 
     * Attributes used
     * this.name
     * this.email
     * this.clientUserId
     * this.templateId
     * this.role
     * this.useDisclosure
     */
    async createTemplateRequest() {
        const req = {
            useDisclosure: this.useDisclosure,
            status: "sent",
            compositeTemplates: [
                {
                compositeTemplateId: "1",
                serverTemplates: [
                    {
                    sequence: "1",
                    templateId: this.templateId
                    }
                ],
                inlineTemplates: [
                    {
                    sequence: "1",
                    recipients: {
                        signers: [
                            { // fill in the role info, including the clientUserId
                            clientUserId: this.clientUserId,
                            email: this.email,
                            name: this.name,
                            roleName: this.role,
                            recipientId: "1",
                            }
                        ]
                    }
                }
                ]
            }
            ]
        }
        this.request = req;
        return req
    }

    /***
     * A simple pdf request
     */
    async createSimpleEnvRequest() {
        const docB64 = await this.callApi.getDocB64(SUPP_DOCS_URL + STATIC_DOC_URL);
        if (!docB64) {
            this.showMsg(this.callApi.errMsg); // Error!
            return
        }
        const req = {
            useDisclosure: true,
            emailSubject: "Please sign the attached document",
            status: "sent",
            recipients: {
                signers: [
                    {
                    clientUserId: this.clientUserId,
                    email: this.email,
                    name: this.name,
                    recipientId: "1",
                    tabs: {
                        signHereTabs: [
                          {
                            xPosition: "70",
                            yPosition: "28",
                            pageNumber: "1",
                            documentId: "1"
                          }
                        ]            
                    }
                }
                ]
            },
            documents: [
                {
                    name: "Example document",
                    fileExtension: "pdf",
                    documentId: "1",
                    documentBase64: docB64,
                }
            ]
        }
        this.request = req;
        return req
    }

    /***
     * HTML source document
     */
    async createHtmlRegRequest() {
        const docB64 = await this.callApi.getDocB64(SUPP_DOCS_URL + SIMPLE_HTML);
        if (!docB64) {
            this.showMsg(this.callApi.errMsg); // Error!
            return
        }
        const req = {
            emailSubject: "Please sign the attached document",
            status: "sent",
            documents: [
                {
                    name: "Example document",
                    documentBase64: docB64,
                    fileExtension: "html",
                    documentId: "1",
                }
            ],
            recipients: {
                signers: [
                    {
                        email: this.email,
                        name: this.name,
                        clientUserId: this.clientUserId,
                        recipientId: "1",
                        tabs: {
                            signHereTabs: [
                                {
                                    anchorString: "/sig1/",
                                    anchorXOffset: "20",
                                    anchorUnits: "pixels"
                                }
                            ],
                            fullNameTabs: [
                                {
                                  anchorString: "/name1/",
                                  anchorYOffset: "-5",
                                  anchorUnits: "pixels",
                                  bold: "true",
                                  font: "Arial",
                                  fontSize: "Size12"
                                }
                            ],
                              emailAddressTabs: [
                                {
                                  anchorString: "/email1/",
                                  anchorUnits: "pixels",
                                  font: "Arial",
                                  fontSize: "Size12",
                                  anchorYOffset: "-5"
                                }
                            ]
                        }
                    }
                ]
            }
        };
        this.request = req;
        return req
    }
    
    /***
     * Responsive HTML with smart sections
     */
    async createHtmlResponsiveRequest() {
        const doc = await this.callApi.getDoc(SUPP_DOCS_URL + HTML_RESPONSIVE);
        if (!doc) {
            this.showMsg(this.callApi.errMsg); // Error!
            return
        }

        const req = {
        emailSubject: "Business Credit Card Approval",
        status: "sent",
        recipients: {
        signers: [
            {
            email: this.email,
            name: this.name,
            clientUserId: this.clientUserId,
            recipientId: "1",
            tabs: {
                signHereTabs: [
                {
                    tabLabel: "clientSignature"
                }
                ],
                dateSignedTabs: [
                {
                    tabLabel: "clientDateSigned",
                    font: "Arial",
                    fontSize: "Size12"
                }
                ],
                textTabs: [
                {
                    tabLabel: "Approver",
                    value: "Samantha Approver",
                    locked: "true",
                    font: "Arial",
                    fontSize: "Size12",
                    maxLength: "4000",
                    height: "11",
                    width: "100"
                },
                {
                    tabLabel: "BusinessName",
                    value: "ACME Widgets",
                    locked: "true",
                    font: "Arial",
                    fontSize: "Size12",
                    maxLength: "4000",
                    height: "11",
                    width: "60"
                }
                ]
            }
            }
        ]
        },
        documents: [
        {
            name: "Business Credit Card Approval.html",
            documentId: "1",
            htmlDefinition: {
                source: doc,
                displayAnchors: [
                    {
                    caseSensitive: true,
                    startAnchor: "responsive_table_start",
                    endAnchor: "responsive_table_end",
                    removeEndAnchor: true,
                    removeStartAnchor: true,
                    displaySettings: {
                        cellStyle: "text-align:left;border:solid 0px #000;margin:0px;padding:0px;",
                        display: "responsive_table_single_column",
                        tableStyle: "margin-bottom: 20px;width:100%;max-width:816px;margin-left:auto;margin-right:auto;"
                    }
                }
            ]
            }
        }
        ]
    }
    this.request = req;
    return req
    }
    
    /***
     * No tabs envelope request. Perfect for a click to agree envelope
     */
    async createNoTabsEnvRequest() {
        const docB64 = await this.callApi.getDocB64(SUPP_DOCS_URL + STATIC_DOC_URL);
        if (!docB64) {
            this.showMsg(this.callApi.errMsg); // Error!
            return
        }
        const req = {
            useDisclosure: true,
            emailSubject: "Please sign the attached document",
            status: "sent",
            recipients: {
                signers: [
                    {
                    clientUserId: this.clientUserId,
                    email: this.email,
                    name: this.name,
                    recipientId: "1",
                }
                ]
            },
            documents: [
                {
                    name: "Example document",
                    fileExtension: "pdf",
                    documentId: "1",
                    documentBase64: docB64,
                }
            ]
        }
        this.request = req;
        return req
    }    

    /***
     * updateRequest munges the request 
     * 1. Adds supplemental docs
     * 2. Sets responsive bit
     */
    async updateRequest(supplemental){
        await this.addSupplementalDocuments(supplemental);
        this.setResponsiveMode();
    }

    /***
     * addSupplementalDocuments
     * arg -- 
     *  const supplemental = [
     *      {include: bool, signerMustAcknowledge: string},
     *      {include: bool, signerMustAcknowledge: string}];
     *  ]
     */
    async addSupplementalDocuments(supplemental){
        const compositeTemplates =  !!this.request.compositeTemplates;
        const docIdStart = compositeTemplates ? 1 : this.request.documents.length + 10;
        const compIdStart = compositeTemplates ? this.request.compositeTemplates.length + 10 : 0;

        for (let i = 0; i < supplemental.length; i++) {
            if (supplemental[i] && supplemental[i].include) {
                const sB64 = await this.callApi.getDocB64(SUPP_DOCS_URL + SUPP_DOC_NAMES[i]);
                if (!sB64) {
                    this.showMsg(this.callApi.errMsg); // Error!
                    return
                }
                const suppDoc = {
                    name: SUPP_DOC_NAMES[i],
                    display: "modal",
                    fileExtension: "pdf",
                    documentId: `${i+docIdStart}`,
                    signerMustAcknowledge: supplemental[i].signerMustAcknowledge,
                    documentBase64: sB64
                }
                if (compositeTemplates) {
                    this.request.compositeTemplates.push({
                        compositeTemplateId: `${i+compIdStart}`,
                        document: suppDoc,
                        inlineTemplates: [{sequence: "1"}]
                    })
                } else {this.request.documents.push(suppDoc)}
            }
        }
    }

    /***
     * Sets the disableResponsiveDocument attribute. 
     * See https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/create/#schema__envelopedefinition_disableresponsivedocument
     * and
     * https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/create/#schema__envelopedefinition_compositetemplates_document_htmldefinition_source 
     */
    setResponsiveMode() {
        const compositeTemplates =  this.request.compositeTemplates;
        if (!this.responsive) {return} // EARLY RETURN
        if (compositeTemplates) {
            for (let i=0; i< compositeTemplates.length; i++) {
                if (compositeTemplates[i].document && !compositeTemplates[i].document.htmlDefinition) {
                    compositeTemplates[i].document.htmlDefinition = {source: "document"}
                }
            }
        } else {
            const documents = this.request.documents;
            for (let i=0; i< documents.length; i++) {
                if (!documents[i].htmlDefinition) {
                    documents[i].htmlDefinition = {source: "document"}
                }
            }
        }
    }

    /***
     * IN PRODUCTION, this method would usually be implemented on
     * the server.
     * 
     * recipientView -- create the recipient view for use with 
     *    focused view.
     *    https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopeviews/createrecipient/
     */
    async recipientView(returnUrl = RETURN_URL){
        this.returnUrl = returnUrl;
        const request = {
            authenticationMethod: "None",
            clientUserId: this.clientUserId,
            email: this.email,
            frameAncestors: FRAME_ANCESTORS,
            messageOrigins: MESSAGE_ORIGINS,
            returnUrl: this.returnUrl,
            userName: this.name,
        }
        const results = await this.callApi.callApiJson({
            apiMethod: `/accounts/${this.accountId}/envelopes/${this.envelopeId}/views/recipient`,
            httpMethod: "POST",
            req: request
        });
        const url = results ? results.url  : false;
        if (!url) {return false}
        const locale = this.locale !== "default" ? `&locale=${this.locale}` : "";
        return url + locale;
    }

    /***
     * setEnvelopeId enables another function to update it
     */
    setEnvelopeId(envelopeId) {
        this.envelopeId = envelopeId;
        window.postMessage("envelopeCreated");
    }
}

export { Envelopes };
