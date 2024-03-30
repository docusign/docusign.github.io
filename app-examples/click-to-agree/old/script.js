// Copyright © 2024 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

import {
    CallApi,
    ImplicitGrant,
    UserInfo
} from "../../library/callapi.js" 
//} from "https://docusign.github.io/app-examples/library/callapi.js" 
 
import {
    msg,
    htmlMsg,
    adjustRows,
    errMsg,
    workingUpdate,
    usingHttps,
    getStoredAccountId,
    setStoredAccountId,
    toast,
    //switchAccountsModal
} from "../../library/utilities.js" 
//} from "https://docusign.github.io/app-examples/library/utilities.js" 

import { CheckTemplates 
} from "../../library/checkTemplates.js";
//} from "https://docusign.github.io/app-examples/library/checkTemplates.js";

$(function () {
    // #####################################################
    const logLevel = 0; // 0 is terse; 9 is verbose
    // Change the log level to see the requests / responses
    // #####################################################

    // Example settings
    const dsReturnUrl = "https://docusign.github.io/jsfiddleDsResponse.html";
    const recipientId = "101"; // Will be used for the signer
    const documentId = "202"; // Will be used for the uploaded document
    const intialsHereX = -25; // X displacement from page edge
    const intialsHereY = 0.5; // Y multiplier
    const signHereX = -200; // X displacement from page edge
    const signHereY = -200; // Y displacement from page bottom

    // File variables are filled in when the user uploads a file
    let fileB64;
    let fileExtension;
    let fileName;

    //debugger; // uncomment with debugger open to find the right JS file.

    /*
     * The doit function is the example that is triggered by the
     * button. The user is already logged in (we have an access token).
     */
    let doit = async function doitf(event) {
        if (!checkToken()) {
            // Check that we have a valid token
            return;
        }

        /*
         * Plan:
         * 1. Create envelope as draft with the uploaded document
         * 2. Get document details (size, number of pages)
         * 3. Add tabs to each page as appropriate
         * 4. Send the envelope
         */

        if (!fileB64) {
            errMsg("Please select a document.");
            return;
        }

        const mode = $("#mode").val();
        const signer = {
            name: null,
            email: null,
            smsNational: null,
            smsCc: null,
            mode: mode
        };

        const name = $("#name").val();
        const email = $("#email").val();
        if (!name) {
            errMsg("Please enter the signer's name.");
            return;
        }
        signer.name = name;
        if (mode === "emailSms" || mode === "email") {
            if (email) {
                signer.email = email;
            } else {
                errMsg("Please enter the signer's email.");
                return;
            }
        }

        // parse the phone number into country code and national components
        // using the Google libphonenumber
        if (mode === "emailSms" || mode === "sms") {
            let phoneNumber;
            const rawTel = data.iti.getNumber() || "";
            try {
                phoneNumber = libphonenumber.parsePhoneNumber(rawTel);
            } catch (error) {
                phoneNumber = null;
            }
            if (phoneNumber) {
                signer.smsNational = phoneNumber.nationalNumber;
                signer.smsCc = phoneNumber.countryCallingCode;
            } else {
                errMsg("Please enter the signer's SMS number.");
                return;
            }
        }
        // data entry checks are now done
        $("#doit").addClass("hide");
        workingUpdate(true);

        //  * 1. Create envelope as draft with the uploaded document
        try {
            const envelopeId = await createEnvelope(signer);
            if (envelopeId) {
                msg(
                    `Envelope ${envelopeId} created. Get document information...`
                );
            } else {
                throw new Error();
            }
            //  * 2. Get document details (size, number of pages)
            const docInfo = await getDocuments(envelopeId);
            if (docInfo) {
                msg(`done. Add tabs...`);
            } else {
                throw new Error();
            }

            //* 3. Add tabs to each page as appropriate
            const addTabsStatus = await addTabs(envelopeId, docInfo);
            if (addTabsStatus) {
                msg(`done. Sending the envelope...`);
            } else {
                throw new Error();
            }

            // * 4. Send the envelope
            const sentResponse = await sendEnvelope(envelopeId);
            if (sentResponse) {
                msg(`done! `);
            }
        } catch {
        } finally {
            $("#doit").removeClass("hide");
            workingUpdate(false);
        }
    };
    doit = doit.bind(this);

    /*
     *  Create the envelope by completely specifying the envelope.
     *  Often the recommended alternative is to first create a template
     *  on the DocuSign platform, then reference the template when
     *  creating the envelope. See the other examples...
     */
    async function createEnvelope({ name, email, smsNational, smsCc, mode }) {
        const req = {
            emailSubject: "Please sign the attached document",
            status: "created",
            customFields: {
                // metadata that can be used by other business processes
                listCustomFields: [
                    {
                        name: "Envelope list custom field 1",
                        show: "true", // true: shown on the certificate of completion
                        value: "value 1"
                    },
                    {
                        name: "Envelope list custom field 2",
                        show: "true",
                        value: "value 2"
                    }
                ],
                textCustomFields: [
                    {
                        name: "Envelope text custom field 1",
                        show: "true",
                        value: "value 1"
                    },
                    {
                        name: "Envelope text custom field 2",
                        show: "true",
                        value: "value 2"
                    }
                ]
            },
            documents: [
                {
                    name: fileName,
                    documentBase64: fileB64,
                    fileExtension: fileExtension,
                    documentId: documentId
                }
            ],
            recipients: {
                signers: [
                    {
                        name: name,
                        email: email,
                        recipientId: recipientId
                    }
                ]
            }
        };
        // handle delivery addressing for the different modes:
        // email, emailSms, sms
        if (mode === "email" || mode === "emailSms") {
            req.recipients.signers[0].email = email;
        }

        if (mode === "emailSms") {
            req.recipients.signers[0].additionalNotifications = [
                {
                    secondaryDeliveryMethod: "SMS",
                    phoneNumber: { number: smsNational, countryCode: smsCc }
                }
            ];
        }

        if (mode === "sms") {
            req.recipients.signers[0].deliveryMethod = "SMS";
            req.recipients.signers[0].phoneNumber = {
                countryCode: smsCc,
                number: smsNational
            };
        }

        // Make the create envelope API call
        msg(`Creating envelope.`);
        const apiMethod = `/accounts/${data.userInfo.defaultAccount}/envelopes`;
        const httpMethod = "POST";
        const results = await data.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: httpMethod,
            req: req
        });
        if (results === false) {
            errMsg(data.callApi.errMsg);
            return false;
        }
        logger({ title: "Envelope created", req: req, response: results });
        return results.envelopeId;
    }

    /*
     * getDocuments(envelopeId);
     */
    async function getDocuments(envelopeId) {
        const apiMethod = `/accounts/${data.userInfo.defaultAccount}/envelopes/${envelopeId}/documents`;
        const httpMethod = "GET";
        const results = await data.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: httpMethod
        });
        if (results === false) {
            errMsg(data.callApi.errMsg);
            return false;
        }
        logger({ title: "Envelopes#get", response: results });
        return results;
    }

    /*
     *  addTabs(envelopeId, pages);
     */
    async function addTabs(envelopeId, docInfo) {
        // only looking at first document
        const pages = docInfo.envelopeDocuments[0].pages;
        const envelopeRecipientTabs = {
            dateSignedTabs: [],
            initialHereTabs: [],
            signHereTabs: [],
            textTabs: []
        };

        /*
         * pages[]:
         *   "pageId": "6c04f47b-1890-4744-a774-a74b61d1129a",
         *   "sequence": "1",
         *   "height": "540",
         *   "width": "960",
         *   "dpi": "72"
         */

        // Add an initialsHere tab on all but last page
        // Last page, add "Agreed", SignHere, DateSigned tabs
        const lastPageIndex = pages.length - 1;
        const yTextLine = 30;
        const ySignLine = 40;
        pages.forEach((page, index) => {
            if (index === lastPageIndex) {
                envelopeRecipientTabs.textTabs.push({
                    bold: "true",
                    documentId: documentId,
                    font: "Tahoma",
                    fontSize: "Size16",
                    italic: "true",
                    locked: "true",
                    pageNumber: (index + 1).toString(),
                    recipientId: recipientId,
                    tabLabel: `text Agreed`,
                    value: "Agreed:",
                    xPosition: parseInt(page.width) + signHereX,
                    yPosition: parseInt(page.height) + signHereY
                });
                envelopeRecipientTabs.signHereTabs.push({
                    documentId: documentId,
                    pageNumber: (index + 1).toString(),
                    recipientId: recipientId,
                    tabLabel: `Sign here`,
                    xPosition: parseInt(page.width) + signHereX,
                    yPosition: parseInt(page.height) + signHereY + yTextLine
                });
                envelopeRecipientTabs.dateSignedTabs.push({
                    documentId: documentId,
                    font: "Tahoma",
                    fontSize: "Size14",
                    pageNumber: (index + 1).toString(),
                    recipientId: recipientId,
                    tabLabel: `date signed`,
                    xPosition: parseInt(page.width) + signHereX,
                    yPosition:
                        parseInt(page.height) +
                        signHereY +
                        yTextLine +
                        ySignLine
                });
            } else {
                // Not the last page!
                // initialHere in middle of page
                envelopeRecipientTabs.initialHereTabs.push({
                    documentId: documentId,
                    pageNumber: (index + 1).toString(),
                    recipientId: recipientId,
                    tabLabel: `initial here pg ${index + 1}`,
                    xPosition: parseInt(page.width) + intialsHereX,
                    yPosition: Math.ceil(parseFloat(page.height) * intialsHereY)
                });
            }
        });
        // Create the envelope's tabs
        const apiMethod = `/accounts/${data.userInfo.defaultAccount}/envelopes/${envelopeId}/recipients/${recipientId}/tabs`;
        const httpMethod = "POST";
        const results = await data.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: httpMethod,
            req: envelopeRecipientTabs
        });
        if (results === false) {
            errMsg(data.callApi.errMsg);
            return false;
        }
        logger({
            title: "EnvelopeRecipientTabs#create",
            req: envelopeRecipientTabs,
            response: results
        });
        return true;
    }

    /*
     * sendEnvelope(envelopeId)
     * Change status to "sent"
     */
    async function sendEnvelope(envelopeId) {
        const apiMethod = `/accounts/${data.userInfo.defaultAccount}/envelopes/${envelopeId}`;
        const httpMethod = "PUT";
        const req = { status: "sent" };
        const results = await data.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: httpMethod,
            req: req
        });
        if (results === false) {
            errMsg(data.callApi.errMsg);
            return false;
        }
        logger({ title: "Envelopes#update", req: req, response: results });
        return true;

        return results;
    }

    /*
     * chooseFile button was clicked
     */
    let chooseFile = async function chooseFilef(evt) {
        const fileObj = evt.target.files[0];
        const reader = new FileReader();

        let fileloaded = (e) => {
            // e.target.result is the file's content as a data url
            // Data url: data:[<mediatype>][;base64],<data>
            const dataUrlParts = e.target.result.split(",");
            const dataPart = dataUrlParts[1];
            const metadataParts = dataUrlParts[0].split(";");
            const b64encoded = metadataParts.length > 1;
            const mediatype =
                metadataParts[0].length > 5
                    ? metadataParts[0].substring(5)
                    : false;
            // Set file globals
            fileB64 = b64encoded ? dataPart : btoa(decodeURI(dataPart));
            fileExtension = fileObj.name.split(".")[1];
            fileName = fileObj.name;
            if (logLevel > 0) {
                msg(
                    `File name: "${fileObj.name}". file extension: ${fileExtension} media type: ${mediatype}.`
                );
            }
        };

        // Mainline of the method
        fileloaded = fileloaded.bind(this);
        reader.onload = fileloaded;
        reader.readAsDataURL(fileObj);
    };
    chooseFile = chooseFile.bind(this);

    /////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////

    /* Checks that the access token is still good.
     * Prompts for login if not
     */
    function checkToken() {
        if (data.implicitGrant.checkToken()) {
            // ok
            return true;
        } else {
            // not ok
            $("#login").removeClass("hide");
            $("#doit").addClass("hide");

            // reset everything
            msg("Please login");
        }
    }

    /*
     * Receives and dispatches incoming messages
     */
    let messageListener = async function messageListenerf(event) {
        if (!event.data) {
            return;
        }
        const source = event.data.source;
        if (source === "dsResponse") {
            signingCeremonyEnded(event.data);
            return;
        }
        if (source === "oauthResponse" && data.implicitGrant) {
            await implicitGrantMsg(event.data);
            return;
        }
    };
    messageListener = messageListener.bind(this);

    /*
     * Process incoming implicit grant response
     */
    async function implicitGrantMsg(eventData) {
        const oAuthResponse = data.implicitGrant.handleMessage(eventData);
        if (oAuthResponse === "ok") {
            if (await completeLogin()) {
                data.loggedIn();
            }
        } else if (oAuthResponse === "error") {
            $("#login").removeClass("hide");
            const errHtml = `<p class="text-danger">${data.implicitGrant.errMsg}</p>`;
            htmlMsg(errHtml);
        }
    }

    /*
     * Complete login process including
     * Get user information
     * Set up CallApi object
     * update the user
     */
    async function completeLogin() {
        data.userInfo = new UserInfo({
            accessToken: data.implicitGrant.accessToken,
            workingUpdateF: workingUpdate
        });
        const ok = await data.userInfo.getUserInfo();
        if (ok) {
            data.callApi = new CallApi({
                accessToken: data.implicitGrant.accessToken,
                apiBaseUrl: data.userInfo.defaultBaseUrl
            });
            if (logLevel === 0) {
                htmlMsg(
                    `<p><b>${data.userInfo.name}</b><br/>` +
                        `${data.userInfo.email}<br/>` +
                        `${data.userInfo.defaultAccountName}</p>`
                );
            } else {
                htmlMsg(
                    `<p><b>OAuth & UserInfo Results</b><br/>` +
                        `Name: ${data.userInfo.name}` +
                        ` (${data.userInfo.userId})<br/>` +
                        `Email: ${data.userInfo.email}<br/>` +
                        `Default account: ${data.userInfo.defaultAccountName}` +
                        ` (${data.userInfo.defaultAccount})<br/>` +
                        `Base URL: ${data.userInfo.defaultBaseUrl}</p>`
                );
            }
        } else {
            // Did not complete the login
            $("#login").removeClass("hide");
            const errHtml = `<p class="text-danger">${data.userInfo.errMsg}</p>`;
            htmlMsg(errHtml);
        }
        return ok;
    }

    /*
     * log API calls
     */
    function logger({ title, req, response }) {
        if (logLevel === 0) {
            return;
        }
        let reqHtml = `<h2>${title}</h2>`;
        if (req) {
            reqHtml += `<p>Request:</p><p><pre><code>${JSON.stringify(
                req,
                null,
                4
            )}</code></pre></p>`;
        }
        htmlMsg(reqHtml);
        htmlMsg(
            `<p>Response:</p><p><pre><code>${JSON.stringify(
                response,
                null,
                4
            )}</code></pre></p>`
        );
    }

    /*
     * Login button was clicked
     */
    let login = async function loginf(event) {
        $("#login").addClass("hide");
        await data.implicitGrant.login();
    };
    login = login.bind(this);

    const loggedIn = function loggedInF() {
        $("#name").val(data.userInfo.name);
        $("#email").val(data.userInfo.email);
        $("#doit").removeClass("hide");
    };

    // Mainline
    let data = {
        implicitGrant: null,
        userInfo: null,
        callApi: null,
        loggedIn: loggedIn,
        iti: null // instance of the telephone input
    };

    // The mainline
    if (usingHttps()) {
        adjustRows();
        data.implicitGrant = new ImplicitGrant({
            workingUpdateF: workingUpdate
        });

        window.addEventListener("message", messageListener);
        $("#btnOauth").click(login);
        $("#btnDoit").click(doit);
        $("#chooseFile").change(chooseFile);
        const smsEl = document.querySelector("#sms");
        data.iti = intlTelInput(smsEl, {
            utilsScript:
                "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.min.js"
        });
    }
});
