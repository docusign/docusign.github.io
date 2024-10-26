// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

/*
 * CLASS FocusedViewSigning
 * The FocusedViewSigning examples
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
const ROLE = "signer" // the role name used by the example templates
const END_MSG = `<p>The signed documents can be seen via your developer (demo) account</p>`;
const EXTERNAL_FRAMED_URL = "dsjsExternal.html";

/***
 * Public variables
 * signing -- is the signing window open?
 */
class FocusedViewSigning {

    constructor(args) {
        this.showMsg = args.showMsg;
        this.messageModal = args.messageModal;
        this.loadingModal = args.loadingModal;
        this.loader = args.loader;
        this.clientId = args.clientId;
        this.accountId = args.accountId;
        this.callApi = args.callApi;
        this.envelopes = args.envelopes;
        this.mainElId = args.mainElId;
        this.signElId = args.signElId;
        this.logger = args.logger;
        this.role = ROLE;
        this.signing = false; 
        this.document = args.document;
        this.padding = args.padding;
        this.showDecline = args.showDecline;

        this.documentChoice = { // response means generic "document" responsive
            default: {responsive: false, request: this.envelopes.createTemplateRequest.bind(this.envelopes)},
            htmlRegResp: {responsive: true, request: this.envelopes.createHtmlRegRequest.bind(this.envelopes)},
            htmlResponsive: {responsive: false, request: this.envelopes.createHtmlResponsiveRequest.bind(this.envelopes)},
            payment: {responsive: false, request: this.envelopes.createPaymentRequest.bind(this.envelopes)},
            approveDecline: {responsive: false, request: this.envelopes.createTemplateRequest.bind(this.envelopes)},
            docxDoc: {responsive: false, request: this.envelopes.createTemplateRequest.bind(this.envelopes)},
            pdfDoc: {responsive: false, request: this.envelopes.createTemplateRequest.bind(this.envelopes)},
        }
    }

    /***
     * sign function will 
     * 1. Send envelope
     * 2. Create recipient view
     * 3. Use the Docusign.js library to open the focused view
     * 
     * In the usual client/server app, steps 1 and 2 would be done on the server.
     * Then the recipientView URL (response from step 2) is returned to the client.
     * Then the client JavasScript opens the Click To Agree view
     */
    async sign(args) {
        this.templateId = args.templateId;
        this.supplemental = args.supplemental;
        this.name = args.name;
        this.ersd = args.ersd;
        this.email = args.email;
        this.modelButtonId = args.modelButtonId;
        this.modelButtonPosition = args.modelButtonPosition;
        this.locale = args.locale;
        this.template = args.template === "none" ? false : args.template; // Using a specific template
        this.document = this.template ? "default" : args.document;
        this.useDisclosure = true; // why demo with this off?
        this.outputStyle = args.outputStyle;
        this.useIframe = args.useIframe;
        this.gatewayId = args.gatewayId;
        this.authStyle = args.authStyle;
        this.idvConfigId = args.idvConfigId;  
        this.smsNational = args.smsNational;
        this.smsCc = args.smsCc;

        // supplemental = [{include: true, signerMustAcknowledge: "view"},
        //   {include: true, signerMustAcknowledge: "accept"}];
        // no_interaction, view, accept, view_accept
        // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/create/#schema__envelopedefinition_documents_signermustacknowledge

        if (this.document === "payment" && !this.gatewayId) {
            this.messageModal({style: 'text', title: "Problem: Enable Payments",
                msg: `Problem: the Payment example is only available if you configure a 
                payment gateway using the Settings link (top navigation).`});
            return
        }

        this.signing = true;
        this.loader.show("Creating the envelope");

        this.envelopes.authStyle = this.authStyle;
        this.envelopes.idvConfigId = this.idvConfigId;    
        this.envelopes.smsNational = this.smsNational;
        this.envelopes.smsCc = this.smsCc;
        this.envelopes.name = this.name;
        this.envelopes.email = this.email;
        this.envelopes.templateId = this.template ? this.template : this.templateId; // Use a specific template?
        this.envelopes.useDisclosure = this.useDisclosure; 
        this.envelopes.locale = this.locale;
        this.envelopes.ersd = this.ersd === false ? null : true; 
        this.envelopes.responsive = this.documentChoice[this.document].responsive;
        this.envelopes.gatewayId = this.gatewayId;
        await this.documentChoice[this.document].request();
        // add supplemental docs
        await this.envelopes.updateRequest(this.supplemental)
        this.envelopeId = await this.envelopes.sendEnvelope();

        if (!this.envelopeId) {
            this.loader.delayedHide("Could not send the envelope");
            this.signing = false;
            $(`#${this.mainElId}`).removeClass("hide");
            return
        }

        this.loader.show("Creating the recipient view");
        const recipientViewUrl = await this.envelopes.recipientView();
        if (!recipientViewUrl) {
            this.loader.delayedHide("Could not open the recipient view");
            this.signing = false;
            $(`#${this.mainElId}`).removeClass("hide");
            return;
        }

        if (this.outputStyle === "openUrl") {
            this.loader.delayedHide("Opening the signing ceremony");
            await this.focusedView(recipientViewUrl);
        } else {
            this.loader.hide();
            $(`#${this.mainElId}`).removeClass("hide");
            this.externalFocusedView(recipientViewUrl);
        }
    }

    /***
     * focusedView, in the browser, calls the Docusign.js library
     * to display the signing ceremony in an iframe
     * 
     * Remember to also make changes in dsjsExternal.html
     */
    async focusedView(recipientViewUrl) {
        const signingConfiguration = {
            url: recipientViewUrl,
            displayFormat: 'focused',
            style: {
                /** High-level variables that mirror our existing branding APIs. Reusing the branding name here for familiarity. */
                branding: {
                    primaryButton: {
                        /** Background color of primary button */
                        backgroundColor: $(`#${this.modelButtonId}`).css('background-color'),
                        /** Text color of primary button */
                        color: $(`#${this.modelButtonId} span`).css('color'),
                    }
                },
                /** High-level components we allow specific overrides for */
                signingNavigationButton: {
                    finishText: $(`#${this.modelButtonId} span`).text(), // default is Submit
                    // 'bottom-left'|'bottom-center'|'bottom-right',  default: bottom-right
                    position: $(`#${this.modelButtonPosition}`).val()
                },
                signingDeclineButton: {
                    show: this.showDecline
                },
            }
        }
        this.logger.postLog ({
            apiName: "Docusign JS signing configuration",
            bodyJson: signingConfiguration,
        });

        try {
            const docusign = await window.DocuSign.loadDocuSign(this.clientId);
            const signing = docusign.signing(signingConfiguration);
                
            /** Event handlers **/
            signing.on('ready', (event) => {
                $(`#${this.signElId} > iframe`).css('height', `${window.innerHeight - this.padding}px`);
                window.scroll(0, 0); // for iOS
                console.log('UI is rendered');
            });
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
                    const msg = `<p>Event data: ${JSON.stringify(event)}</p>`;
                    this.messageModal({style: 'text', title: "Signing Session Message", msg: msg});
                    this.logger.post("Signing Session Message", msg);
                } 
                document.getElementById(this.signElId).setAttribute("hidden", "");
                $(`#${this.mainElId}`).removeClass("hide");
            });
            
            $(`#${this.mainElId}`).addClass("hide");
            $(`#${this.signElId}`).removeAttr("hidden");

            // Open the signing ceremony
            signing.mount(`#${this.signElId}`);
        } catch (error) {
            // Any configuration or API limits will be caught here
            this.messageModal({style: 'text', title: "Error during Signing Ceremony", msg: error});
            this.logger.post("Error during Signing Ceremony", error);
            console.log ("### Error calling docusign.js");
            console.log (error);              
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
            dFormat: 'focused',
            bbg: $(`#${this.modelButtonId}`).css('background-color'),
            bcl: $(`#${this.modelButtonId} span`).css('color'),
            btext: $(`#${this.modelButtonId} span`).text(),
            bpos: $(`#${this.modelButtonPosition}`).val(),
            clientId: this.clientId,
        }
        this.signing = false;
        const url = `${window.location.origin}${window.location.pathname}${EXTERNAL_FRAMED_URL}`
            + this.encodeAll(config);
        this.loader.hide();
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
            this.loader.delayedHide("Envelope ID not found");
            this.signing = false;
            return
        }

        this.loader.show("Creating the recipient view");
        const recipientViewUrl = await this.envelopes.recipientView();
        if (!recipientViewUrl) {
            this.loader.delayedHide("Could not open the recipient view");
            this.signing = false;
            return;
        }

        this.loader.delayedHide("Opening the view");
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

export { FocusedViewSigning };
