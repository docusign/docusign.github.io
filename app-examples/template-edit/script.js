// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
//
// Template Editing main JS script


import { AuthCodePkce } from "../library/authCodePkce.js" 
import { Logger } from "../library/logger.js";
import { Loader } from "../library/loader.js";
import {
    CallApi,
    UserInfo
} from "../library/callapi.js" 
import { Templates } from "../library/templates.js" 

import {
    switchToHttps,
    toast,
    messageModal,
    LoadingModal,
    storageGet, 
    storageSet,
    settingsGet, 
    settingsSet,
    userPictureAccountBrand,
    checkAccountSettings,
} from "../library/utilities.js" 

const CONFIG_STORAGE = "templateEditConfiguration";
const STAGE_QP = 'stage'; // if ?stage=1 then use stage
const PADDING = 70; // padding-top for the signing ceremony.

$(async function () {
    let oAuthClientID;
    let platform = "demo";
    let accountId;
    let loginModal = new bootstrap.Modal('#modalLogin'); // for managing the loginModal
    let configuration = {
        loaderChoice: "animationFloating",
        accountRequest: "default",
    }
    const configurationProto = structuredClone(configuration);
    const formCheckboxes = {    }; // The checkboxes in forms

    /***
     * listTemplates 
     */
    let listTemplates = async function listTemplatesF (e) {
        e.preventDefault();
        formToConfiguration();
        storageSet(CONFIG_STORAGE, configuration);
        if (!checkToken()){return}
        data.logger.post("List Templates");
        await data.templates.list()
    }.bind(this)

    /////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////

    // Engine room stuff is below

    /***
     * checkToken returns true if we're good to go.
     */
    function checkToken() {
        const tokenOk = data.authCodePkce.checkToken();
        if (!tokenOk) {
            messageModal({style: 'text', title: "Your Login Session Has Expired", 
            msg: 
            `<p>Your 8 hour login session has expired.</p>
            <p>Recommendation: use <b>Save to URL</b>
            (top navigation) to save your work, then reload
            this page from the URL and login again.</p>`});
        }
        return tokenOk
    }

    /***
     * formToConfiguration copy data from the form to the configuration object
     * setFormFromConfiguration update form to the configuration
     */
    function formToConfiguration(){
        for (const property in configurationProto) {
            if (property === "mode") {continue}
            configuration[property] = formCheckboxes[property] ? $(`#${property}`).prop('checked') : $(`#${property}`).val();
        }
    }
    function setFormFromConfiguration() {
        function getProperty (p) {
            // handle case where a new property was added but that property not in storage (pickled) 
            return configuration[p] === undefined ? configurationProto[p] : configuration[p]
        }

        for (const property in configurationProto) {
            const skip = {mode: true, accountRequest: true, template1: true, template2: true, template3: true};
            if (skip[property]) {continue}
            if (formCheckboxes[property]) {
                $(`#${property}`).prop('checked', getProperty(property));
            } else {
                $(`#${property}`).val(getProperty(property));
            }
        }
    }

    /***
     * logout -- create a URL from the configuration
     */
    const logout = async function logoutF(e) {
        e.preventDefault();
        // unfortunately the account server doesn't actually redirect 
        // back to us. Sigh.
        window.location.href =
            `${data.userInfo.oAuthServiceProvider}/logout?redirect_uri=${window.location.href}`;
    }.bind(this);
    
    
    /***
     * Start login process
     */
    const login = function loginF() {
        data.authCodePkce.login();
    }.bind(this);

    /***
     * Complete login process.
     */
    async function completeLogin() {
        oAuthClientID = data.authCodePkce.oAuthClientID;
        data.userInfo = new UserInfo({
            platform: platform,
            accessToken: data.authCodePkce.accessToken,
            loadingMessageShow: data.loadingModal.show.bind(data.loadingModal)
        });
        const ok = await data.userInfo.getUserInfo();
        if (!ok) {
            // Did not complete the login
            if (data.userInfo.corsErr) {
                messageModal({style: "text", title: "CORS Error", 
                    msg: data.userInfo.errMsg})
            } else {
                toast(data.userInfo.errMsg, 20);
                data.logger.post('Startup Error', data.userInfo.errMsg)
            }
            return false; // EARLY return
        }
        data.userInfo.addAccountOptions("accountRequest");
        return await setAccount()
    }

    /***
     * setAccount
     */
    async function setAccount(){
        let apiBaseUrl = data.userInfo.defaultBaseUrl;
        if (configuration.accountRequest === "default") {
            accountId = data.userInfo.defaultAccount;
        } else {
            // look for the account
            const accountEntry = data.userInfo.accounts.find(a => a.accountId === configuration.accountRequest);
            if (accountEntry) {
                accountId = accountEntry.accountId;
                apiBaseUrl = accountEntry.accountBaseUrl;
                await data.userInfo.checkAccount(accountEntry);
                if (accountEntry.corsError) {
                    messageModal({style: "text", title: "CORS Error", 
                        msg: accountEntry.corsError + " Using default account ID"});
                    accountId = data.userInfo.defaultAccount;
                    apiBaseUrl = data.userInfo.defaultBaseUrl;
                }
            } else {
                messageModal({style: "text", title: "No Account Access", 
                    msg: `You don't have access to account ID ${configuration.accountRequest}. Using default account ID`});
                accountId = data.userInfo.defaultAccount
            }
        }

        data.logger.post('Account Information', `Account ID: ${accountId}, Name: ${data.userInfo.defaultAccountName}`);
        $(`#userInfoAccount`).text(accountId);
        data.callApi = new CallApi({
            accessToken: data.authCodePkce.accessToken,
            apiBaseUrl: apiBaseUrl
        });
        data.loadingModal.show("Checking the account settings");
        if (!await checkAccountSettings({accountId: accountId, userInfo: data.userInfo, callApi: data.callApi})) {
            data.logger.post('Account setting error', 'The account does not have a required setting');
            return false; // EARLY RETURN
        } 

        data.templates = new Templates({
            showMsg: toast,
            messageModal: messageModal,
            loadingModal: data.loadingModal,
            clientId: oAuthClientID,
            loader: data.loader,
            accountId: accountId,
            callApi: data.callApi,
            mainElId: "main",
            templatesTitleId: "templatesTitle",
            templatesTableId: "templatesTable",
            logger: data.logger,
            padding: PADDING,
        });

        data.loadingModal.show("Retrieving your photo and the account’s logo")
        await userPictureAccountBrand({accountId: accountId, userInfo: data.userInfo, callApi: data.callApi});
        
        data.loadingModal.show("Retrieving folder data");
        await data.templates.folderFetch();
        data.templates.renderTree({treeId: "tree"});

        data.loadingModal.show("Listing templates");
        await data.templates.list({title: "My Templates", listType: "myTemplates"});

        data.loadingModal.delayedHide("Done.")
        return true;
    }

    // Mainline
    let data = {
        authCodePkce: null,
        userInfo: null,
        callApi: null,
        loadingModal: new LoadingModal(),
        logger: new Logger(),
        loader: null,
    };
    data.loader = new Loader({
        loaderChoice: configuration.loaderChoice, parentEl: "loaderdiv",
        mainEl: null, loadingModal: data.loadingModal,
        statusEl: "status", backgroundColor: 0xF8F9FA
    })

    // Register event handlers
    $("#listTemplates").click(listTemplates);    
    $("#modalLogin button").click(login);
    $("#logout").click(logout);
    $(".info").click(e => {$(e.target).text($(e.target).text() === "Information" ? 
        "Close Information" : "Information")});
    $('#settingsModal').on('hide.bs.modal', e => {
        const oldAccountRequest = configuration.accountRequest;
        formToConfiguration();
        settingsSet(configuration);
        if (oldAccountRequest !== configuration.accountRequest) {setAccount()}
        data.loader.loaderChoice = configuration.loaderChoice;
    });
     
    $('#settingsForm').on('keyup keypress', e => { //https://stackoverflow.com/a/11235672/64904
        if (e.which === 13) { // ignore cr
            e.preventDefault();
            return false;
        }
    });

    // Starting up...
    switchToHttps();
    // The OAuth constructor looks at hash data to see if we're 
    // now receiving the OAuth response
    data.authCodePkce = new AuthCodePkce({
        oAuthReturnUrl: `${location.origin}${location.pathname}`,
        clientId: platform,
        showMsg: toast
    });
    await data.authCodePkce.oauthResponse();
    // Are we logged in?
    if (data.authCodePkce.checkToken()) {
        // logged in
        data.loadingModal.show("Completing Login Process")
        if (await completeLogin()) {
            // tooltips: https://getbootstrap.com/docs/5.3/components/tooltips/
            const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
            const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
            setFormFromConfiguration();
            $(`#signername` ).val(data.userInfo.name);

            // Set navigation bar and user info modal
            $(`#userInfoModal .modal-title`).text(data.userInfo.name);
            $(`#userInfoUser`).text(data.userInfo.userId);
            $(`#userInfoEmail`).text(data.userInfo.email);

            data.loader.loaderChoice = configuration.loaderChoice; 
        } else {
            // couldn't login
            data.loadingModal.hide();
            loginModal.show();            
        }
    } else {
        // not logged in, show Login modal
        loginModal.show();
    }
})
