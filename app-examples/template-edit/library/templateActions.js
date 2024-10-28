// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

/*
 * CLASS TemplateActions
 *
 */

const IFRAME_RETURN_ORIGIN = "https://docusign.github.io";
const IFRAME_RETURN = IFRAME_RETURN_ORIGIN + "/jsfiddleDsResponse.html";
const TEMPLATE_EDIT_MODAL = "templateEditModal"; // the ID
const TEMPLATE_DELETE_MODAL = "deleteConfirmModal";
const TEMPLATE_DELETE_SELECT = "deleteConfirm";
const DOWNLOAD_ANCHOR = "downloadA";
const TEMPLATE_UPLOAD_MODAL = "uploadTemplateModal";
const TEMPLATE_UPLOAD_BUTTON = "uploadButton";
const TEMPLATE_CANCEL_UPLOAD_BUTTON = "cancelUploadButton";
const TEMPLATE_UPLOAD_FILE_PICKER = "uploadTemplateFile";

class TemplateActions {
    editModal;
    deleteModal;
    everyoneGroupId; // set by Templates#everyoneGroup

    constructor(args) {
        this.showMsg = args.showMsg;
        this.messageModal = args.messageModal;
        this.loader = args.loader;
        this.clientId = args.clientId;
        this.accountId = args.accountId;
        this.callApi = args.callApi;
        this.mainElId = args.mainElId;
        this.logger = args.logger;
        
        this.action = this.action.bind(this);
        this.messageListener = this.messageListener.bind(this);
        window.addEventListener("message", this.messageListener);

        this.deleteListener = this.deleteListener.bind(this);
        $(`#${TEMPLATE_DELETE_MODAL}`).on('hide.bs.modal', this.deleteListener);

        this.uploadTemplateListener = this.uploadTemplateListener.bind(this);
        $(`#${TEMPLATE_UPLOAD_BUTTON}, #${TEMPLATE_CANCEL_UPLOAD_BUTTON}`).on('click', this.uploadTemplateListener);
    }

    /***
     * action  executes the desired action
     * RETURNS redoList
     */
    async action(args) {
        this.templateId = args.templateId;
        this.templateName = args.templateName;
        this.list = args.list;
        const actionRequest = args.action;
        this.logger.post(`${actionRequest} Action`, 
            this.templateId ? `Template ID ${this.templateId}` : null);
        return await this[actionRequest](); 
    }

    /***
     * messageListener handles incoming messages from the Template Edit view
     */
    async messageListener(message) {
        if (message.origin !== IFRAME_RETURN_ORIGIN) {
            return; // EARLY RETURN
        }
        if (this.editModal) {
            this.editModal.hide()
        }
        console.log(message);
        // message.data.href  eg "https://docusign.github.io/jsfiddleDsResponse.html?envelopeId=4d3d3eeb-72e4-4932-8fbe-xxxxxxx8&event=Save"
        const splits = message.data.href.split("&event=");
        const m = splits.length == 2 ? `event=${splits[1]}` : `unexpected response: ${message.data.href}`
        this.logger.post(null, `Template edit result: ${m}`);
        if (this.list) {
            await this.list();
            this.list = null;
        }
    }

    /***
     * edit action
     */
    async edit() {
        this.loader.show("Creating the Template Edit window");
        let apiMethod = `/accounts/${this.accountId}/templates/` + 
        `${this.templateId}/views/edit`;
        const results = await this.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: "POST",
            req: {
                returnUrl: IFRAME_RETURN,
                viewAccess: "template" 
            }
        });
        if (results !== false) { // good result
            if (!this.editModal) {
                this.editModal = new bootstrap.Modal(`#${TEMPLATE_EDIT_MODAL}`);
            }
            $(`#${TEMPLATE_EDIT_MODAL} iframe`).attr("src", results.url);
            this.loader.hide();
            this.editModal.show();
        } else {
            this.loader.hide();
            this.messageModal({
                style: 'text', title: "Template Edit problem", msg:
                    `<p>Error message: ${this.callApi.errMsg}</p>`
            });
            this.logger.post("TemplateViews:createEdit Problem: Operation Canceled", `<p>Error message: ${this.callApi.errMsg}</p>`);
        }
        return false; // run list via messageListener
    }

    async newTemplate() {
        this.logger.post("Create new template");
        this.loader.show("Creating a new Template");
        let apiMethod = `/accounts/${this.accountId}/templates/`;
        const results = await this.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: "POST",
            req: {
                description: "",
                emailBlurb: "",
                emailSubject: "",
                password: "",
                name: "",
                passwordProtected: false,
                shared: false, 
                isOwner: false,
                pageCount: 0,
                enableResponsiveChoice: true,
                isNewTemplate: false,
                notification: {useAccountDefaults: true}
            } // copied from the Docusign web app
        });
        if (results === false) {
            this.loader.hide();
            this.messageModal({
                style: 'text', title: "Create Template problem", msg:
                    `<p>Error message: ${this.callApi.errMsg}</p>`
            });
            this.logger.post("Templates:create Problem: Operation Canceled", `<p>Error message: ${this.callApi.errMsg}</p>`);
            return; // EARLY return
        }
        // good result:
        this.logger.post(null, `Template created. Name: ${results.name}, templateId: ${results.templateId}`);
        this.logger.post(null, `Opening Edit view`);
        this.templateId = results.templateId;
        return await this.edit();
    }
    
    async copy() {
        this.loader.show("Copying the Template");
        let apiMethod = `/accounts/${this.accountId}/templates/`;
        const results = await this.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: "POST",
            req: {
                templateId: this.templateId 
            }
        });
        if (results === false) {
            this.loader.hide();
            this.messageModal({
                style: 'text', title: "Template Edit problem", msg:
                    `<p>Error message: ${this.callApi.errMsg}</p>`
            });
            this.logger.post("Templates:create Problem: Operation Canceled", `<p>Error message: ${this.callApi.errMsg}</p>`);
            return; // EARLY return
        }
        // good result:
        this.logger.post(null, `New template created. Name: ${results.name}, templateId: ${results.templateId}`);
        this.logger.post(null, `Opening Edit view`);
        this.templateId = results.templateId;
        return await this.edit();
    }

    async matchInclude(args) {
        $(`#${this.mainElId}`).attr("hidden", "");
        $(`#${this.templatesTableElId}`).attr("hidden", "");

        this.loader.show("Updating the Template");
        const autoMatch = !(args && args.exclude);

        let apiMethod = `/accounts/${this.accountId}/templates/auto_match`;
        const results = await this.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: "PUT",
            req: {templates: [{templateId: this.templateId, autoMatch: autoMatch}]}
        });
        if (results === false) {
            this.loader.hide();
            $(`#${this.mainElId}`).removeAttr("hidden");
            $(`#${this.templatesTableElId}`).removeAttr("hidden");
    
            this.messageModal({
                style: 'text', title: "Template Update problem", msg:
                    `<p>Error message: ${this.callApi.errMsg}</p>`
            });
            this.logger.post("Templates:autoMatch Problem: Operation Canceled", `<p>Error message: ${this.callApi.errMsg}</p>`);
            return; // EARLY return
        }
        // good result:
        this.logger.post(null, `Template autoMatch updated to ${autoMatch}. Name: ${this.templateName}, templateId: ${this.templateId}`);

        this.loader.hide();
        $(`#${this.mainElId}`).removeAttr("hidden");
        $(`#${this.templatesTableElId}`).removeAttr("hidden");
        return true
    }

    async matchExclude() {
        return await this.matchInclude({exclude: true})
    }

    async delete() {
        if (!this.deleteModal) {
            this.deleteModal = new bootstrap.Modal(`#${TEMPLATE_DELETE_MODAL}`);
        }
        $(`#${TEMPLATE_DELETE_MODAL} form h5`).text(`Delete template ${this.templateName}?`);
        $(`#${TEMPLATE_DELETE_SELECT}`).val("default"); 
        this.deleteModal.show();
        return false;
    }

    async deleteListener(){
        // The delete modal has been closed, did they want us to delete?
        if ($(`#${TEMPLATE_DELETE_SELECT}`).val() !== "delete") {
            this.showMsg("Operation Canceled");
            this.logger.post(null, `Operation Canceled`);
            return // EARLY RETURN
        }

        // "Delete" by moving to special recyclebin folder
        $(`#${this.mainElId}`).attr("hidden", "");
        $(`#${this.templatesTableElId}`).attr("hidden", "");

        this.loader.show("Deleting the Template");
        let apiMethod = `/accounts/${this.accountId}/folders/recyclebin`;
        const results = await this.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: "PUT",
            req: {envelopeIds: [this.templateId]}
        });
        if (results === false) {
            this.loader.hide();
            $(`#${this.mainElId}`).removeAttr("hidden");
            $(`#${this.templatesTableElId}`).removeAttr("hidden");
    
            this.messageModal({
                style: 'text', title: "Template Delete problem", msg:
                    `<p>Error message: ${this.callApi.errMsg}</p>`
            });
            this.logger.post("Templates:delete Problem: Operation Canceled", `<p>Error message: ${this.callApi.errMsg}</p>`);
            return; // EARLY return
        }
        // good result:
        this.logger.post(null, `Template deleted. Name: ${this.templateName}, templateId: ${this.templateId}`);
        this.loader.hide();
        $(`#${this.mainElId}`).removeAttr("hidden");
        $(`#${this.templatesTableElId}`).removeAttr("hidden");

        if (this.list) {
            await this.list();
            this.list = null;
        }
    } 

    async uploadTemplate() {
        if (!this.uploadModal) {
            this.uploadModal = new bootstrap.Modal(`#${TEMPLATE_UPLOAD_MODAL}`);
        }
        this.uploadModal.show();
        return false;
    }

    async uploadTemplateListener(evt){
        const uploadButtonClicked = evt.target.id === "uploadButton"
        const templateFile = uploadButtonClicked && 
            document.getElementById(TEMPLATE_UPLOAD_FILE_PICKER).files[0];
        
        if (!uploadButtonClicked || !templateFile) {
            this.showMsg("Operation Canceled");
            this.logger.post(null, `Operation Canceled`);
            return // EARLY RETURN
        }

        this.loader.show(`Uploading ${templateFile.name}`);
        const reader = new FileReader();
        reader.onload = this.fileLoaded.bind(this);
        reader.readAsArrayBuffer(templateFile); // continues via callback
    }

    async fileLoaded(e) {
        // e.target.result is the file's content as array buffer
        const fileContentsBuffer = e.target.result;
        const contentType = `application/zip`;
        const templateFileEl = document.getElementById(TEMPLATE_UPLOAD_FILE_PICKER);
        const templateFile = templateFileEl.files[0];
        const templateUploadName = templateFile.name
        templateFileEl.value = ""; // reset the file picker
     
        let apiMethod = `/accounts/${this.accountId}/templates`;
        const results = await this.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: "POST",
            headers: [{h: "Content-Type", v: contentType},
                {h: "Content-Disposition", v: `file; filename="${templateUploadName}"; fileExtension=.zip`},
                ],
           body: fileContentsBuffer
        });
        if (results === false) {
            this.loader.hide();
            $(`#${this.mainElId}`).removeAttr("hidden");
            $(`#${this.templatesTableElId}`).removeAttr("hidden");
    
            this.messageModal({
                style: 'text', title: "Template Create problem", msg:
                    `<p>Error message: ${this.callApi.errMsg}</p>`
            });
            this.logger.post("Templates:create Problem: Operation Canceled", `<p>Error message: ${this.callApi.errMsg}</p>`);
            return; // EARLY return
        }
        // good result:
        this.logger.post(null, `Template created. TemplateId: ${results.templateId}`);
        this.loader.hide();
        $(`#${this.mainElId}`).removeAttr("hidden");
        $(`#${this.templatesTableElId}`).removeAttr("hidden");

        if (this.list) {
            await this.list();
            this.list = null;
        }
    }
 
    async download() {
        $(`#${this.mainElId}`).attr("hidden", "");
        $(`#${this.templatesTableElId}`).attr("hidden", "");
        this.loader.show("Downloading the Template");

        let apiMethod = `/accounts/${this.accountId}/templates?include=documents,tabs,pathExtended&is_download=true` +
            `&template_ids=${this.templateId}`;
        const results = await this.callApi.getImageDataUrl(apiMethod);
        if (results === false) {
            this.loader.hide();
            $(`#${this.mainElId}`).removeAttr("hidden");
            $(`#${this.templatesTableElId}`).removeAttr("hidden");
    
            this.messageModal({
                style: 'text', title: "Template Download problem", msg:
                    `<p>Error message: ${this.callApi.errMsg}</p>`
            });
            this.logger.post("Template download Problem: Operation Canceled", `<p>Error message: ${this.callApi.errMsg}</p>`);
            return; // EARLY return
        }
        // good result:
        this.logger.post(null, `Template downloaded. Name: ${this.templateName}, templateId: ${this.templateId}`);
        this.loader.hide();
        const filename = this.templateName.replace(/[^0-9a-zA-Z ]/g , "");
        $(`#${this.mainElId}`).removeAttr("hidden");
        $(`#${this.templatesTableElId}`).removeAttr("hidden");
        $(`#${DOWNLOAD_ANCHOR}`).removeAttr("hidden").attr("href", results).attr("download", `${filename}.zip`);

        setTimeout(
            function(){
                $(`#${DOWNLOAD_ANCHOR}`)[0].click(); // https://stackoverflow.com/a/17105061/64904
            }, 400);
        setTimeout(
            function(){
                $(`#${DOWNLOAD_ANCHOR}`).attr("hidden", "").attr("href", "#")
            }, 1000);
        }

    async allShare(args) {
        $(`#${this.mainElId}`).attr("hidden", "");
        $(`#${this.templatesTableElId}`).attr("hidden", "");

        this.loader.show("Updating the Template");
        const all = !(args && args.not_shared);

        let apiMethod = `/accounts/${this.accountId}/shared_access?item_type=templates` +
            `&templateIds=${this.templateId}`;
        const results = await this.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: "PUT",
            req: {
                sharedAccess: [{
                    templates: [{
                        shared: all ? "shared_to" : "not_shared",
                        sharedGroups: [{
                            group: {groupId: this.everyoneGroupId}
                        }],
                        templateId: this.templateId
                    }]
                }]
            }
        });
        if (results === false) {
            this.loader.hide();
            $(`#${this.mainElId}`).removeAttr("hidden");
            $(`#${this.templatesTableElId}`).removeAttr("hidden");
    
            this.messageModal({
                style: 'text', title: "Template Update problem", msg:
                    `<p>Error message: ${this.callApi.errMsg}</p>`
            });
            this.logger.post("Templates:autoMatch Problem: Operation Canceled", `<p>Error message: ${this.callApi.errMsg}</p>`);
            return; // EARLY return
        }
        // good result:
        this.logger.post(null, `Template updated to${all ? "" : " not"} share with everyone. Name: ${this.templateName}, templateId: ${this.templateId}`);
        this.loader.hide();
        $(`#${this.mainElId}`).removeAttr("hidden");
        $(`#${this.templatesTableElId}`).removeAttr("hidden");
        return true
    }

    async allUnshare() {
        return await this.allShare({not_shared: true})
    }



}

export { TemplateActions };
