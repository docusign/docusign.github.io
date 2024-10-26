// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

/*
 * CLASS ClassicSigning
 * The ClassicSigning examples
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

import { storageGet, storageSet } from "../library/utilities.js"; 

const CLIENT_USER_ID = 1000;
// See https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopeviews/createrecipient/#schema__recipientviewrequest_frameancestors
const ROLE = "signer" // the role name used by the example templates
const RESULT_FLAG = "#classicResults=1"; // marker for the results URL
const END_MSG = `<p>The signed documents can be seen via your developer (demo) account</p>`;
const END_MSG_NO_IFRAME = `<p>The signed documents can be seen via your developer 
    (demo) account</p><p>The signing ceremony did not use an iframe, so this page
    was reloaded. (That is why you logged in again.) In production, you can 
    save state across page reloads by using a server-based session or 
    local storage.</p>`;
const EXTERNAL_FRAMED_URL = "classicExternalFramed.html";
const EXTERNAL_RETURN_URL = "classicExternalReturn.html";

/***
 * Public variables
 * signing -- is the signing window open?
 */
class ClassicSigning {

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
        this.classicResult = args.CLASSIC_RESULT; // storage location
        this.logger = args.logger;
        this.padding = args.padding;
        this.role = ROLE;
        this.signing = false; 

        window.addEventListener("message", this.ceremonyDone.bind(this));
        this.documentChoice = { // response means generic "document" responsive
            default: {responsive: false, request: this.envelopes.createTemplateRequest.bind(this.envelopes)},
            htmlRegResp: {responsive: true, request: this.envelopes.createHtmlRegRequest.bind(this.envelopes)},
            htmlResponsive: {responsive: false, request: this.envelopes.createHtmlResponsiveRequest.bind(this.envelopes)},
            docxDoc: {responsive: false, request: this.envelopes.createTemplateRequest.bind(this.envelopes)},
            pdfDoc: {responsive: false, request: this.envelopes.createTemplateRequest.bind(this.envelopes)},
            payment: {responsive: false, request: this.envelopes.createPaymentRequest.bind(this.envelopes)},
            approveDecline: {responsive: false, request: this.envelopes.createTemplateRequest.bind(this.envelopes)},
        }
    }

    /***
     * sign function will 
     * 1. Send envelope
     * 2. Create recipient view
     * 3. Either open in an iframe or redirect to the url
     * 
     * In the usual client/server app, steps 1 and 2 would be done on the server.
     * Then the browsewr is redirected to the recipientView URL 
     * or the url is opened in an iframe 
     * NOTE: some Docusign signing features are NOT available if the signing 
     *       ceremony is in an iframe 
     */
    async sign(args) {
        this.templateId = args.templateId;
        this.supplemental = args.supplemental;
        this.name = args.name;
        this.email = args.email;
        this.locale = args.locale;
        this.template = args.template === "none" ? false : args.template; // Using a specific template
        this.document = this.template ? "default" : args.document;
        this.outputStyle = args.outputStyle; // openUrl, showUrl
        this.useIframe = args.useIframe;
        this.gatewayId = args.gatewayId;
        this.authStyle = args.authStyle;
        this.idvConfigId = args.idvConfigId;
        this.smsNational = args.smsNational;
        this.smsCc = args.smsCc;


        this.useDisclosure = true; // why demo with this off?

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
        let returnUrl;
        if (this.outputStyle === "openUrl") {
            returnUrl = this.useIframe ? this.envelopes.defaultReturnUrl : 
            this.returnUrlState();
        } else {
            returnUrl = 
                `${window.location.origin}${window.location.pathname}${EXTERNAL_RETURN_URL}`;
        }
        const recipientViewUrl = await this.envelopes.recipientView(returnUrl);
        if (!recipientViewUrl) {
            this.loader.delayedHide("Could not open the recipient view");
            this.signing = false;
            $(`#${this.mainElId}`).removeClass("hide");
            return;
        }

        this.loader.delayedHide("Opening the signing ceremony");
        this.showSigningCeremony(recipientViewUrl);
    }

    showSigningCeremony (recipientViewUrl) {
        if (this.outputStyle === "openUrl") {
            if (this.useIframe) {
                $(`#${this.mainElId}`).addClass("hide");
                $(`#${this.signElId}`).removeAttr("hidden").html(`
                    <iframe src="${recipientViewUrl}" frameborder="0" 
                        style="height:height=${window.innerHeight - this.padding}px};
                        width:100%" 
                        height=${window.innerHeight - this.padding}px}
                        width="100%"></iframe>`);
            } else {
                // no iframe! Redirect the entire tab
                this.signing = false;
                window.location = recipientViewUrl;
            }
        } else {
            // provide an external URL
            let url;
            if (this.useIframe) {
                url = `${window.location.origin}${window.location.pathname}${EXTERNAL_FRAMED_URL}` +
                `#url=${this.encd(recipientViewUrl)}`
            } else {
                url = recipientViewUrl;
            }
            this.loader.hide();
            $(`#${this.mainElId}`).removeClass("hide");
            this.messageModal({style: 'qr', title: "Signing Ceremony URL", url: url, usingChrome: this.useIframe});
        }
    }
    
    /***
     * ceremonyDone listens for a message from the page the Signing Ceremony 
     * was redirected to. When the message arrives, close the iframe and post the
     * results
     */
    ceremonyDone(e) {
        if (!(e.data.source && e.data.source === "dsResponse")) {return}

        const hash = e.data.search.substring(1); // remove the ?
        const items = hash.split('=');
        if (items[0] !== "event") {return}
        const event = items[1]; // "signing_complete" or something else

        const msg = `<p>Result: <b>${event.replace("_", " ")}</b></p>${END_MSG}`;
        this.messageModal({style: 'text', title: "Signing Session Ended", msg: msg});
        this.logger.post("Signing session ended", msg);
        
        //$(`#${this.signElId}`).setAttribute("hidden", "").empty(); // Important! REMOVE the signing ceremony
        document.getElementById(this.signElId).setAttribute("hidden", "");
        $(`#${this.mainElId}`).removeClass("hide");
    }

    /***
     * showResults looks in storage to see if results from a non-iframe 
     * signing ceremony were stored there
     */
    showResults() {
        const results = storageGet(this.classicResult);
        storageSet(this.classicResult, false); // reset

        if (!results || !results.event) {return}
        this.messageModal({style: 'text', title: "Signing Session Ended", msg: 
            `<p>Result: <b>${results.event.replace("_", " ")}</b></p>
            ${END_MSG_NO_IFRAME}`});
        if (!results.envelopeId) {return}
        this.envelopes.name = results.name;
        this.envelopes.email = results.email;
        this.envelopes.setEnvelopeId(results.envelopeId);
    }

    /***
     * view shows an existing envelope
     * (that uses the same recipient)
     */
    async view(useIframe) {
        this.useIframe = useIframe;
        this.signing = true;
        this.envelopeId = this.envelopes.envelopeId;
        if (!this.envelopeId) {
            this.loader.delayedHide("Envelope ID not found");
            this.signing = false;
            return
        }

        this.loader.show("Creating the recipient view");
        const returnUrl = this.useIframe ? this.envelopes.defaultReturnUrl : 
            this.returnUrlState();
        const recipientViewUrl = await this.envelopes.recipientView(returnUrl);
        if (!recipientViewUrl) {
            this.loader.delayedHide("Could not open the recipient view");
            this.signing = false;
            return;
        }

        this.loader.delayedHide("Opening the view");
        this.showSigningCeremony(recipientViewUrl);
    }
    
    encd(val) {
        return encodeURIComponent(val).replace(/\%20/g, '+')
    }

    /***
     * returnUrlState -- returns a url to this page including
     * key envelope state attributes: envelopeId, name, email
     */
    returnUrlState() {
        return `${window.location.origin}${window.location.pathname}` +
            `${RESULT_FLAG}&envelopeId=${this.envelopeId}` +
            `&name=${this.encd(this.envelopes.name)}` +
            `&email=${this.encd(this.envelopes.email)}`
    }
}

export { ClassicSigning };
