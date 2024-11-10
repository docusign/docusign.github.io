// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
//
// Embedded Signing main JS script


import { AuthCodePkce } from "../library/authCodePkce.js" 
import { CheckTemplates } from "../library/checkTemplates.js";
import { Envelopes } from "./envelopes.js";
import { Click2Agree } from "./click2agree.js"
import { FocusedViewSigning } from "./focusedViewSigning.js";
import { DsjsDefaultSigning } from "./dsjsDefaultSigning.js";
import { ClassicSigning } from "./classicEmbeddedSigning.js";
import { Logger } from "../library/logger.js";
import { Loader } from "../library/loader.js";

import {
    CallApi,
    UserInfo
} from "../library/callapi.js" 

import {
    switchToHttps,
    toast,
    messageModal,
    LoadingModal,
    processUrlHash,
    storageGet, 
    storageSet,
    ButtonOnChange,
    settingsGet, 
    settingsSet,
    userPictureAccountBrand,
    checkAccountSettings,
    monitorSigningHeight,
    getPhoneNumber,
} from "../library/utilities.js" 

const APP_NAME = "embeddedSigning";
const CONFIG_STORAGE = APP_NAME + " Configuration";
const MODE_STORAGE = APP_NAME + " Mode";
const CLASSIC_RESULT = APP_NAME + ' classicResult'; // store the classic non-iframe signing result
const STAGE_QP = 'stage'; // if ?stage=1 then use stage
const PROD_QP  = 'prod' ; // if ?prod=1 then use prod
const PADDING = 70; // padding-top for the signing ceremony.

$(async function () {
    let oAuthClientID;
    let platform = "demo";
    let accountId;
    let loginModal = new bootstrap.Modal('#modalLogin'); // for managing the loginModal
    let configuration = {
        mode: "click2agree-tab", 
        loaderChoice: "animationFloating",
        supp1include: false, 
        supp1signerMustAcknowledge: "view",
        supp2include: false, 
        supp2signerMustAcknowledge: "accept",
        supp11include: false, 
        supp11signerMustAcknowledge: "view",
        supp12include: false, 
        supp12signerMustAcknowledge: "accept",
        supp21include: false, 
        supp21signerMustAcknowledge: "view",
        supp22include: false, 
        supp22signerMustAcknowledge: "accept",
        supp31include: false, 
        supp31signerMustAcknowledge: "view",
        supp32include: false, 
        supp32signerMustAcknowledge: "accept",
        buttonPosition1: "bottom-right",
        buttonText1: "Submit",
        buttonText3: "Agree",
        backgroundColor1: "#000000",
        textColor1: "#FFFFFF",
        backgroundColor2: "#f7ba00",
        textColor2: "#333333",
        backgroundColor3: "#000000",
        textColor3: "#FFFFFF",
        signername: "",
        signername1: "",
        signername2: "",
        signername3: "",
        useSigningCeremonyDefaultUx: true,
        useErsd: false,
        locale: "default",
        locale1: "default",
        locale2: "default",
        locale3: "default",
        document: "default",
        document1: "default",
        document2: "default",
        document3: "default",
        template1: "none",
        template2: "none",
        template3: "none",
        outputStyle: "openUrl",
        useIframe: true,
        showDecline: false,
        gatewayId: "",
        authStyle: "none",
        idvConfigId: "",
        smsNational: "",
        smsCc: "",
        accountRequest: "default",
        useModal: false,
    }
    const configurationProto = structuredClone(configuration);
    const formCheckboxes = {
        supp1include: true, 
        supp2include: true, 
        supp11include: true, 
        supp12include: true, 
        supp21include: true, 
        supp22include: true,
        supp31include: true, 
        supp32include: true,
        useSigningCeremonyDefaultUx: true,
        useIframe: true, 
        showDecline: true,
        useErsd: true,
        useModal: true,
    }

    let templates = [
        {
            url:  "https://docusign.github.io/examples/templates/Field_Test",
            name: "DevCenter example: Field Test",
            description:
                "This DevCenter example template includes multiple types of fields.",
            templateId: null,
            docChoice: "default",
        },
        {
            url:  "https://docusign.github.io/examples/templates/docx_Credit_Card",
            name: "DevCenter example: docx Credit Card",
            description: "",
            templateId: null,
            docChoice: "docxDoc",
        },
        {
            url:  "https://docusign.github.io/examples/templates/PDF_Credit_Card",
            name: "DevCenter example: PDF Credit Card",
            description: "",
            templateId: null,
            docChoice: "pdfDoc",
        },
        {
            url:  "https://docusign.github.io/examples/templates/Approve_Decline",
            name: "DevCenter example: Approve Decline",
            description: "",
            templateId: null,
            docChoice: "approveDecline",
        },
    ];

    /***
     * signClickToAgree 
     */
    let signClickToAgree = async function signClickToAgreeF (e) {
        e.preventDefault();
        formToConfiguration();
        storageSet(CONFIG_STORAGE, configuration);
        if (!checkToken()){return}
        data.logger.post("Click to Agree");
        const supplemental = [
            {include: configuration.supp1include, signerMustAcknowledge: configuration.supp1signerMustAcknowledge},
            {include: configuration.supp2include, signerMustAcknowledge: configuration.supp2signerMustAcknowledge}];
        await data.click2agree.sign({
            supplemental: supplemental,
            name: configuration.signername,
            email: data.userInfo.email,
            ersd: configuration.ersd,
            modelButtonId: "modelButton3",
            locale: configuration.locale,
            document: configuration.document,
            outputStyle: configuration.outputStyle,
            useIframe: configuration.useIframe,
            useModal: configuration.useModal,
            showDecline: configuration.showDecline,
        })
    }.bind(this)

    /***
     * signFocusView
     */
    let signFocusView = async function signFocusViewF (e) {
        e.preventDefault();
        formToConfiguration();
        storageSet(CONFIG_STORAGE, configuration);
        if (!checkToken()){return}
        data.logger.post("Focus View");
        const supplemental = [
            {include: configuration.supp11include, signerMustAcknowledge: configuration.supp11signerMustAcknowledge},
            {include: configuration.supp12include, signerMustAcknowledge: configuration.supp12signerMustAcknowledge}];
        await data.focusedViewSigning.sign({
            templateId: getTemplateId(configuration.document1),
            supplemental: supplemental,
            name: configuration.signername1,
            email: data.userInfo.email,
            modelButtonId: "modelButton1",
            modelButtonPosition: "buttonPosition1",
            locale: configuration.locale1,
            document: configuration.document1,
            template: configuration.template1,
            outputStyle: configuration.outputStyle,
            useIframe: configuration.useIframe,
            gatewayId: configuration.gatewayId,
            authStyle: configuration.authStyle,
            idvConfigId: configuration.idvConfigId,    
            smsNational: configuration.smsNational,
            smsCc: configuration.smsCc,
            showDecline: configuration.showDecline,
            });
    }.bind(this)

    /***
     * dsjsDefault 
     */
    let dsjsDefault = async function dsjsDefaultF (e) {
        e.preventDefault();
        formToConfiguration();
        storageSet(CONFIG_STORAGE, configuration);
        if (!checkToken()){return}
        data.logger.post("docusign.js Default View");
        const supplemental = [
            {include: configuration.supp21include, signerMustAcknowledge: configuration.supp21signerMustAcknowledge},
            {include: configuration.supp22include, signerMustAcknowledge: configuration.supp22signerMustAcknowledge}];
        await data.dsjsDefaultSigning.sign({
            templateId: getTemplateId(configuration.document2),
            supplemental: supplemental,
            name: configuration.signername2,
            email: data.userInfo.email,
            modelButtonId: "modelButton2",
            locale: configuration.locale2,
            document: configuration.document2,
            template: configuration.template2,
            outputStyle: configuration.outputStyle,
            useIframe: configuration.useIframe,
            gatewayId: configuration.gatewayId,
            authStyle: configuration.authStyle,
            idvConfigId: configuration.idvConfigId,    
            smsNational: configuration.smsNational,
            smsCc: configuration.smsCc,
            });
    }.bind(this)

    /***
     * classicSign signing ceremony
     */
    let classicSign = async function classicSignF (e) {
        e.preventDefault();
        formToConfiguration();
        storageSet(CONFIG_STORAGE, configuration);
        if (!checkToken()){return}
        data.logger.post("Classic View");
        const supplemental = [
            {include: configuration.supp31include, signerMustAcknowledge: configuration.supp31signerMustAcknowledge},
            {include: configuration.supp32include, signerMustAcknowledge: configuration.supp32signerMustAcknowledge}];
        await data.classicSigning.sign({
            templateId: getTemplateId(configuration.document3),
            supplemental: supplemental,
            name: configuration.signername3,
            email: data.userInfo.email,
            locale: configuration.locale3,
            document: configuration.document3,
            template: configuration.template3,
            outputStyle: configuration.outputStyle,
            useIframe: configuration.useIframe,
            gatewayId: configuration.gatewayId,
            authStyle: configuration.authStyle,
            idvConfigId: configuration.idvConfigId,    
            smsNational: configuration.smsNational,
            smsCc: configuration.smsCc,
            });
    }.bind(this)

    /***
     * A view button was clicked
     * Call the right function
     */
    let view = async function viewF (e) {
        formToConfiguration();
        storageSet(CONFIG_STORAGE, configuration);
        const sectionName = $(e.target).closest(".tab-pane").attr("id");
        if (sectionName === 'focusedView-tab-pane') {
            await data.focusedViewSigning.view()
        } else if (sectionName === 'click2agree-tab-pane') {
            await data.click2agree.view()
        } else if (sectionName === 'dsjsDefault-tab-pane') {
            await data.dsjsDefaultSigning.view()
        } else if (sectionName === 'classic-tab-pane') {
            await data.classicSigning.view(configuration.useIframe)
        }
    }.bind(this)

    /***
     * find the template ID for the document choice
     */
    function getTemplateId(docChoice) {
        let templateId = null;
        let defaultTemplateId;
        templates.forEach(t => {
            if (t.docChoice === "default") {defaultTemplateId = t.templateId}
            if (t.docChoice === docChoice) {templateId = t.templateId}
        })
        if (!templateId){templateId = defaultTemplateId}
        return templateId
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////

    // Engine room stuff is below

    /***
     * envelopeCreated
     * An envelope was created, enable buttons to view the existing
     * vs only enabling new envelopes to be created and sent.
     */
    function envelopeCreated(e) {
        if (e.data !== "envelopeCreated") {return}
        // show the buttons for sending a current envelope
        $(".env-view").removeClass("hide");
    }

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
        configuration.mode = $(`button.nav-link.active`)[0].id;
        const resp = getPhoneNumber(data.iti);
        configuration.smsNational = resp.smsNational;
        configuration.smsCc = resp.smsCc;
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
            if (getProperty('useSigningCeremonyDefaultUx')) {
                $(`.classicColor`).attr("disabled", true);
            }
        }
        if (getProperty('smsCc')) {
            data.iti.setNumber("+" + getProperty('smsCc') + getProperty('smsNational'));
        }
        new bootstrap.Tab(`#${getProperty('mode')}`).show()
    }

    /***
     * saveToUrl -- create a URL from the configuration
     */
    const saveToUrl = async function saveToUrlF(e) {
        e.preventDefault();
        formToConfiguration();
        let url = window.location.origin + window.location.pathname + "#";
        for (const property in configuration) {
            url += `${property}=${encodeURIComponent(configuration[property]).replace(/\%20/g, '+')}&`;
        }
        await navigator.clipboard.writeText(url);
        toast("Copied to the Clipboard!");
    }.bind(this);

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
     * Ask for confirmation before leaving window
     */
    const beforeUnloadHandler = function beforeUnloadHandlerF(event) {
        const signing = data.click2agree && data.click2agree.signing
            || data.focusedViewSigning && data.focusedViewSigning.signing
            || data.dsjsDefaultSigning && data.dsjsDefaultSigning.signing;
         
        if (signing) {
            event.preventDefault();
            event.returnValue = ''; // Chrome requires returnValue to be set.
        }
    }.bind(this)
    
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
        data.checkTemplates = new CheckTemplates({
            callApi: data.callApi, 
            accountId: accountId
        });    
        data.envelopes = new Envelopes({
            showMsg: toast,
            messageModal: messageModal,
            loadingModal: data.loadingModal,
            clientId: oAuthClientID,
            accountId: accountId,
            callApi: data.callApi,
            logger: data.logger,
            platform: platform,
            loader: data.loader,
            mainElId: "main",
        })
        data.click2agree = new Click2Agree({
            showMsg: toast,
            messageModal: messageModal,
            loadingModal: data.loadingModal,
            loader: data.loader,
            clientId: oAuthClientID,
            accountId: accountId,
            callApi: data.callApi,
            mainElId: "main",
            signElId: "signing-ceremony",
            envelopes: data.envelopes,
            logger: data.logger,
            padding: PADDING,
        });
        data.focusedViewSigning = new FocusedViewSigning({
            showMsg: toast,
            messageModal: messageModal,
            loadingModal: data.loadingModal,
            clientId: oAuthClientID,
            loader: data.loader,
            accountId: accountId,
            callApi: data.callApi,
            mainElId: "main",
            signElId: "signing-ceremony",
            envelopes: data.envelopes,
            logger: data.logger,
            padding: PADDING,
        });
        data.dsjsDefaultSigning = new DsjsDefaultSigning({
            showMsg: toast,
            messageModal: messageModal,
            loadingModal: data.loadingModal,
            loader: data.loader,
            clientId: oAuthClientID,
            accountId: accountId,
            callApi: data.callApi,
            mainElId: "main",
            signElId: "signing-ceremony",
            envelopes: data.envelopes,
            logger: data.logger,
            padding: PADDING,
        });
        data.classicSigning = new ClassicSigning({
            showMsg: toast,
            messageModal: messageModal,
            loadingModal: data.loadingModal,
            loader: data.loader,
            clientId: oAuthClientID,
            accountId: accountId,
            callApi: data.callApi,
            mainElId: "main",
            signElId: "signing-ceremony",
            envelopes: data.envelopes,
            CLASSIC_RESULT: CLASSIC_RESULT,
            logger: data.logger,
            padding: PADDING,
        });
        data.loadingModal.show("Retrieving your photo and the account’s logo")
        await userPictureAccountBrand({accountId: accountId, userInfo: data.userInfo, callApi: data.callApi});
        data.classicSigning.showResults();
        data.loadingModal.show("Checking templates")
        const result = await checkTemplates(templates);
        if (result.ok) {
            setTemplateOptions(data.checkTemplates.accountTemplates)
            data.loadingModal.hide()
        } else {
            data.loadingModal.hide()
            messageModal({style: 'text', title: "Templates issue", msg: 
                `<p>Problem while loading example templates
                to your eSignature account:</p><p>${result.msg}</p>`});
                        // couldn't login
            loginModal.show();
        }
        return true;
    }

    /***
     * Check the templates
     *   returns result {ok: bool, msg) 
     */
    async function checkTemplates() {
        templates = await data.checkTemplates.check(templates);
        const emptyOk = data.checkTemplates.msg === ''
        const okMsg = emptyOk ? "Done." : data.checkTemplates.msg;
        const ok = !data.checkTemplates.errMsg;
        return {ok: ok, msg: ok ? okMsg : data.checkTemplates.errMsg}
    }

    /***
     * setTemplateOptions sets the select options
     */
    function setTemplateOptions(accountTemplates) {
        let optionsHtml = `<option value="none">None</option>`;

        // sort by name. See 
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#sorting_array_of_objects
        accountTemplates.sort((a, b) => {
            const nameA = a.name.toUpperCase(); // ignore upper and lowercase
            const nameB = b.name.toUpperCase(); // ignore upper and lowercase
            if (nameA < nameB) {return -1}
            if (nameA > nameB) {return 1}          
            return 0; // names must be equal
          });
        const templatesOpt = accountTemplates.map((a) => `<option value="${a.templateId}">${a.name}</option>`);
        optionsHtml += templatesOpt.join();

        $(`#template1, #template2, #template3`).empty().prepend(optionsHtml);
    }

    // Mainline
    let data = {
        authCodePkce: null,
        userInfo: null,
        callApi: null,
        click2agree: null,
        loadingModal: new LoadingModal(),
        modelButton1Changes: null,
        logger: new Logger(),
        loader: null,
    };
    data.loader = new Loader({
        loaderChoice: configuration.loaderChoice, parentEl: "loaderdiv",
        mainEl: "main", loadingModal: data.loadingModal,
        statusEl: "status", backgroundColor: 0xF8F9FA
    })

    // Register event handlers
    monitorSigningHeight({signingId: "signing-ceremony", padding: 70})
    $("#modalLogin button").click(login);
    $("#signClickToAgree").click(signClickToAgree);
    $("#signFocusView").click(signFocusView);
    $("#dsjsDefault").click(dsjsDefault);
    $("#classicSign").click(classicSign);
    $("#saveToUrl").click(saveToUrl);
    $("#logout").click(logout);
    $(".env-view").click(view);
    $(".info").click(e => {$(e.target).text($(e.target).text() === "Information" ? 
        "Close Information" : "Information")});
    $('#myTab [data-bs-toggle="tab"]').on('show.bs.tab', e => {
        storageSet(MODE_STORAGE, $(e.target)[0].id)}); // save the mode 
    $('#settingsModal').on('hide.bs.modal', e => {
        const oldAccountRequest = configuration.accountRequest;
        formToConfiguration();
        settingsSet(configuration);
        if (oldAccountRequest !== configuration.accountRequest) {setAccount()}
        data.loader.loaderChoice = configuration.loaderChoice;
        storageSet(CONFIG_STORAGE, configuration);
    });
    window.addEventListener("beforeunload", beforeUnloadHandler);
    window.addEventListener("message", envelopeCreated);
    $("#useSigningCeremonyDefaultUx").change(e => {
        $(`.classicColor`).attr("disabled", 
        $("#useSigningCeremonyDefaultUx").prop('checked'))});
     
    $('#settingsForm').on('keyup keypress', e => { //https://stackoverflow.com/a/11235672/64904
        if (e.which === 13) { // ignore cr
            e.preventDefault();
            return false;
        }
    });

    // Starting up...
    switchToHttps();
    // (We need to store config info because we will reload the page as 
    // part of logging in.)
    // Does the hash include a config item? Then save it.
    const config = processUrlHash("mode");
    if (config) {
        storageSet(CONFIG_STORAGE, config);
        storageSet(MODE_STORAGE, config.mode); // save the mode 
    }
    const classicResults = processUrlHash("classicResults");
    if (classicResults) {storageSet(CLASSIC_RESULT, classicResults)}
    let useStage = storageGet(APP_NAME + STAGE_QP, false);
    let useProd = storageGet(APP_NAME + PROD_QP, false);
    const stageResults = processUrlHash(STAGE_QP);
    const prodResults = processUrlHash(PROD_QP);
    useStage = stageResults ? stageResults.stage === '1' : useStage;
    useProd = prodResults ? prodResults.prod   === '1' : useProd;
    if (useStage && useProd) {useStage = false}
    storageSet(APP_NAME + STAGE_QP, useStage)
    storageSet(APP_NAME + PROD_QP , useProd)
    if (useStage) {
        // Use stage!
        const dsJsScript = document.createElement('script');
        dsJsScript.src = "https://js-s.docusign.com/bundle.js";
        document.head.appendChild(dsJsScript);
        platform = 'stage';
        $(`#modalLogin .modal-title`).text(`Stage Login`);
        $(`#modalLogin .btn-primary`).text(`Stage Login`);
        $(`#modalLogin .modal-body`).html(`
            <p style='color:purple;'>Stage login</p>
            <p>You must be on the VPN or an office network</p>
            <p><a href='${location.origin}${location.pathname}?${STAGE_QP}=0'>Reset to Demo login</a></p>`)
    } else if (useProd) {
        // Use production!
        const dsJsScript = document.createElement('script');
        dsJsScript.src = "https://js.docusign.com/bundle.js";
        document.head.appendChild(dsJsScript);
        platform = 'prod';
        $(`#modalLogin .modal-title`).text(`Production Login`);
        $(`#modalLogin .btn-primary`).text(`Production Login`);
        $(`#modalLogin .modal-body`).html(`
            <p style='color:purple;'>Production login</p>
            <p><a href='${location.origin}${location.pathname}?${PROD_QP}=0'>Reset to Demo login</a></p>`)
    } else {
        const dsJsScript = document.createElement('script');
        dsJsScript.src = "https://js-d.docusign.com/bundle.js";
        document.head.appendChild(dsJsScript);
        platform = "demo";
    }


    // The OAuth constructor looks at hash data to see if we're 
    // now receiving the OAuth response
    data.authCodePkce = new AuthCodePkce({
        oAuthReturnUrl: `${location.origin}${location.pathname}`,
        clientId: platform,
        showMsg: toast
    });
    await data.authCodePkce.oauthResponse();
    // If we're not logged in, then ask to start the login flow.
    if (!data.authCodePkce.checkToken()) {
        loginModal.show();
    } else {
        // logged in
        data.loadingModal.show("Completing Login Process")
        if (await completeLogin()) {
            // tooltips: https://getbootstrap.com/docs/5.3/components/tooltips/
            const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
            const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
            const smsEl = document.querySelector("#sms");
            data.iti = intlTelInput(smsEl, {
                utilsScript:
                    "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.min.js"
            });    
            const mode = storageGet(MODE_STORAGE); // restore mode
            if (mode) {configuration.mode = mode};
            settingsGet(configuration);
            let config = storageGet(CONFIG_STORAGE);
            storageSet(CONFIG_STORAGE, false); // reset
            if (config) {configuration = config}; // overwrite from QP
            setFormFromConfiguration();
            $(`#signername` ).val(data.userInfo.name);
            $(`#signername1`).val(data.userInfo.name);
            $(`#signername2`).val(data.userInfo.name);
            $(`#signername3`).val(data.userInfo.name);
            $(`#userInfoModal .modal-title`).text(data.userInfo.name);
            $(`#userInfoUser`).text(data.userInfo.userId);
            $(`#userInfoEmail`).text(data.userInfo.email);
            data.loader.loaderChoice = configuration.loaderChoice; 
            data.modelButton1Changes = new ButtonOnChange({
                buttonId: "modelButton1",
                textId: "buttonText1",
                defaultText: "Submit",
                backgroundColorId: "backgroundColor1",
                textColorId: "textColor1"
            });
            data.modelButton2Changes = new ButtonOnChange({
                buttonId: "modelButton2",
                backgroundColorId: "backgroundColor2",
                textColorId: "textColor2"
            });
            data.modelButton3Changes = new ButtonOnChange({
                buttonId: "modelButton3",
                textId: "buttonText3",
                defaultText: "Agree",
                backgroundColorId: "backgroundColor3",
                textColorId: "textColor3"
            });
        } else {
            // couldn't login
            data.loadingModal.hide();
            loginModal.show();            
        }
    }
})
