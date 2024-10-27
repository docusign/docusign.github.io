// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

/*
 * CLASS TemplateActions
 *
 */

const IFRAME_RETURN_ORIGIN = "https://docusign.github.io";
const IFRAME_RETURN = IFRAME_RETURN_ORIGIN + "/jsfiddleDsResponse.html";
const TEMPLATE_EDIT_MODAL = "templateEditModal"; // the ID

class TemplateActions {
    /***
     * 
     */

    editModal;


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
        window.addEventListener("message", this.messageListener)
    }

    /***
     * action  executes the desired action
     */
    async action(args) {
        this.templateId = args.templateId;
        const actionRequest = args.action;
        this.logger.post(`${actionRequest} Action`, `Template ID ${this.templateId}`);
        await this[actionRequest]();
    }

    /***
     * messageListener handles incoming messages from the Template Edit view
     */
    messageListener(message) {
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
        this.logger.post(null, `New template created. name: ${results.name}, templateId: ${results.templateId}`);
        this.logger.post(null, `Opening Edit view`);
        this.templateId = results.templateId;
        await this.edit();
    }

    async matchInclude() {
        
    }

    async matchExclude() {
        
    }

    async delete() {
        
    }

    async download() {
        
    }

    async allShare() {
        
    }

    async allUnshare() {
        
    }



}

export { TemplateActions };
