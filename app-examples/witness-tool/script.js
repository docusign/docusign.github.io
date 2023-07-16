// Copyright © 2022 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
import {
    CallApi,
    ImplicitGrant,
    UserInfo
} from "https://docusign.github.io/app-examples/library/callapi.js" 
import {
    msg,
    htmlMsg,
    adjustRows,
    errMsg,
    workingUpdate,
    usingHttps
} from "https://docusign.github.io/app-examples/library/utilities.js" 

$(function () {
    // Set basic variables
    const dsReturnUrl = "https://docusign.github.io/jsfiddleDsResponse.html";
    const logLevel = 0; // 0 is terse; 9 is verbose

    // Example settings
    // listStatusChanges query parameter values.
    // Based on DocuSign application's Sent folder query
    const qp_count = 40;
    const qp_from_date_days_ago = 60; // how many days back?
    const now = new Date();
    let t = new Date();
    t.setTime(now.getTime() - 24 * 1000 * 60 * 60 * qp_from_date_days_ago);
    const qp_from_date = t.toISOString();
    t.setTime(now.getTime() + 24 * 1000 * 60 * 60 * 5); // 5 days in future
    const qp_to_date = t.toISOString(); // 5 days in future
    const qp_include = "recipients,powerform,folders,delegations,workflow";
    const get_qp_include =
        "recipients,documents,extensions,powerform,custom_fields,folders,tabs";
    const qp_order_by = "last_modified";
    const qp_order = "desc";
    const qp_folder_types = "sentitems";
    const qp_include_purge_information = "true";
    const get_tabs_signer_num = 0; // Which signer the EnvelopeRecipientTabs:list should look up.

    //debugger; // uncomment with debugger open to find the right JS file.

    /*
     *  Results variables
     */
    let envelopes = []; // array of envelope results
    let nextUri = ""; // Are there more results? The query URL

    /*
     * The doit function is the example that is triggered by the
     * button. The user is already logged in (we have an access token).
     */
    let doit = async function doitf(event) {
        $("#doit").addClass("hide");
        if (!checkToken()) {
            // Check that we have a valid token
            return;
        }
        $("#blurb").addClass("hide");
        workingUpdate(true);
        $("#cardsSec").removeClass("hide");
        await listStatusChanges({
            account: data.userInfo.defaultAccount,
            userId: data.userInfo.userId,
            start_position: 0,
            count: qp_count,
            from_date: qp_from_date,
            to_date: qp_to_date,
            include: qp_include,
            order_by: qp_order_by,
            order: qp_order,
            folder_types: qp_folder_types,
            include_purge_information: qp_include_purge_information,
            status: $("#statuses").val()
        });
        $("#doit").removeClass("hide");
        workingUpdate(false);
    };
    doit = doit.bind(this);

    /*
     * listStatusChanges
     * If the arguments are null, then use the stored nextUri from a
     * prior call
     * https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/liststatuschanges/
     */
    async function listStatusChanges({
        account,
        userId,
        start_position,
        count,
        from_date,
        to_date,
        include,
        order_by,
        order,
        folder_types,
        include_purge_information,
        status
    }) {
        let qp = {
            start_position: start_position,
            count: count,
            from_date: from_date,
            to_date: to_date,
            user_id: userId,
            include: include,
            order_by: order_by,
            order: order,
            folder_types: folder_types,
            include_purge_information: include_purge_information,
            status: status
        };

        // Make the API call
        let apiMethod = `/accounts/${data.userInfo.defaultAccount}/envelopes`;
        if (nextUri) {
            apiMethod = nextUri; // includes query parameters
            qp = {};
        }
        const httpMethod = "GET";
        const results = await data.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: httpMethod,
            qp: qp
        });
        if (!results) {
            errMsg(data.callApi.errMsg);
            return false;
        }
        msg(
            `ListStatusChanges API call succeeded: ${results.totalSetSize} envelopes.`
        );
        nextUri = results.nextUri;
        if (nextUri) {
            $("#btnDoit").text("More Sent Envelopes Status");
        } else {
            $("#btnDoit").text("Sent Envelopes Status");
        }
        makeCards(results);
        if (logLevel > 5) {
            htmlMsg(
                `<p>List Status Changes. Response:</p><p><pre><code>${JSON.stringify(
                    results,
                    null,
                    4
                )}</code></pre></p>`
            );
        }
        return true;
    }

    /*
     * Envelope data helpers
     */
    function envelopeStatusString(status) {
        let statusString;
        if (status === "completed") {
            statusString = "✅ Completed";
        } else if (status === "sent" || status === "delivered") {
            statusString = "Waiting for others";
        } else {
            statusString = status;
        }
        return statusString;
    }
    function recipientName(recipient, none) {
        let name;
        if (recipient.lastName) {
            name = `${recipient.firstName} ${recipient.lastName}`;
        } else if (recipient.name) {
            name = recipient.name;
        } else if (recipient.roleName) {
            name = recipient.roleName;
        } else {
            name = `<i>${none}</i>`;
        }
        return name;
    }
    function dateTimeString(d) {
        const dTemp = new Date(Date.parse(d));
        return `${dTemp.toDateString()} ${dTemp.toLocaleTimeString()}`;
    }

    /*
     * makeCards
     * Store the envelope array in envelopes
     * Create cards from the array
     */
    function makeCards(results) {
        envelopes = results.envelopes || [];
        const cardsEl = $("#cards");
        $(".card-btn").off();
        cardsEl.empty();
        envelopes.forEach((envelope, i) => {
            let name = "<i>no signers</i>";
            if (envelope.recipients.signers.length) {
                name = recipientName(
                    envelope.recipients.signers[0],
                    "no signer name"
                );
            }
            cardsEl.append(`
      <div class="card border border-primary shadow-0 mb-3" style="max-width: 22rem;" data-i="${i}">
        <div class="card-body">
          <h6 class="card-title">${envelope.emailSubject}</h6>
          <div class="card-text">
          <p>To: ${name}</p>
          <p>Status: ${envelopeStatusString(envelope.status)}</p>
          <p class="small">Last Changed: ${dateTimeString(
              envelope.statusChangedDateTime
          )}
          </p>
          <div>
        </div>
        <div class="card-footer text-center">
          <button type="button"
            class="btn btn-secondary btn-sm card-btn-details"
            data-i="${i}"
            data-mdb-toggle="modal"
            data-mdb-target="#envelopeModal">Details</button>
          <button type="button"
            class="btn btn-secondary btn-sm card-btn-json ms-2"
            data-i="${i}"
            data-mdb-toggle="modal"
            data-mdb-target="#jsonModal">JSON</button>
          <button type="button"
            class="btn btn-secondary btn-sm card-btn-get ms-2"
            data-i="${i}"
            data-mdb-toggle="modal"
            data-mdb-target="#jsonModal">Env GET</button>
        </div>
      </div>
      `);
        });
        $(".card-btn-details").on("click", null, envelopes, detailsHandler);
        $(".card-btn-json").on("click", null, envelopes, jsonHandler);
        $(".card-btn-get").on("click", null, envelopes, getHandler);
    }

    /*
     * detailsHandler
     * create a modal with the envelope's details when a card's <Details>
     * button is clicked
     *
     * NOTE This is an example. It is NOT a complete implementation of an
     * envelope's nor recipient's details. Eg, send via SMS is not handled.
     * Nor many other envelope features.
     */
    async function detailsHandler(e) {
        const envelopes = e.data;
        const envelope = envelopes[parseInt(e.currentTarget.dataset.i)];
        // https://developer.mozilla.org/en-US/docs/Learn/HTML/Howto/Use_data_attributes
        const modal = $("#envelopeModal");
        const modalTitle = modal.find(".modal-title");
        modalTitle.empty();
        const modalBody = modal.find(".modal-body");
        modalBody.empty();
        modalTitle.text(envelope.emailSubject);
        const envelopeId = envelope.envelopeId;
        let bodyHtml = "";
        bodyHtml = `<div class="envHeader">
    <p>Envelope ID ${envelopeId}<p>
    <p>From: ${envelope.sender.userName}<p>
    <p class="small">Last change on ${dateTimeString(
        envelope.statusChangedDateTime
    )}</p>
    <p class="small">Sent on ${dateTimeString(envelope.sentDateTime)}</p>
    </div>
    <h6 class="mt-2">${envelopeStatusString(envelope.status)}</h6>`;

        bodyHtml += `<h6 class="mt-3">Recipients</h6>`;
        bodyHtml += await addRecipients(
            envelope,
            envelope.recipients.signers,
            "Signer"
        );
        bodyHtml += await addRecipients(
            envelope,
            envelope.recipients.agents,
            "Agent"
        );
        bodyHtml += await addRecipients(
            envelope,
            envelope.recipients.editors,
            "Editor"
        );
        bodyHtml += await addRecipients(
            envelope,
            envelope.recipients.intermediaries,
            "Intermediary"
        );
        bodyHtml += await addRecipients(
            envelope,
            envelope.recipients.carbonCopies,
            "CC"
        );
        bodyHtml += await addRecipients(
            envelope,
            envelope.recipients.certifiedDeliveries,
            "Certified Delivery"
        );
        bodyHtml += await addRecipients(
            envelope,
            envelope.recipients.inPersonSigners,
            "In-person Signer"
        );
        bodyHtml += await addRecipients(
            envelope,
            envelope.recipients.witnesses,
            "Witness"
        );
        bodyHtml += await addRecipients(
            envelope,
            envelope.recipients.notaries,
            "Notary"
        );

        modalBody.html(bodyHtml);
    }

    /*
     * addRecipients adds the recipient info to the details modal
     */
    async function addRecipients(envelope, recipients, style) {
        function recipientStatus(status) {
            let statusString;
            if (style === "Signer") {
                if (status === "completed") {
                    statusString = "🖊 Signed";
                } else if (status === "sent") {
                    statusString = "⌛ Needs to sign";
                } else if (status === "delivered") {
                    statusString = "👀 Viewed";
                } else {
                    statusString = status;
                }
            } else {
                statusString = `${style}: ${status}`;
            }
            return statusString;
        }
        function recipientDate(r) {
            const status = r.status;
            let str;
            if (style === "Signer") {
                if (status === "completed") {
                    str = `Signed on ${dateTimeString(r.signedDateTime)}`;
                } else if (status === "sent") {
                    str = `Sent ${dateTimeString(r.sentDateTime)}`;
                } else if (status === "delivered") {
                    str = `Viewed ${dateTimeString(r.deliveredDateTime)}`;
                } else {
                    str = "";
                }
            } else {
                if (status === "completed") {
                    str = `Completed on ${dateTimeString(r.signedDateTime)}`;
                } else if (status === "sent") {
                    str = `Sent ${dateTimeString(r.sentDateTime)}`;
                } else if (status === "delivered") {
                    str = `Viewed ${dateTimeString(r.deliveredDateTime)}`;
                } else {
                    str = "";
                }
            }
            return str;
        }

        /*
         * emailSms -- return the html for the email / SMS notification
         */
        function emailSms(recipientsExtra, recipient) {
            let html = "";
            if (recipient.email) {
                html += `<p class="small">${recipient.email}</p>`;
            }
            if (recipient.additionalNotifications) {
                recipient.additionalNotifications.forEach((notification) => {
                    if (notification.phoneNumber) {
                        html += `<p class="small">${notification.secondaryDeliveryMethod}: 
              +${notification.phoneNumber.countryCode}
              ${notification.phoneNumber.number}</p>`;
                    }
                });
            }
            // Find the phone number in recipientsExtra--the phone number
            // is not included in the EnvelopeListStatus if it's SMS only (no email)
            // recipientsExtra is the response from EnvelopeRecipients.List
            if (!recipient.email && recipientsExtra) {
                // find the current recipient within recipientsExtra
                let recipientsExtraSMS = recipientsExtra.signers.concat(
                    recipientsExtra.carbonCopies,
                    recipientsExtra.certifiedDeliveries
                );
                let recipientExtra = recipientsExtraSMS.find(
                    (re) => re.recipientId === recipient.recipientId
                );
                if (recipientExtra && recipientExtra.phoneNumber) {
                    const deliveryMethod =
                        recipientExtra.deliveryMethod === "sms"
                            ? "SMS"
                            : recipientExtra.deliveryMethod;
                    html += `<p class="small">${deliveryMethod}: 
                    +${recipientExtra.phoneNumber.countryCode}
                    ${recipientExtra.phoneNumber.number}</p>`;
                }
            }
            return html;
        }

        // Check to see if signer, cc, or Certified Delivery recipients
        // did not use email. Get extra info via API call if so
        let getListRecipients = false;
        if (
            !envelope.recipientsExtra &&
            (style === "Signer" ||
                style === "CC" ||
                style === "Certified Delivery")
        ) {
            recipients.forEach((r) => {
                if (r.deliveryMethod && r.deliveryMethod !== "email") {
                    getListRecipients = true;
                }
            });
            if (getListRecipients) {
                envelope.recipientsExtra = await callListRecipients(
                    envelope.envelopeId
                );
            }
        }

        let html = "";
        recipients.forEach((r) => {
            html += `<div class="row mb-4">
      <div class="col-md-6 recipientDetails">
         <h6><span class='chk'>${r.status === "completed" ? "✅" : ""}</span>
         ${recipientName(r, "no name")}</h6>
         ${emailSms(envelope.recipientsExtra, r)}
     </div><div class="col-md-6">
        <h6>${recipientStatus(r.status)}</h6>
        <p class="small">${recipientDate(r)}</p>
     </div></div>`;
        });
        return html;
    }

    /*
     * jsonHandler creates a modal to show the envelope's JSON response
     */
    function jsonHandler(e) {
        const envelopes = e.data;
        const envelope = envelopes[parseInt(e.currentTarget.dataset.i)];
        // https://developer.mozilla.org/en-US/docs/Learn/HTML/Howto/Use_data_attributes
        const modal = $("#jsonModal");
        const modalTitle = modal.find(".modal-title");
        $("#cpJson").off();
        modalTitle.empty();
        const modalBody = modal.find(".modal-body");
        modalBody.empty();
        modalTitle.html(`Subject: ${envelope.emailSubject}
      <button type="button" id="cpJson" class="btn btn-secondary ms-4">
      Copy JSON to clipboard</button>`);
        $("#cpJson").on("click", null, envelope, cpJsonHandler);
        let bodyHtml = "";
        bodyHtml = `<p>Envelope ID ${envelope.envelopeId}<p>
    <pre><code>${JSON.stringify(envelope, null, 4)}</code></pre>`;
        modalBody.html(bodyHtml);
    }

    /*
     * cpJsonHandler -- copy the envelope's JSON response to the clipboard
     */
    async function cpJsonHandler(e) {
        // https://masteringjs.io/tutorials/fundamentals/wait-1-second-then
        function delay(time) {
            return new Promise((resolve) => setTimeout(resolve, time));
        }

        const cpButton = e.currentTarget;
        const envelope = e.data;
        const getJson = e.currentTarget.dataset.getjson;
        $(cpButton).attr("disabled");
        $(cpButton).text("Working");
        let msg = "Copied!";
        const downloadData = getJson ? envelope.getJson : envelope;
        try {
            await navigator.clipboard.writeText(
                JSON.stringify(downloadData, null, 4)
            );
        } catch {
            msg = "Could not copy!";
        }
        $(cpButton).text(msg);
        await delay(4000);
        $(cpButton).text("Copy JSON to clipbloard");
        $(cpButton).removeAttr("disabled");
    }

    /*
     * getHandler creates a modal to show the envelopes:get and 
     * EnvelopeRecipientTabs:list JSON response
     * We use get_tabs_signer_num to decide which signer recipient we want
     */
    let getHandler = async function getHandlerF(e) {
        const envelopes = e.data;
        const envelope = envelopes[parseInt(e.currentTarget.dataset.i)];
        // https://developer.mozilla.org/en-US/docs/Learn/HTML/Howto/Use_data_attributes
        const modal = $("#jsonModal");
        const modalTitle = modal.find(".modal-title");
        $("#cpJson").off();
        modalTitle.empty();
        const modalBody = modal.find(".modal-body");
        modalBody.empty();
        modalBody.html("<h4>Working...</h4>");
        let getEnvJson = await callGet(envelope.envelopeId);
        let signer = getEnvJson.recipients.signers && getEnvJson.recipients.signers[get_tabs_signer_num];
        let signerName = signer ? signer.name : "";
        let signerRecipientId = signer ? signer.recipientId : false;
        let getTabs = await callGetTabs(envelope.envelopeId, signerRecipientId);
        let getJson = {};
        getJson[`EnvelopeGet`] = getEnvJson;
        getJson[`TabsGet for recipient ID ${signerRecipientId}`] = getTabs;
        envelope.getJson = getJson;
        modalTitle.html(`Envelopes.get -- Subject: ${envelope.emailSubject}
      <button type="button" id="cpJson" class="btn btn-secondary ms-4" data-getjson="true">
      Copy JSON to clipboard</button>`);
        $("#cpJson").on("click", null, envelope, cpJsonHandler);
        let bodyHtml = "";
        bodyHtml = `<p>Envelopes:get and 
        EnvelopeRecipientTabs:list for recipient ID ${signerRecipientId} -- ${signerName}</p>
        <pre><code>${JSON.stringify(
            getJson,
            null,
            4
        )}</code></pre>`;
        modalBody.html(bodyHtml);
    };
    getHandler = getHandler.bind(this);

    /*
     * call envelopes:get
     */
    async function callGet(envelopeId) {
        let apiMethod = `/accounts/${data.userInfo.defaultAccount}/envelopes/${envelopeId}?include=${get_qp_include}`;
        let r = await data.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: "GET"
        });
        if (!r) {
            errMsg(data.callApi.errMsg);
            msg("⬆️ Envelopes:get call");
        }
        return r;
    }

    /**
     * 
     * callGetTabs -- calls EnvelopeRecipientTabs:list
     */
    async function callGetTabs(envelopeId, recipientId) {
        if (recipientId === false) {return {}}
        let apiMethod = `/accounts/${data.userInfo.defaultAccount}/envelopes/${envelopeId}/recipients/${recipientId}/tabs`;
        let r = await data.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: "GET"
        });
        if (!r) {
            errMsg(data.callApi.errMsg);
            msg("⬆️ EnvelopeRecipientTabs:list call");
        }
        return r;
    }

    /*
     * callListRecipients
     */
    async function callListRecipients(envelopeId) {
        let apiMethod = `/accounts/${data.userInfo.defaultAccount}/envelopes/${envelopeId}/recipients`;
        let r = await data.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: "GET"
        });
        if (r) {
            msg("Called Envelopes:ListRecipients successfully.");
        } else {
            errMsg(data.callApi.errMsg);
            msg("⬆️ Envelopes:ListRecipients call");
        }
        return r;
    }

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

    let messageListener = async function messageListenerf(event) {
        if (!event.data) {
            return;
        }
        const source = event.data.source;
        if (source === "oauthResponse" && data.implicitGrant) {
            await implicitGrantMsg(event.data);
            return;
        }
    };
    messageListener = messageListener.bind(this);

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

    let login = async function loginf(event) {
        $("#login").addClass("hide");
        await data.implicitGrant.login();
    };
    login = login.bind(this);

    // Mainline
    let data = {
        implicitGrant: null,
        userInfo: null,
        callApi: null,
        loggedIn: () => $("#doit").removeClass("hide")
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
    }
});
