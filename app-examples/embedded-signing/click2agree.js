// Copyright © 2024 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

/*
 * CLASS Click2Agree
 * The Click2Agree examples
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
const STATIC_DOC_URL = "../assets/Web site Access Agreement.pdf";
const SUPP_DOCS_URL = "../assets/";
const SUPP_DOC_NAMES = ["Terms and Conditions 1.pdf", "Terms and Conditions 2.pdf"]
const EMAIL = "email@example.com";
const NAME = "Sam Spade";
const CLIENT_USER_ID = 1000;
// See https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopeviews/createrecipient/#schema__recipientviewrequest_frameancestors
const FRAME_ANCESTORS = ["http://localhost", "https://docusign.github.io", "https://apps-d.docusign.com"]; 
const MESSAGE_ORIGINS = ["https://apps-d.docusign.com"];
const RETURN_URL = `https://docusign.github.io/jsfiddleDsResponse.html`;
class Click2Agree {


    constructor(args) {
        this.showMsg = args.showMsg;
        this.messageModal = args.messageModal;
        this.loadingModal = args.loadingModal;
        this.clientId = args.clientId;
        this.accountId = args.accountId;
        this.callApi = args.callApi;
        this.mainElId = args.mainElId;
        this.signElId = args.signElId;
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
        this.supplemental = args.supplemental;

        // supplemental = [{include: true, signerMustAcknowledge: "view"},
        //   {include: true, signerMustAcknowledge: "accept"}];
        // no_interaction, view, accept, view_accept
        // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/create/#schema__envelopedefinition_documents_signermustacknowledge

        const recipient = {email: EMAIL, name: NAME, clientUserId: CLIENT_USER_ID}
        this.loadingModal.show("Creating the envelope");
        const envelopeId = await this.sendEnvelope(recipient);
        if (!envelopeId) {
            this.loadingModal.delayedHide("Could not send the envelope");
            return
        }
        this.loadingModal.show("Creating the recipient view");
        const recipientViewUrl = await this.recipientView({recipient: recipient, envelopeId: envelopeId});
        if (!recipientViewUrl) {
            this.loadingModal.delayedHide("Could not open the recipient view");
        }
        this.loadingModal.delayedHide("Opening the focused view");
        await this.focusedView(recipientViewUrl);
    }

    /***
     * focusedView, in the browser, calls the DocuSign.js library
     * to display the signing ceremony in an iframe
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
                        backgroundColor: '#333',
                        /** Text color of primary button */
                        color: '#fff',
                    }
                },
                /** High-level components we allow specific overrides for */
                signingNavigationButton: {
                    finishText: 'Accepted',
                    /** 'bottom-left'|'bottom-center'|'bottom-right',  default: bottom-right */
                    //position: 'bottom-left'
                }
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
                $(`#${this.mainElId}`).removeClass("hide");
                $(`#${this.signElId}`).addClass("hide");
            });
            
            $(`#${this.mainElId}`).addClass("hide");
            $(`#${this.signElId}`).removeClass("hide");
            signing.mount(`#${this.signElId}`);
        } catch (error) {
              // Any configuration or API limits will be caught here
        }
    }

    /***
     * IN PRODUCTION, this method would usually be implemented on
     * the server.
     * 
     * sendEnvelope sends an envelope that will be used for 
     * Click To Send. That means (important!) that the envelope
     * must have no tabs.
     * 
     * To add dynamic information to the document, 
     * DocuSign's DocGen can be used, or create a dynamic document
     * via HTML.
     */
    async sendEnvelope(recipient) {
        const request = await this.staticDocument(recipient);
        if (!request) {return}
        const results = await this.callApi.callApiJson({
            apiMethod: `/accounts/${this.accountId}/envelopes`,
            httpMethod: "POST",
            req: request
        });
        if (results !== false) {
            return results.envelopeId // good result 
        } else {
            if (this.callApi.errMsg.indexOf("ONESIGNALLSIGN_NOT_SATISFIED") !== -1) {
                // potential settings error:
                // 'Problem while making API call. Error: Bad Request.{"errorCode":"ONESIGNALLSIGN_NOT_SATISFIED",
                //    "message":"Freeform signing is not allowed for your account because it conflicts with other settings, please place signing tabs for each signer."}'
                this.messageModal("Create Envelope Problem: Operation Canceled", 
                    `<p>This account, ${this.accountId}, is not configured for Click To Send envelopes.
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
     * staticDocument returns an envelope request that uses a static PDF
     * document. Remember, Click To Agree means no tabs!
     */
    async staticDocument(recipient) {
        const addSupplemental = async function addSupplementalF(i) {
            if (this.supplemental[i] && this.supplemental[i].include) {
                const sB64 = await this.callApi.getDocB64(SUPP_DOCS_URL + SUPP_DOC_NAMES[i]);
                if (!sB64) {
                    this.showMsg(this.callApi.errMsg); // Error!
                    return
                }
                req.documents.push({
                    name: SUPP_DOC_NAMES[i],
                    display: "modal",
                    fileExtension: "pdf",
                    documentId: `${i+2}`,
                    signerMustAcknowledge: this.supplemental[i].signerMustAcknowledge,
                    documentBase64: sB64
                })
            }
        }.bind(this)

        const docB64 = await this.callApi.getDocB64(STATIC_DOC_URL);
        if (!docB64) {
            this.showMsg(this.callApi.errMsg); // Error!
            return
        }
        const req = {
            useDisclosure: false, // Enables Click to Agree
                // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/create/#schema__envelopedefinition_usedisclosure
            emailSubject: "Please sign the attached document",
            status: "sent",
            recipients: {
                signers: [
                    {
                        email: recipient.email,
                        name: recipient.name,
                        clientUserId: recipient.clientUserId,
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

        // Add supplemental docs
        await addSupplemental(0);
        await addSupplemental(1);
        return req
    }

    /***
     * IN PRODUCTION, this method would usually be implemented on
     * the server.
     * 
     * recipientView -- create the recipient view for use with 
     *    focused view.
     *    https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopeviews/createrecipient/
     */
    async recipientView(args){
        const recipient = args.recipient;
        const envelopeId = args.envelopeId;
        const request = {
            authenticationMethod: "None",
            clientUserId: recipient.clientUserId,
            email: recipient.email,
            frameAncestors: FRAME_ANCESTORS,
            messageOrigins: MESSAGE_ORIGINS,
            returnUrl: RETURN_URL,
            userName: recipient.name,
        }
        const results = await this.callApi.callApiJson({
            apiMethod: `/accounts/${this.accountId}/envelopes/${envelopeId}/views/recipient`,
            httpMethod: "POST",
            req: request
        });
        return results === false ? false : results.url
    }
}

export { Click2Agree };
