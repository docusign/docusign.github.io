// Copyright © 2022 DocuSign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT

// Example template settings
// Note that the url does not end in .json

/*
const templates = [
    {
        url:
            "https://docusign.github.io/examples/templates/Anchor_text_with_checkboxes_v2",
        name: "DevCenter example: Anchor text with checkboxes v2",
        description:
            "This DevCenter example template includes one PDF file with anchor text. Checkboxes are grouped to require that exactly one of the boxes is included. The template includes text fields and envelope metadata.",
        templateId: null
    }
];
*/

/*
 * CheckTemplates looks up the needed templates in the
 * default account. If they're there, then the templateIds are
 * looked up. If the templates aren't there, then they're uploaded.
 *
 * Nota Bena! This function is only needed to support
 * examples. Normally, you'd create the template in your account
 * and configure your application with the templateId or
 * templateIds.
 *
 * But this example will be used by people who do not
 * have the templates in their account.
 */

class CheckTemplates {
    constructor({callApi, accountId}) {
        this.callApi = callApi;
        this.accountId = accountId;

        this.accountTemplates = null;
        this.templates = null;
        this.errMsg = '';
        this.msg = '';
    }

    /* 
     * Checks the account to see if it has the templates.
     * If not, uploads them
     * public variables msg may be set with status
     * errMsg is '' or set to an errMsg
     *
     * The templates object is always returned.
     */
    async check(templates) {
        this.templates = templates;
        let results = await this.listAccountTemplates();
        if (!results) {
            results = {};
        }
        this.accountTemplates = results.envelopeTemplates || [];
        let ok;
        let i;
        for (i = 0; i < this.templates.length; i++) {
            ok = await this.checkTemplate(i);
            if (!ok) {
                break;
            }
        }
        if (!ok) {
            this.errMsg += `Could not upload template ${templates[i].name}: ${this.callApi.errMsg}`;
            return this.templates;
        }
        return this.templates;
    }
    
    async listAccountTemplates() {
        const apiMethod = `/accounts/${this.accountId}/templates`;
        const results = await this.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: "GET",
            req: null
        });
        return results ? results : false;
    }

    /*
     * If the template is not on the account, upload it
     */
    async checkTemplate(i) {
        const accountTemplate = this.accountTemplates.find(
            (accountT) => accountT.name === this.templates[i].name
        );
        if (accountTemplate) {
            // The template is already in the account!
            this.templates[i].templateId = accountTemplate.templateId;
            return true;
        } else {
            // Need to upload the template to the account
            return await this.uploadTemplate(i);
        }
    }

    async uploadTemplate(templateIndex) {
        const template = this.templates[templateIndex];
        // Get the template definition
        const templateDefinition = await this.getTemplateDefinition(
            template.url
        );
        if (!templateDefinition) {
            this.errMsg += `Could not fetch template «${template.name}». `;
            return false;
        }

        let apiMethod = `/accounts/${this.accountId}/templates`;
        let results = await this.callApi.callApiJson({
            apiMethod: apiMethod,
            httpMethod: "POST",
            req: templateDefinition
        });
        if (!results) {
            this.errMsg += 
                `Could not upload template «${template.name}» to your account. `;
            return false;
        }

        const templateId = results.templateId;
        this.templates[templateIndex].templateId = templateId;
        this.msg += `Uploaded template «${template.name}» to your account. `;
        return true;
    }

    /*
     * GET the template from GitHub pages. It is sent as an octet
     * string so we parse it here.
     */
    async getTemplateDefinition(url) {
        try {
            let results = await fetch(url, {
                mode: "cors",
                headers: new Headers({
                    Accept: `*/*`
                })
            });
            if (results && results.ok) {
                const textResponse = await results.text();
                return JSON.parse(textResponse);
            } else {
                this.errMsg += 
                    `Problem while fetching template ${url}. ` +
                        `Error: ${results ? results.statusText : "no response"}. `;
                return false;
            }
        } catch (e) {
            if (e instanceof SyntaxError) {
                this.errMsg += `Could not parse template ${url}. `;
            } else {
                this.errMsg +=
                    `Problem while fetching template ${url}. ` +
                        `Error: ${e.toString()}. `;
            }
            return false;
        }
    }
}

export {CheckTemplates}