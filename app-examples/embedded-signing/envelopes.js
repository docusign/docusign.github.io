// Copyright © 2024 Docusign, Inc.
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
 *   platform -- 'demo' | 'stage'
 *   
 * public values
 */
const CLIENT_USER_ID = 1000;
// See https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopeviews/createrecipient/#schema__recipientviewrequest_frameancestors
const FRAME_ANCESTORS = ["http://localhost", "https://docusign.github.io", "https://apps-d.docusign.com", 
    "https://apps-s.docusign.com", "https://apps.docusign.com", "https://stage.docusign.net"];
const MESSAGE_ORIGINS_DEMO = ["https://apps-d.docusign.com"];
const MESSAGE_ORIGINS_STAGE = ["https://apps-s.docusign.com"];
const MESSAGE_ORIGINS_PROD = ["https://apps.docusign.com"];
const RETURN_URL = `https://docusign.github.io/app-examples/embedded-signing/classicReturnUrl.html`;
const ROLE = "signer" // the role name used by the example templates
const STATIC_DOC_URL = "Web site Access Agreement.pdf";
const SUPP_DOCS_URL = "../../examples/docs/";
const SUPP_FILE_NAMES = ["Terms and Conditions 1.pdf", "Terms and Conditions 2.html.txt"];
const SUPP_DOC_NAMES = [{name: "Terms and Conditions 1.pdf", ext: "pdf"}, {name: "Terms and Conditions 2.html", ext: "html"}];
const SIMPLE_HTML = "simple_with_image.html.txt";
const HTML_RESPONSIVE = "htmlSmartSections.html.txt";
const HTML_RESPONSIVE_DOCS = "htmlSmartSections_example_1.html.txt";
const HTML_RESPONSIVE_DOCS_CHOICE = "htmlResponsiveDocs";
const HTML_C2A_RESPONSIVE = "htmlC2ASmartSections.html.txt";
const PAYMENT_DOC = "payment_order_form.docx";
const DEFAULT_PHONE_AUTH_ID = "c368e411-1592-4001-a3df-dca94ac539ae"; 

const UPLOAD_MODAL = "uploadHtmlDocModal";
const UPLOAD_BUTTON = "uploadButton";
const CANCEL_UPLOAD_BUTTON = "cancelUploadButton";
const UPLOAD_FILE_PICKER = "uploadHtmlFile";

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

    /***
     *  When an HTML file is uploaded, look for displayAnchors JSON in the HTML file.
     *  Format in the file:
     *  
    <script type="application/json" data-displayAnchors="true">
        {
            displayAnchors: [
                {
                    caseSensitive: true,
                    startAnchor: "responsive_table_start",
                    endAnchor: "responsive_table_end",
                    removeEndAnchor: true,
                    removeStartAnchor: true,
                    displaySettings: {
                        cellStyle: "text-align:left;border:3px solid purple;margin:0px;padding:0px;",
                        display: "responsive_table_single_column",
                        tableStyle: "margin-bottom: 20px;width:100%;max-width:816px;margin-left:auto;margin-right:auto;"
                    }
                }
            ]
        }
    </script>
    */


    constructor(args) {
        this.showMsg = args.showMsg;
        this.messageModal = args.messageModal;
        this.loadingModal = args.loadingModal;
        this.loader = args.loader;
        this.clientId = args.clientId;
        this.accountId = args.accountId;
        this.callApi = args.callApi;
        this.logger = args.logger;
        this.platform = args.platform;
        this.mainElId = args.mainElId;
        this.clientUserId = CLIENT_USER_ID;
        this.role = ROLE;
        this.useDisclosure = true;
        this.returnUrl = RETURN_URL;
        this.defaultReturnUrl = RETURN_URL;

        this.htmlResponsiveNoTabs = false;
        this.displayAnchorsRegEx = /<script .*data-displayAnchors="true".*>([\S\s]*?)<\/script>/;
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
            apiMethod: `/accounts/${this.accountId}/envelopes?merge_roles_on_draft=true`,
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
                const msg = `<p>This account, ${this.accountId}, is not configured for Click To Agree envelopes.
                    Instead, it is configured for the Document Visibility feature.
                    Contact Docusign customer service to change your account's configuration.
                    Tell them you have the ONESIGNALLSIGN_NOT_SATISFIED error when you are creating a Click To Agree envelope.</p>
                    <p><small>Error message: ${this.callApi.errMsg}</small></p>`;
                this.messageModal({ style: 'text', title: "Create Envelope Problem: Operation Canceled", msg: msg });
                this.logger.post("Create Envelope Problem: Operation Canceled", msg);
                return false
            }
            this.messageModal({
                style: 'text', title: "Create Envelope Problem: Operation Canceled", msg:
                    `<p>Error message: ${this.callApi.errMsg}</p>`
            });
            this.logger.post("Create Envelope Problem: Operation Canceled", `<p>Error message: ${this.callApi.errMsg}</p>`);
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
     * Payment example
     * Normally, you'd use a template. But for this example, we need to update the 
     * Payment Gateway ID, so we'll build the envelope object from scratch.
     */
    async createPaymentRequest() {
        const docB64 = await this.callApi.getDocB64(SUPP_DOCS_URL + PAYMENT_DOC);
        if (!docB64) {
            this.showMsg(this.callApi.errMsg); // Error!
            return
        }
        const req = {
            useDisclosure: true,
            emailSubject: "Please pay and sign the order form",
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
                                    anchorString: "/sig1/",
                                    anchorXOffset: "10",
                                    anchorYOffset: "0",
                                    documentId: "1"
                                }
                            ],
                            numberTabs: [
                                {
                                    value: "10.00",
                                    width: 78,
                                    required: "true",
                                    locked: "true",
                                    tabLabel: "apples",
                                    documentId: "1",
                                    anchorString: "/apples/",
                                    anchorXOffset: "0",
                                    anchorYOffset: "-8",
                                    bold: "true",
                                    font: "Calibri",
                                    fontSize: "Size12",
                                },
                                {
                                    value: "15.00",
                                    width: 78,
                                    required: "true",
                                    locked: "true",
                                    tabLabel: "oranges",
                                    documentId: "1",
                                    anchorString: "/oranges/",
                                    anchorXOffset: "0",
                                    anchorYOffset: "-8",
                                    bold: "true",
                                    font: "Calibri",
                                    fontSize: "Size12",
                                }
                            ],
                            formulaTabs: [
                                {
                                    required: "true",
                                    formula: "([apples] + [oranges])",
                                    roundDecimalPlaces: "2",
                                    tabLabel: "total",
                                    documentId: "1",
                                    anchorString: "/total/",
                                    anchorXOffset: "25",
                                    anchorYOffset: "-6",
                                    bold: "true",
                                    font: "Calibri",
                                    fontSize: "Size12",
                                },
                                {
                                    required: "true",
                                    formula: "[total] * 100",
                                    roundDecimalPlaces: "2",
                                    paymentDetails: {
                                        lineItems: [
                                            {
                                                name: "Apples",
                                                description: "Apples: 10 pack",
                                                itemCode: "Apples10",
                                                amountReference: "apples"
                                            },
                                            {
                                                name: "Oranges",
                                                description: "Oranges: 10 pack",
                                                itemCode: "Oranges10",
                                                amountReference: "oranges"
                                            }
                                        ],
                                        currencyCode: "USD",
                                        gatewayAccountId: this.gatewayId,
                                        gatewayName: "Stripe",
                                        gatewayDisplayName: "Stripe",                                  
                                    },
                                    hidden: "true",
                                    tabLabel: "Payment1",
                                    documentId: "1",
                                    pageNumber: "1",
                                    xPosition: "0",
                                    yPosition: "0",

                                }
                            ]
                        }
                    }
                ]
            },
            documents: [
                {
                    name: "Order Form",
                    fileExtension: "docx",
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
     * htmlUploadThenResponsive
     */
    async htmlUploadThenResponsive({htmlResponsiveNoTabs = false} = {}) {
        this.htmlResponsiveNoTabs = htmlResponsiveNoTabs;
        this.loader.hide();
        //$(`#${this.mainElId}`).removeClass("hide");

        if (!this.uploadModal) {
            this.uploadModal = new bootstrap.Modal(`#${UPLOAD_MODAL}`);
        }
        return await this.showUpload();
    }

    async showUpload() {
        const fileEl = document.getElementById(UPLOAD_FILE_PICKER);
        this.uploadModal.show();
        let uploadFile;
        await new Promise(resolve => 
            $(`#${UPLOAD_BUTTON}, #${CANCEL_UPLOAD_BUTTON}`).off('click').on('click', (evt) => {
                const uploadButtonClicked = evt.target.id === "uploadButton"
                uploadFile = uploadButtonClicked && fileEl.files[0];
                            
                if (!uploadButtonClicked || !uploadFile) {
                    this.showMsg("Operation Canceled");
                    this.logger.post(null, `Operation Canceled`);
                }
                resolve();
                }
            )
        )
        if (!uploadFile) {
            fileEl.value = ""; // reset the file picker
            return false; // Early return
        }

        const fileContents = await uploadFile.text();    
        this.loader.show("Creating the envelope");

        await this.createHtmlResponsiveRequest({
            htmlResponsiveNoTabs: this.htmlResponsiveNoTabs,
            doc: fileContents});
        this.htmlResponsiveNoTabs = false;
        fileEl.value = ""; // reset the file picker
        return true;
    }

    /***
     * Responsive HTML with smart sections
     */
    async createHtmlResponsiveRequest({htmlResponsiveNoTabs = false, doc = false, docReq = false} = {}) {
        let displayAnchors = null;
        if (doc || docReq === HTML_RESPONSIVE_DOCS_CHOICE) {
            /***
             *  Look for displayAnchors JSON in the HTML file.
             *  Format in the file:
             *  
    <script type="application/json" data-displayAnchors="true">
        {
            displayAnchors: [
                {
                    caseSensitive: true,
                    startAnchor: "responsive_table_start",
                    endAnchor: "responsive_table_end",
                    removeEndAnchor: true,
                    removeStartAnchor: true,
                    displaySettings: {
                        cellStyle: "text-align:left;border:3px solid purple;margin:0px;padding:0px;",
                        display: "responsive_table_single_column",
                        tableStyle: "margin-bottom: 20px;width:100%;max-width:816px;margin-left:auto;margin-right:auto;"
                    }
                }
            ]
        }
    </script>

             */

            if (docReq) {
                doc = await this.callApi.getDoc(SUPP_DOCS_URL + HTML_RESPONSIVE_DOCS);
                if (!doc) {
                    this.showMsg(this.callApi.errMsg); // Error!
                    return
                }
    
            }

            const matches = this.displayAnchorsRegEx.exec(doc);
            const rawJson = matches && matches.length === 2 && matches[1];
            let daObj;
            try {
                daObj = rawJson && JSON.parse(rawJson)
            } catch (e) {
                console.log("### Could not parse DisplayAnchor JSON. Error:");
                console.log(e.toString());
                console.log(`JSON found in HTML file:\nSTART${rawJson}END`);
                daObj = null
                this.showMsg(this.callApi.errMsg); // Error!
                return
            }
            displayAnchors = (daObj && daObj.displayAnchors) || [];

        } else {
            doc = await this.callApi.getDoc(SUPP_DOCS_URL + 
                (htmlResponsiveNoTabs ? HTML_C2A_RESPONSIVE : HTML_RESPONSIVE));
            if (!doc) {
                this.showMsg(this.callApi.errMsg); // Error!
                return
            }
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
                    }
                ]
            },
            documents: [
                {
                    name: "Business Credit Card Approval.html",
                    documentId: "1",
                    htmlDefinition: {
                        source: doc,
                        displayAnchors: displayAnchors ? displayAnchors :
                        [
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
        if (!htmlResponsiveNoTabs) {
            // include tabs
            req.recipients.signers[0].tabs = 
            {
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
     * noDocument envelope request. Only supplemental docs
     */
    async noDocument() {
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
            documents: []
        }
        this.request = req;
        return req
    }

    /***
     * updateRequest munges the request 
     * 1. Adds supplemental docs
     * 2. Sets responsive bit
     * 3. sets useDisclosure
     *    https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/create/#schema__envelopedefinition_usedisclosure
     * 4. Adds IDV
     */
    async updateRequest(supplemental) {
        await this.addSupplementalDocuments(supplemental);
        this.setResponsiveMode();
        if (this.ersd === true || this.ersd === false) { this.request.useDisclosure = this.ersd }
        // if null, don't add the attribute
        if (this.authStyle) {this.setIDV()}     
    }

    /***
     * addSupplementalDocuments
     * arg -- 
     *  const supplemental = [
     *      {include: bool, signerMustAcknowledge: string},
     *      {include: bool, signerMustAcknowledge: string}];
     *  ]
     * 
     * If the signerMustAcknowledge === "read_accept" then 
     * we need to add the appropriate approveTabs/viewTabs 
     * to force a reading of the entire supplemental doc
     */
    async addSupplementalDocuments(supplemental) {
        const compositeTemplates = !!this.request.compositeTemplates;
        const docIdStart = compositeTemplates ? 1 : this.request.documents.length + 10;
        const compIdStart = compositeTemplates ? this.request.compositeTemplates.length + 10 : 0;
        if (!compositeTemplates) {
            if (!this.request.recipients.signers[0].hasOwnProperty('tabs')) {
                this.request.recipients.signers[0].tabs = {};    
            }
            this.request.recipients.signers[0].tabs.approveTabs = [];
            this.request.recipients.signers[0].tabs.viewTabs = [];
        }

        for (let i = 0; i < supplemental.length; i++) {
            if (supplemental[i] && supplemental[i].include) {
                const sB64 = await this.callApi.getDocB64(SUPP_DOCS_URL + SUPP_FILE_NAMES[i]);
                const readAccept = supplemental[i].signerMustAcknowledge === "read_accept";
                if (!sB64) {
                    this.showMsg(this.callApi.errMsg); // Error!
                    return
                }
                const documentId = `${i + docIdStart}`;
                const suppDoc = {
                    name: SUPP_DOC_NAMES[i].name,
                    display: "modal",
                    fileExtension: SUPP_DOC_NAMES[i].ext,
                    documentId: documentId,
                    signerMustAcknowledge: supplemental[i].signerMustAcknowledge,
                    documentBase64: sB64
                }
                if (readAccept) {
                    suppDoc.signerMustAcknowledge = "view";
                }

                if (compositeTemplates) {
                    let inlineTempl = { sequence: "1" };
                    if (readAccept) {
                        // add the approveTab and viewTab
                        inlineTempl.recipients = 
                            {
                            signers: [
                                { 
                                    clientUserId: this.clientUserId,
                                    email: this.email,
                                    name: this.name,
                                    roleName: this.role,
                                    recipientId: "1",
                                    tabs: {
                                        approveTabs: [
                                            {
                                                "buttonText": "Approve",
                                                "documentId": documentId,
                                                "recipientId": "1",
                                                "pageNumber": "1",
                                                "xPosition": "0",
                                                "yPosition": "0",
                                            }
                                        ],
                                        viewTabs: [
                                            {
                                                "buttonText": "View",
                                                "required": "true",
                                                "requiredRead": "true",
                                                "documentId": documentId,
                                                "recipientId": "1",
                                                "pageNumber": "1",
                                                "xPosition": "0",
                                                "yPosition": "0",
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }

                    this.request.compositeTemplates.push({
                        compositeTemplateId: `${i + compIdStart}`,
                        document: suppDoc,
                        inlineTemplates: [inlineTempl]
                    })
                } else {
                    this.request.documents.push(suppDoc);
                    if (readAccept) {
                        // add the approveTab and viewTab
                        this.request.recipients.signers[0].tabs.approveTabs.push(
                            {
                                "buttonText": "Approve",
                                "documentId": documentId,
                                "recipientId": "1",
                                "pageNumber": "1",
                                "xPosition": "0",
                                "yPosition": "0",
                            }
                        );
                        this.request.recipients.signers[0].tabs.viewTabs.push(
                            {
                                "buttonText": "View",
                                "required": "true",
                                "requiredRead": "true",
                                "documentId": documentId,
                                "recipientId": "1",
                                "pageNumber": "1",
                                "xPosition": "0",
                                "yPosition": "0",
                            }
                        )
                    }
                }
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
        const compositeTemplates = this.request.compositeTemplates;
        if (!this.responsive) { return } // EARLY RETURN
        if (compositeTemplates) {
            for (let i = 0; i < compositeTemplates.length; i++) {
                if (compositeTemplates[i].document && !compositeTemplates[i].document.htmlDefinition &&
                    compositeTemplates[i].document.fileExtension === "html") {
                    compositeTemplates[i].document.htmlDefinition = { source: "document" }
                }
            }
        } else {
            const documents = this.request.documents;
            for (let i = 0; i < documents.length; i++) {
                if (!documents[i].htmlDefinition && documents[i].fileExtension === "html") {
                    documents[i].htmlDefinition = { source: "document" }
                }
            }
        }
    }

    setIDV() {
        let idvConfigId = null;
        if (this.authStyle === "none") {return}
        if (this.authStyle === "defaultPhone") {
            idvConfigId = DEFAULT_PHONE_AUTH_ID
        } else if (this.authStyle === "custom") {
            idvConfigId = this.idvConfigId;
        }
        const compositeTemplates = !!this.request.compositeTemplates;
        if (compositeTemplates) {
            if (!this.request.compositeTemplates[0].inlineTemplates[0] || 
                !this.request.compositeTemplates[0].inlineTemplates[0].recipients.signers[0].name) {
                    console.log ("Couldn't find composite template signer!");
                    return
                }
            this.request.compositeTemplates[0].inlineTemplates[0].recipients.signers[0].identityVerification = {
                inputOptions: [{
                    name: "phone_number_list",
                    valueType: "PhoneNumberList",
                    phoneNumberList: [
                        {countryCode: this.smsCc,
                            number: this.smsNational}
                    ]
                }],
                workflowId: idvConfigId
            }
        } else {
            this.request.recipients.signers[0].identityVerification = {
                inputOptions: [{
                    name: "phone_number_list",
                    valueType: "PhoneNumberList",
                    phoneNumberList: [
                        {countryCode: this.smsCc,
                         number: this.smsNational}
                    ]
                }],
                workflowId: idvConfigId
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
    async recipientView(returnUrl = RETURN_URL) {
        let messageOrigins;
        if (this.platform === 'demo') {
            messageOrigins = MESSAGE_ORIGINS_DEMO
        } else if (this.platform === 'stage') {
            messageOrigins = MESSAGE_ORIGINS_STAGE
        } else if (this.platform === 'prod') {
            messageOrigins = MESSAGE_ORIGINS_PROD
        }
        this.returnUrl = returnUrl;
        const request = {
            authenticationMethod: "None",
            clientUserId: this.clientUserId,
            email: this.email,
            frameAncestors: FRAME_ANCESTORS,
            messageOrigins: messageOrigins,
            returnUrl: this.returnUrl,
            userName: this.name,
        }
        const results = await this.callApi.callApiJson({
            apiMethod: `/accounts/${this.accountId}/envelopes/${this.envelopeId}/views/recipient`,
            httpMethod: "POST",
            req: request
        });
        const url = results ? results.url : false;
        if (!url) { return false }
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
