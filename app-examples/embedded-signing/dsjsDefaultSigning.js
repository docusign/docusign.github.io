// Copyright © 2024 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

/*
 * CLASS DsjsDefaultSigning
 * The DsjsDefaultSigning examples
 *
 * args -- an object containing attributes:
 *   showMsg -- function to show a msg to the human
 *   clientId -- the actual clientId
 *   callApi -- instance of CallApi
 *   envelopes -- instance of Envelopes
 *   mainElId -- the id of the element that will be hidden when showing the view
 *   signElId -- the id of the element where the signing ceremony will be shown
 *   
 * public values
 */
const CLIENT_USER_ID = 1000;
// See https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopeviews/createrecipient/#schema__recipientviewrequest_frameancestors
const FRAME_ANCESTORS = ["http://localhost", "https://docusign.github.io", "https://apps-d.docusign.com"]; 
const MESSAGE_ORIGINS = ["https://apps-d.docusign.com"];
const RETURN_URL = `https://docusign.github.io/jsfiddleDsResponse.html`;
const ROLE = "signer" // the role name used by the example templates
const END_MSG = `<p>The signed documents can be seen via your developer (demo) account</p>`;
const EXTERNAL_FRAMED_URL = "dsjsExternal.html";

/***
 * Public variables
 * signing -- is the signing window open?
 */
class DsjsDefaultSigning {

    constructor(args) {
        this.showMsg = args.showMsg;
        this.messageModal = args.messageModal;
        this.loadingModal = args.loadingModal;
        this.clientId = args.clientId;
        this.accountId = args.accountId;
        this.callApi = args.callApi;
        this.envelopes = args.envelopes;
        this.mainElId = args.mainElId;
        this.signElId = args.signElId;
        this.logger = args.logger;
        this.role = ROLE;
        this.signing = false; 
        this.documentChoice = { // response means generic "document" responsive
            default: {responsive: false, request: this.envelopes.createTemplateRequest.bind(this.envelopes)},
            htmlRegResp: {responsive: true, request: this.envelopes.createHtmlRegRequest.bind(this.envelopes)},
            htmlResponsive: {responsive: false, request: this.envelopes.createHtmlResponsiveRequest.bind(this.envelopes)},
            docxResponsive: {responsive: true, request: this.envelopes.createTemplateRequest.bind(this.envelopes)},
            pdfResponsive: {responsive: true, request: this.envelopes.createTemplateRequest.bind(this.envelopes)},
        }
    }

    /***
     * sign function will 
     * 1. Send envelope
     * 2. Create recipient view
     * 3. Use the DocuSign.js library to open the focused view
     * 
     * In the usual client/server app, steps 1 and 2 would be done on the server.
     * Then the recipientView URL (response from step 2) is returned to the client.
     * Then the client JavasScript opens the Click To Agree view
     */
    async sign(args) {
        this.templateId = args.templateId;
        this.supplemental = args.supplemental;
        this.name = args.name;
        this.email = args.email;
        this.locale = args.locale;
        this.modelButtonId = args.modelButtonId;
        this.document = args.document;
        this.useDisclosure = true; // why demo with this off?
        this.outputStyle = args.outputStyle;
        this.useIframe = args.useIframe;

        // supplemental = [{include: true, signerMustAcknowledge: "view"},
        //   {include: true, signerMustAcknowledge: "accept"}];
        // no_interaction, view, accept, view_accept
        // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/create/#schema__envelopedefinition_documents_signermustacknowledge

        this.signing = true;
        this.loadingModal.show("Creating the envelope");

        this.envelopes.name = this.name;
        this.envelopes.email = this.email;
        this.envelopes.templateId = this.templateId;
        this.envelopes.useDisclosure = this.useDisclosure;
        this.envelopes.locale = this.locale; 
        this.envelopes.responsive = this.documentChoice[this.document].responsive;
        await this.documentChoice[this.document].request();
        // add supplemental docs
        await this.envelopes.updateRequest(this.supplemental)
        this.envelopeId = await this.envelopes.sendEnvelope();

        if (!this.envelopeId) {
            this.loadingModal.delayedHide("Could not send the envelope");
            this.signing = false;
            return
        }

        this.loadingModal.show("Creating the recipient view");
        const recipientViewUrl = await this.envelopes.recipientView();
        if (!recipientViewUrl) {
            this.loadingModal.delayedHide("Could not open the recipient view");
            this.signing = false;
            return;
        }

        this.loadingModal.delayedHide("Opening the signing ceremony");
        if (this.outputStyle === "openUrl") {
            await this.focusedView(recipientViewUrl);
        } else {
            this.externalFocusedView(recipientViewUrl);
        }
    }

    /***
     * focusedView, in the browser, calls the DocuSign.js library
     * to display the signing ceremony in an iframe
     */
    async focusedView(recipientViewUrl) {
        const signingConfiguration = {
            url: recipientViewUrl,
            displayFormat: 'default', // Uses DocuSign Classic Signing ceremony
            style: {
                /** High-level variables that mirror our existing branding APIs. Reusing the branding name here for familiarity. */
                branding: {
                    primaryButton: {
                        /** Background color of primary button */
                        //backgroundColor: $(`#${this.modelButtonId}`).css('background-color'),
                        /** Text color of primary button */
                        //color: $(`#${this.modelButtonId} span`).css('color'),
                    }
                },
                /** High-level components we allow specific overrides for is not used with default displayFormat*/
            }
        }

        try {
            const docusign = await window.DocuSign.loadDocuSign(this.clientId);
            const signing = docusign.signing(signingConfiguration);
                
            /** Event handlers **/
            signing.on('ready', (event) => {console.log('UI is rendered')});
            signing.on('sessionEnd', (event) => {
                /** The event here denotes what caused the sessionEnd to trigger, such as signing_complete, ttl_expired etc../ */
                console.log('sessionend', event);
                // Event: { returnUrl: url, type: "sessionEnd", sessionEndType: "signing_complete"}
                this.signing = false;
                if (event.type === "sessionEnd") {
                    const msg = `<p>Result: <b>${event.sessionEndType.replace("_", " ")}</b></p>${END_MSG}`;
                    this.messageModal({style: 'text', title: "Signing Session Ended", msg: msg});
                    this.logger.post("Signing session ended", msg);
                } else {
                    msg = `<p>Event data: ${JSON.stringify(event)}</p>`;
                    this.messageModal({style: 'text', title: "Signing Session Message", msg: msg});
                    this.logger.post("Signing session ended", msg);

                } 
                $(`#${this.signElId}`).addClass("hide").empty(); // Important! REMOVE the signing ceremony
                $(`#${this.mainElId}`).removeClass("hide");
            });
            
            $(`#${this.mainElId}`).addClass("hide");
            $(`#${this.signElId}`).removeClass("hide");

            // Open the signing ceremony
            signing.mount(`#${this.signElId}`);
        } catch (error) {
              // Any configuration or API limits will be caught here
        }
    }

    /***
     * externalFocusedView gathers tha attributes for 
     * displaying the signing ceremony externally 
     * in dsjsExternal.html
     */
    externalFocusedView(recipientViewUrl) {
        const config = {
            usingChrome: this.useIframe,
            rViewUrl: recipientViewUrl,
            dFormat: 'default',
            bbg: $(`#${this.modelButtonId}`).css('background-color'),
            bcl: $(`#${this.modelButtonId} span`).css('color'),
            btext: $(`#${this.modelButtonId} span`).text(),
            bpos: $(`#${this.modelButtonPosition}`).val(),
            clientId: this.clientId,
        }
        this.signing = false;
        const url = `${window.location.origin}${window.location.pathname}${EXTERNAL_FRAMED_URL}`
            + this.encodeAll(config);
        this.loadingModal.hide();
        this.messageModal({style: 'qr', title: "Signing Ceremony URL", url: url, usingChrome: this.useIframe});
    }

    /***
     * view shows an existing envelope
     * (that uses the same recipient)
     */
    async view() {
        this.signing = true;
        this.envelopeId = this.envelopes.envelopeId;
        if (!this.envelopeId) {
            this.loadingModal.delayedHide("Envelope ID not found");
            this.signing = false;
            return
        }

        this.loadingModal.show("Creating the recipient view");
        const recipientViewUrl = await this.envelopes.recipientView();
        if (!recipientViewUrl) {
            this.loadingModal.delayedHide("Could not open the recipient view");
            this.signing = false;
            return;
        }

        this.loadingModal.delayedHide("Opening the view");
        await this.focusedView(recipientViewUrl);
    }

    encd(val) {
        return encodeURIComponent(val).replace(/\%20/g, '+')
    }

    encodeAll(config) {
        let qp = "";
        Object.keys(config).forEach(key => {
            qp += `&${this.encd(key)}=${this.encd(config[key])}`
        })
        // replace the first character with #
        qp = qp.replace("&", "#"); // replaces the first one
        return qp;
    }    
}

export { DsjsDefaultSigning };
