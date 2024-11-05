// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

/*
 * CLASS EmbeddedConsole
 */

class EmbeddedConsole {
    /***
     * Properties in this.templates
     *   envelopeId 
     */
    busy = false;


    constructor(args) {
        this.showMsg = args.showMsg;
        this.messageModal = args.messageModal;
        this.loader = args.loader;
        this.clientId = args.clientId;
        this.accountId = args.accountId;
        this.callApi = args.callApi;
        this.logger = args.logger;
        this.padding = args.padding;
        this.mainElId = args.mainElId;
    }

    /***
     * openConsole
     *   opens the console view
     */
    async openConsole({envelopeId}) {
        $(`#${this.mainElId}`).attr("hidden", "");
        this.loader.show("Calling Console View API");
        let ok;

        let apiMethod = `/accounts/${this.accountId}/views/console`;
        const results = await this.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: "POST",
            req: {envelopeId: envelopeId ? envelopeId : null,
                  returnUrl: "https://docusign.com"
            }
        });
        if (results !== false) { // good result 
            this.consoleUrl = results.url;
            this.consoleWindow = window.open(this.consoleUrl);
            this.loader.hide();
            $(`#${this.mainElId}`).removeAttr("hidden");
        } else {
            this.loader.hide();
            $(`#${this.mainElId}`).removeAttr("hidden");
            this.messageModal({
                style: 'text', title: "API problem", msg:
                    `<p>Error message: ${this.callApi.errMsg}</p>`
            });
            this.logger.post("API Problem: Operation Canceled", `<p>Error message: ${this.callApi.errMsg}</p>`);
            ok = false;
        }
        this.loader.hide();
        $(`#${this.mainElId}`).removeAttr("hidden");
    }


    /***
     * Destroy cleanup
     */
    destroy() {
    }

}

export { EmbeddedConsole };
