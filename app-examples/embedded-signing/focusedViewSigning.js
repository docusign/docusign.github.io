// Copyright © 2024 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

/*
 * CLASS FocusedViewSigning
 * The FocusedViewSigning examples
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
const RETURN_URL = `https://docusign.github.io/jsfiddleDsResponse.html`;
const ROLE = "signer" // the role name used by the example templates

/***
 * Public variables
 * signing -- is the signing window open?
 */
class FocusedViewSigning {

    constructor(args) {
        this.showMsg = args.showMsg;
        this.messageModal = args.messageModal;
        this.loadingModal = args.loadingModal;
        this.clientId = args.clientId;
        this.accountId = args.accountId;
        this.callApi = args.callApi;
        this.mainElId = args.mainElId;
        this.signElId = args.signElId;
        this.clientId = CLIENT_USER_ID;
        this.role = ROLE;
        this.signing = false; 
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
        this.name = args.name;
        this.email = args.email;
        this.useDisclosure = true; // why demo with this off?

        // supplemental = [{include: true, signerMustAcknowledge: "view"},
        //   {include: true, signerMustAcknowledge: "accept"}];
        // no_interaction, view, accept, view_accept
        // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/create/#schema__envelopedefinition_documents_signermustacknowledge

        this.signing = true;
        this.loadingModal.show("Creating the envelope");
        await this.sendEnvelope();
        if (!this.envelopeId) {
            this.loadingModal.delayedHide("Could not send the envelope");
            this.signing = false;
            return
        }
        this.loadingModal.show("Creating the recipient view");
        const recipientViewUrl = await this.recipientView();
        if (!recipientViewUrl) {
            this.loadingModal.delayedHide("Could not open the recipient view");
            this.signing = false;
            return;
        }
        this.loadingModal.delayedHide("Opening the signing ceremony");
        await this.focusedView(recipientViewUrl);
        // window.open(recipientViewUrl, "_blank");
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
                    // 'bottom-left'|'bottom-center'|'bottom-right',  default: bottom-right
                    position: 'bottom-left'
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
                // Event: { returnUrl: url, type: "sessionEnd", sessionEndType: "signing_complete"}
                this.signing = false;
                if (event.type === "sessionEnd") {
                    this.messageModal("Signing Session Ended", `<p>Result: <b>${event.sessionEndType.replace("_", " ")}</b></p>`)
                } else {
                    this.messageModal("Signing Session Message", `<p>Event data: ${JSON.stringify(event)}</p>`)
                } 
                $(`#${this.signElId}`).addClass("hide").empty(); // Important! REMOVE the signing ceremony
                $(`#${this.mainElId}`).removeClass("hide");
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
     * Sets this.envelopeId. Setting it to false indicates an errror
     */
    async sendEnvelope() {
        this.envelopeId = false;
        const request = await this.createEnvRequest();
        // const request = await this.createSimpleEnvRequest();
        if (!request) {return false}
        const results = await this.callApi.callApiJson({
            apiMethod: `/accounts/${this.accountId}/envelopes`,
            httpMethod: "POST",
            req: request
        });
        if (results !== false) {
            this.envelopeId = results.envelopeId // good result
            return 
        } else {
            this.messageModal("Create Envelope Problem: Operation Canceled", 
            `<p>Error message: ${this.callApi.errMsg}</p>`)
            return
        }
    }

    /***
     * createEnvRequest returns an envelope request
     * 
     * Attributes used
     * this.name
     * this.email
     * this.clientUserId
     * this.templateId
     * this.role
     * this.useDisclosure
     */
    async createEnvRequest() {
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
        return req
    }

    async createSimpleEnvRequest() {
        const STATIC_DOC_URL = "../assets/Web site Access Agreement.pdf";
        const docB64 = await this.callApi.getDocB64(STATIC_DOC_URL);
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
    async recipientView(){
        const request = {
            authenticationMethod: "None",
            clientUserId: this.clientUserId,
            email: this.email,
            frameAncestors: FRAME_ANCESTORS,
            messageOrigins: MESSAGE_ORIGINS,
            returnUrl: RETURN_URL,
            userName: this.name,
        }
        const results = await this.callApi.callApiJson({
            apiMethod: `/accounts/${this.accountId}/envelopes/${this.envelopeId}/views/recipient`,
            httpMethod: "POST",
            req: request
        });
        return results === false ? false : results.url
    }
}

export { FocusedViewSigning };
