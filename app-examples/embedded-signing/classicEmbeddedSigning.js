// Copyright © 2024 DocuSign, Inc.
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

import { storageGet, storageSet } from "../library/utilities.js" 


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

/***
 * Public variables
 * signing -- is the signing window open?
 */
class ClassicSigning {

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
        this.classicResult = args.CLASSIC_RESULT; // storage location
        this.role = ROLE;
        this.signing = false; 

        window.addEventListener("message", this.ceremonyDone.bind(this));
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
        this.useIframe = args.useIframe;

        this.useDisclosure = true; // why demo with this off?

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
        await this.envelopes.createTemplateRequest();
        // add supplemental docs
        await this.envelopes.addSupplementalDocuments(this.supplemental)
        this.envelopeId = await this.envelopes.sendEnvelope();

        if (!this.envelopeId) {
            this.loadingModal.delayedHide("Could not send the envelope");
            this.signing = false;
            return
        }

        this.loadingModal.show("Creating the recipient view");
        const returnUrl = this.useIframe ? this.envelopes.defaultReturnUrl : 
            this.returnUrlState();
        const recipientViewUrl = await this.envelopes.recipientView(returnUrl);
        if (!recipientViewUrl) {
            this.loadingModal.delayedHide("Could not open the recipient view");
            this.signing = false;
            return;
        }

        this.loadingModal.delayedHide("Opening the signing ceremony");
        this.showSigningCeremony(recipientViewUrl);
    }

    showSigningCeremony (recipientViewUrl) {
        if (this.useIframe) {
            $(`#${this.mainElId}`).addClass("hide");
            $(`#${this.signElId}`).removeClass("hide").html(`
                <iframe src="${recipientViewUrl}" frameborder="0" 
                    style="height:100%;width:100%" height="100%" width="100%"></iframe>`);
        } else {
            // no iframe! Redirect the entire tab
            this.signing = false;
            window.location = recipientViewUrl;
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

        this.messageModal("Signing Session Ended", 
            `<p>Result: <b>${event.replace("_", " ")}</b></p>${END_MSG}`)
        
        $(`#${this.signElId}`).addClass("hide").empty(); // Important! REMOVE the signing ceremony
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
        this.messageModal("Signing Session Ended", 
            `<p>Result: <b>${results.event.replace("_", " ")}</b></p>
            ${END_MSG_NO_IFRAME}`);
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
            this.loadingModal.delayedHide("Envelope ID not found");
            this.signing = false;
            return
        }

        this.loadingModal.show("Creating the recipient view");
        const returnUrl = this.useIframe ? this.envelopes.defaultReturnUrl : 
            this.returnUrlState();
        const recipientViewUrl = await this.envelopes.recipientView(returnUrl);
        if (!recipientViewUrl) {
            this.loadingModal.delayedHide("Could not open the recipient view");
            this.signing = false;
            return;
        }

        this.loadingModal.delayedHide("Opening the view");
        this.showSigningCeremony(recipientViewUrl);
    }
    
    /***
     * returnUrlState -- returns a url to this page including
     * key envelope state attributes: envelopeId, name, email
     */
    returnUrlState() {
        function encd(val) {
            return encodeURIComponent(val).replace(/\%20/g, '+')
        }

        return `${window.location.origin}${window.location.pathname}` +
            `${RESULT_FLAG}&envelopeId=${this.envelopeId}` +
            `&name=${encd(this.envelopes.name)}` +
            `&email=${encd(this.envelopes.email)}`
    }
}

export { ClassicSigning };
