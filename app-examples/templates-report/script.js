// Copyright © 2023 Docusign, Inc.
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
    usingHttps,
    getStoredAccountId,
    setStoredAccountId,
    //switchAccountsModal
} from "https://docusign.github.io/app-examples/library/utilities.js" 

$(function () {
    // Set basic variables
    const dsReturnUrl = "https://docusign.github.io/jsfiddleDsResponse.html";
    const logLevel = 0; // 0 is terse; 9 is verbose
    let accountName, accountId, accountExternalId, 
        accountBaseUrl, accountIsDefault, corsError; // current account info
    let templates = []; // holds the report
    /** 
     * Report attributes
            "templateId": "069f97db-8039-4ed2-931d-8ca74d5e9fc9",
            "name": "TT-6007 Data from hidden conditional fields",
            "shared": "false",
            "passwordProtected": "false",
            "description": "",
            "created": "2023-06-26T13:15:22.2470000Z",
            "lastModified": "2023-06-26T13:29:16.6470000Z",
            "lastUsed": "2023-06-26T13:15:22.3170000Z",
            "folderId": "86be25cd-b2e5-4341-9d3d-19d65e70914e",
            "folderName": "Templates",
            "autoMatch": "true",
            "favoritedByMe": "false",
            "emailSubject": "Complete with Docusign: Data from hidden conditional fields.pdf",
            ownerUserName
            ownerUserId
            ownerEmail  // from the owner obj--
            // owner obj from the list results
            "owner": {
                "userName": "Larry Kluger",
                "userId": "7b3d1245-0106-4045-a724-5b3ff3f9f2f1",
                "email": "larry@worldwidecorp.us"

            // additional attributes from the templates:get
            lastModifiedByuserName": "Larry Kluger",
            lastModifiedByuserId": "7b3d1245-0106-4045-a724-5b3ff3f9f2f1",
            lastModifiedByemail
            "folderId": "86be25cd-b2e5-4341-9d3d-19d65e70914e",
            "folderName": "Templates",
            brandId
            // brandName
            },
     */ 
    const templateCoreAttributeCopy = [
        "templateId", "name", "shared", "passwordProtected", "description",
        "created", "lastModified", "lastUsed", "folderId", "folderName",
        "autoMatch", "favoritedByMe", "emailSubject"
    ]
    let brands = {}; // key -- brandId, value: brandName
    const csvHeader = [
        "templateId", "name", "description", "emailSubject", 
        "brandId", "brandName", "ownerUserName", "ownerEmail", 
        "lastModifiedByuserName", "lastModifiedByemail",
        "created", "lastModified", "lastUsed", "folderId", "folderName",
        "autoMatch", "favoritedByMe", "shared", "passwordProtected", 
        "ownerUserId", "lastModifiedByuserId"
    ]
    
    debugger; // uncomment with debugger open to find the right JS file.

    /*
     * The doit function is the example that is triggered by the
     * button. The user is already logged in (we have an access token).
     */
    let doit = async function doitf(event) {
        $("#doit").addClass("hide");
        $("#download").addClass("hide");
        if (!checkToken()) {
            // Check that we have a valid token
            return;
        }
        workingUpdate(true);
        brands = {}
        templates = [];
        if($("#msgHeader").length === 0) {
            htmlMsg(`<h3 id="msgHeader"></h3>`);
            htmlMsg(`<p id="msg2"></p>`);
          }
        $("#msgHeader").text("Download brand information");
        $("#msg2").text("Awaiting response");
        await listBrands();
        await templateReport();
        await templateDetails();
        $("#download").removeClass("hide");
        $("#doit").removeClass("hide");
        workingUpdate(false);
    };
    doit = doit.bind(this);

    /*
     * The download function creates and downloads the CSV
     */
    let download = function downloadf(event) {
        $("#doit").addClass("hide");
        $("#download").addClass("hide");
        if (templates.length === 0) {
            alert("Nothing to download");
            return
        }
        workingUpdate(true);
        doDownload();
        $("#download").removeClass("hide");
        $("#doit").removeClass("hide");
        workingUpdate(false);
    };
    download = download.bind(this);

    /**
     * listBrands
     */
    async function listBrands() {
        const results = await data.callApi.callApiJson({
            apiMethod: `/accounts/${accountId}/brands`,
            httpMethod: "GET",
        });
        if (results !== false) {
            results.brands.forEach(brand => {
                brands[brand.brandId] = brand.brandName
            })
        }
    }

    /**
     * templateReport downloads the top level of template info
     */
    async function templateReport() {
        $("#msgHeader").text("Downloading template information");
        $("#msg2").text("Awaiting response");
        const pageSize = 50;
        let nextUri = `/accounts/${accountId}/templates?start_position=0&count=${pageSize}&order=desc&order_by=modified&include=favorite_template_status&modified_from_date=2002-12-31T22:00:00.000Z`;

        // See https://blog.codepen.io/2016/06/08/can-adjust-infinite-loop-protection-timing/
        if (window.CP && window.CP.PenTimer) window.CP.PenTimer.MAX_TIME_IN_LOOP_WO_EXIT = 6000; 
        while (nextUri) {
            const results = await data.callApi.callApiJson({
                apiMethod: nextUri,
                httpMethod: "GET",
            });
            if (results === false) {
                nextUri = null;
            } else {
                nextUri = results.nextUri
                processListResults(results)
            }
        }
    }

    /**
     * process the Templates:list results
     */
    function processListResults(results) {
        const envelopeTemplates = results.envelopeTemplates;
        envelopeTemplates.forEach(t => {
            let template = {};
            templateCoreAttributeCopy.forEach(a => {template[a] = t[a]});
            template["ownerUserName"] = t.owner?t.owner.userName:"";
            template["ownerUserId"] = t.owner?t.owner.userId:"";
            template["ownerEmail"] = t.owner?t.owner.email:"";
            templates.push(template);
            $("#msg2").text(`${templates.length} templates.`);
        })
    }

    /**
     * templateDetails -- get information on each of the templates
     */
    async function templateDetails() {
        $("#msgHeader").text(`Downloading individual template information.`);
        $("#msg2").text(`Awaiting response.`);

        const urlBase = `/accounts/${accountId}/templates`;
        let i = 1;
        for (const template of templates) {
            const results = await data.callApi.callApiJson({
                apiMethod: `${urlBase}/${template.templateId}`,
                httpMethod: "GET",
            });
            if (results !== false) {
                processGetResults(template, results, i)
            }
            i++;
        }
    }

    /**
     * processGetResults -- add in additional information for the 
     * individual templates
     */
    function processGetResults(template, r, i) {
        // r -- results
        template.lastModifiedByuserName = r.lastModifiedBy?r.lastModifiedBy.userName:"";
        template.lastModifiedByuserId = r.lastModifiedBy?r.lastModifiedBy.userId:"";
        template.lastModifiedByemail = r.lastModifiedBy?r.lastModifiedBy.email:"";
        template.folderId = r.folderId;
        template.folderName = r.folderName;
        template.brandId = r.brandId;
        template.brandName = brands[r.brandId] || "";
        $("#msg2").text(`Template ${i}.`);
    }

    /**
     * doDownload -- create the CSV and download it
     */
    async function doDownload() {
        // create the CSV
        let contents = [];
        contents.push (csvHeader);
        templates.forEach(template => {
            let row = [];
            csvHeader.forEach(h => {row.push(template[h])})
            contents.push(row)
        });
        const output = makeCSV(contents);
  
        // download it
        const blob = new Blob([output], {type: "text/csv"});
        let fileDownloadUrl = await blobToDataUrl(blob);
        $("#downloadAnchor").attr("href", fileDownloadUrl)
        $("#downloadAnchor")[0].click();
        URL.revokeObjectURL(fileDownloadUrl);  // free up storage--no longer needed.
    }

    /**
     * Function returns the content as a CSV string
     * See https://stackoverflow.com/a/20623188/64904
     * Parameter content:
     *   [
     *     [header1, header2],
     *     [data1, data2]
     *     ...
     *  ]
     * NB Does not support items of type Date
     */
    function makeCSV (content) {
        let csv = '';
        content.forEach(value => {
            value.forEach((item, i) => {
                let innerValue = item === undefined ? '' : item.toString(); // We're only expecting strings!
                let result = innerValue.replace(/"/g, '""');
                if (result.search(/("|,|\n)/g) >= 0) {
                    result = '"' + result + '"'
                }
                if (i > 0) {csv += ','}
                csv += result;
            })
        csv += '\n';
        })
        return csv
    }

    function blobToDataUrl(blob) {
        return new Promise(r => {
            let a=new FileReader(); 
            a.onload=r; 
            a.readAsDataURL(blob)}).then(e => e.target.result);
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
            await completeLogin()
        } else if (oAuthResponse === "error") {
            $("#login").removeClass("hide");
            const errHtml = `<p class="text-danger">${data.implicitGrant.errMsg}</p>`;
            htmlMsg(errHtml);
        }
    }
    
    /*
     * Complete login process including
     * Get user information
     * Get templates set
     * update the user
     */
    async function completeLogin() {
        data.userInfo = new UserInfo({
            accessToken: data.implicitGrant.accessToken,
            workingUpdateF: workingUpdate
        });
        if($("#completeLogin").length === 0) {
            htmlMsg(`<p id="completeLogin"></p>`);
        }
        $("#completeLogin").text(`Completing login...`);
        let ok = await data.userInfo.getUserInfo();
        corsAccountReport();
        ok = ok && await setAccountId(getStoredAccountId());
        if (!ok) {
            // Did not complete the login or templates issue
            $("#login").removeClass("hide");
            if (data.userInfo.errMsg) {
                const errHtml = `<p class="text-danger">${data.userInfo.errMsg}</p>`;
                htmlMsg(errHtml);
            }
        }
        $("#completeLogin").text(`Completing login...done.`);
        return ok
    }

    /*
     *  corsAccountReport -- report on the user's accounts/cors status
     */
    function corsAccountReport(){
        let corsErr = data.userInfo.accounts.find(a => a.corsError);
        corsErr = !!corsErr;
        if (!corsErr) {return} // EARLY RETURN
        htmlMsg(`<h5>Your Accounts and CORS Access</h5>`);
        data.userInfo.accounts.forEach(account => {
            const aId = account.corsError ? `<b>CORS Error</b>` : 
                `#${account.accountExternalId}`;
            htmlMsg(`<p class="mb-0">${account.accountName} (${aId})</p>`)
        }) 
        if (corsErr) {
            errMsg(`One or more of your accounts has not enabled CORS for this application`);
            htmlMsg(`<p class="mb-0">To enable CORS, your account administer will use the 
            <b>CORS</b> page of the eSignature Settings web app. 
            <a href="https://developers.docusign.com/platform/single-page-applications-cors/enable-disable-cors/" target="_blank">Documentation.</a></p>
            <p class="mb-0"><small>Note: if this application is not yet in production, then the problem could also be caused by an app configuration issue:</small></p>
            <ul><small>
<li>The domain where the script is hosted is not one of the allowed origins for the app.</li>
<li>The request did not use one of the allowed HTTP methods for the app.</li>
<li>The cors scope was not specified during authentication.</li>
<li>The request did not include an OAuth access token.</li>
<li>The request is not using eSignature REST API v2.1.</li>
<li>The API endpoint path did not include /accounts/{account_id}.</li>
            </ul></small>`); 
        }
    }

    
    /* 
     * setAccountId(accountId)
     * If the accountId is null then use the account server's default.
     * Also:
     * 1. Check that the user has access to the account and cors is on
     *    for this app.
     * 2. Update the account-related settings
     * 3. Store the account as the user's default in the browser storage
     * 4. Update the callApi objects
     *
     * RETURNS ok
     */
    async function setAccountId(accountIdArg) {
        // if the accountId is null then use the account server's default
        function useDefault() {
            const account = data.userInfo.accounts[data.userInfo.defaultAccountIndex];
            ({ accountName, accountId, accountExternalId, accountBaseUrl,
              accountIsDefault, corsError } = account);            
        }
        
        $("#doit").addClass("hide");
        let ok = true;
        
        // 1. Check that the user has access to the account.
        // 2. Update the account-related settings
        if (accountIdArg) {
            const account = data.userInfo.accounts.find(a => a.accountId === accountIdArg);
            if (account) {
                // user has access to the desired account
                ({ accountName, accountId, accountExternalId, accountBaseUrl,
                  accountIsDefault, corsError } = account);            
            } else {
                useDefault();
            }
        } else {
            // No accountId parameter -- use user's default
            useDefault();
        }
        
        // Display the current user and account info
        $("#lname").text(data.userInfo.name);
        $("#lemail").text(data.userInfo.email);
        let aid = `Account #${accountExternalId}`;
        if (accountIsDefault) {aid += ` (Default)`}
        $("#laccount").text(aid);
        $("#laccountname").text(accountName);
        if (data.userInfo.accounts.length > 1) {
            $("#saccount").removeClass("hide");
        }
        $("#loggedin").removeClass("hide");
        
        if (corsError) {
            errMsg(`Error: this account (${accountName}) has not enabled CORS for this application. Please switch accounts or login again.`);
            return false; // EARLY RETURN
        }
        
        // 3. Store the account as the user's default in the browser storage
        setStoredAccountId(accountId);
        
        // 4. Update the callApi and checkTemplates objects
        data.callApi = new CallApi({
            accessToken: data.implicitGrant.accessToken,
            apiBaseUrl: accountBaseUrl
        });
        if (ok) {
            $("#doit").removeClass("hide");
        }
     
        return ok;
    }
    
    /*
     * Login button was clicked
     */
    let login = async function loginf(event) {
        $("#login").addClass("hide");
        await data.implicitGrant.login();
    };
    login = login.bind(this);
    
    /*
     * Switch Accounts was clicked
     * Displays the modal and processes clicks using the supplied
     * callback function
     */
    let switchAccountsButton = function(event) {
        const accounts = data.userInfo.accounts;

        // Only use accounts that include CORS access
        const accountsList = accounts.filter (
            a => a.accountExternalId && a.accountId !== accountId);
        const modalEl = $("#switchAccountModal");
        const bodyEl = modalEl.find(".modal-body");
        bodyEl.empty();
        accountsList.forEach((a, i) => {
            bodyEl.append(`
            <div class="accountRow ${i < (accountsList.length - 1) ? "": "accountRowLast"}"
            data-accountId="${a.accountId}">
            <p>
              ${a.accountName} - ${a.accountExternalId} 
              ${a.accountIsDefault ? "(Default)":""}
            </p>
            </div>`)
        });
    }
    switchAccountsButton = switchAccountsButton.bind(this);
    
    /**
     *
     */
    let accountClicked = async function accountClickedFunc(event) {
        let target = event.target;
        if (target.nodeName === 'P') {
            target = $(target).parent()[0];
        }
        const newAccountId = $(target).attr("data-accountId");
        $("#switchAccountModal").modal('hide');
        await setAccountId(newAccountId);
    }
    accountClicked = accountClicked.bind(this);

    // Mainline
    let data = {
        implicitGrant: null,
        userInfo: null,
        callApi: null,
        checkTemplates: null,
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
        $("#btnDownload").click(download);
        $("#saccount a").click(switchAccountsButton);
        $("#switchAccountModal .modal-body").click(accountClicked);

    }    
});
