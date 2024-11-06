// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT


const IFRAME_RETURN_ORIGIN = "https://docusign.github.io";
const IFRAME_RETURN = IFRAME_RETURN_ORIGIN + "/jsfiddleDsResponse.html";


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

        this.messageListener = this.messageListener.bind(this);
        window.addEventListener("message", this.messageListener);
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
                  returnUrl: IFRAME_RETURN
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
     * messageListener handles incoming messages from the Template Edit view
     */
    async messageListener(message) {
        if (message.origin !== IFRAME_RETURN_ORIGIN || !message || !message.data || !message.data.href) {
            return; // EARLY RETURN
        }
        console.log(message);
        // message.data.href  eg "https://docusign.github.io/jsfiddleDsResponse.html?envelopeId=4d3d3eeb-72e4-4932-8fbe-xxxxxxx8&event=Save"
        const splits = message.data.href.split("&event=");
        const m = splits.length == 2 ? `event=${splits[1]}` : `unexpected response: ${message.data.href}`
        this.logger.post(null, `Console view response: ${m}`);

        if (this.consoleWindow) {
            this.consoleWindow.close()
        }
        this.messageModal({
            style: 'text', title: "API problem", msg:
                `<p>Response from the Console Sender window: ${m}</p>`
        });
    }    

    /***
     * Destroy cleanup
     */
    destroy() {
    }

}

export { EmbeddedConsole };
