/**
 * Copyright (c) 2023 - DocuSign, Inc. (https://www.docusign.com)
 * License: The MIT License. See the LICENSE file.
 */

/**
 * File: log.js
 * Manages a specific log entry.
 */


/**
 *  Each instance is a log object
 */

// Internal names that are wrong or not specific. 
// Pattern so far: some template API methods are implemented by the envelope method and 
// reported as the envelope API name.
// Need a simple URL check.
const specialInternalNames = {
    RequestCorrectToken: {op: "POST", urlIncludes: "/edit", correctName: "EnvelopeViews:createEdit"},
    AddEnvelopeTabs: {op: "POST", urlIncludes: "/templates/", correctName: "TemplateRecipientTabs:create"},
    DeleteEnvelopeTabs: {op: "DELETE", urlIncludes: "/templates/", correctName: "TemplateRecipientTabs:delete"},
    GetDocumentImage: {op: "GET", urlIncludes: "/templates/", correctName: "Templates:getDocumentPageImage"},
    GetEnvelopeNotification: {op: "GET", urlIncludes: "/templates/", correctName: "Templates:getNotificationSettings"},
    GetEnvelopeRecipients: {op: "GET", urlIncludes: "/templates/", correctName: "TemplateRecipients:list"},
    GetBrand: {op: "GET", urlIncludes: "/logos/", correctName: "AccountBrands:getLogo"},
    SetEnvelopeLock: {op: "POST", urlIncludes: "/templates/", correctName: "TemplateLocks:create"},
    UpdateEnvelopeRecipients: {op: "PUT", urlIncludes: "/templates/", correctName: "TemplateRecipients:update"},
};

// Identify unknown API methods via their Operation and URL pattern
// These API methods sometimes (always) are reported with no internal name in the 
// log entry file name.
const unidentifiedApiMethods = [
    {regex: /^POST https:\/\/.*\/restapi\/.*\/accounts\/.*\/envelopes\r\n/,
    correctName: "CreateEnvelope"},
    {regex: /^GET https:\/\/.*\/restapi\/.*\/accounts\/.*\/bulk_send_batch\?.*\r\n/,
    correctName: "BulkSend:getBulkSendBatches"}
];

class Log {
    /**
     * The attributes
     * fileName
     * traceToken
     * timestamp (includes microsecond)
     * timeMicroSeconds (for sorting)
     * statusCodeString eg "200 OK"
     * status {success, failed, other}. Other for 300-level
     * operation ("GET", "DEL", "POST")
     * cors -- boolean
     * multipart -- does the log entry use multipart encoding?
     * internalName -- eg CreateAndSendEnvelope. Sometimes munged.
     * name -- eg Envelopes:create (or internalName if unknown)
     * html -- name as html with link to docs
     * docsUrl -- url for the docs (or null)
     * error -- was there a parsing error of any sort?
     * url
     * ndse
     * 
     * requestHeaders
     * requestJson
     * requestBody -- only if not requestJson
     * responseHeaders
     * responseJson 
     * responseBody -- only if not responseJson
     * 
     */

    multipartRegex = /\r\nContent-Type:\s*multipart\/form-data;\s*boundary=(.*)\r\n/;
    partDividerRegex = /\r\n\r\n/;
    internalNameRegex = /[0-9]{1,2}_.+_(.*)\.txt/;
    statusRegex = /^[0-9]{3} [a-zA-Z]+$/;
    statusCodeIntRegex = /(^[0-9]{3})/;
    urlMatchesRegex = /^([A-Z]*) (.*)\r\n/;
    urlLineRegex = /^.* http.*:\/\/.*docusign.*\/.*/;

    /**
     * 
     * @param {string} fileName 
     * @param {string} data 
     */
    constructor(fileName, data, apiNames) {
        this.fileName = fileName;
        this.apiNames = apiNames;
        const nameMatch = this.fileName.match(this.internalNameRegex);
        this.internalName = nameMatch ? nameMatch[1] : "";
        this.error = false;
        this.raw = "";
        this.requestHeaders = "";
        this.requestJson = null;
        this.requestBody = "";
        this.responseHeaders = "";
        this.responseJson = null;
        this.responseBody = "";
   
        // process data
        this.multipart =  data.includes("Content-Type: multipart/form-data;");
        if (this.multipart) {
            this.processParts(
                this.processMultipart(data));
            return;
        }
        // process regular (not multipart)
        const parts = data.split(this.partDividerRegex)
        this.processParts(parts);
    }

    processMultipart(data) {
        const matchResults = data.match(this.multipartRegex);
        const divider = matchResults  ? matchResults[1] : false;
        const lastMarker = "--\r\n\r\n\r\n";
        if (!divider) {
            this.raw = data;
            this.error = "Multipart divider not found";
            return;
        }
        const parts = data.split(divider);
        const section1 = (parts[0]+divider+parts[1]).slice(0, -4);

        let requestBody = "";
        let i = 2; // index of first part of request body
        for (i; i < parts.length; i++) {
            if (parts[i].startsWith(lastMarker)) {
                requestBody += divider + "--";
                break;
            } else {
                requestBody += divider + parts[i]
            }
        }

        const sectionEnd = parts[i].slice(lastMarker.length);
        let responseParts = section1.split(this.partDividerRegex);
        responseParts.push(requestBody);
        responseParts = responseParts.concat(sectionEnd.split(this.partDividerRegex));
        return responseParts;
    }

    processParts(parts) {
        /**
         * Game plan 
         * Work on the request until we hit the status code. Then we're on the 
         * response. But there is a corner case (see below.) Sigh.
         */
        let processing = "request"; // working on the request
        // parts[0] is (almost) always the log header
        // parts[1] is (almost) always the requestHeaders
        // parts[2] could be a request body or the status code
        // ...

        // A corner case:
        /**
         * Example corner case log entry: See assets/02_NotFound_GetUserProfileImage.txt
         * Sections in this pattern:
         *   URL by itself!
         *   TraceToken and Timestamp section
         *   Request header section, but without the URL!
         *   Empty line!
         *   Status and response headers as one section
         *   Response body
         * PLAN: detect the corner case, then munge the data to fit the usual pattern
         */
        const traceToken = "TraceToken: ";
        if (parts[0].slice(0,traceToken.length) != traceToken) {
            // CORNER CASE
            // confirm the first part is the URL line:
            if (parts[0].match(this.urlLineRegex)) {
                // confirmed! Munge the parts array
                let newParts = [];
                newParts.push(parts[1]); // The TraceToken section
                newParts.push(`${parts[0]}\r\n${parts[2]}`); // reassemble request headers
                // If the next section starts with a new line, then no RequestBody, and
                // it includes the status code but not in its own section! 
                // Or the section is the RequestBody
                if (parts[3].slice(0,2) === "\r\n") {
                    // its \r\nstatus code followed by ResponseHeaders
                    let part3lines = parts[3].split("\r\n");
                    if (part3lines[1].match(this.statusRegex)) {
                        newParts.push(part3lines[1]);
                        part3lines.shift(); // remove first two lines
                        part3lines.shift();
                        newParts.push(part3lines.join("\r\n"));
                    }
                }
                if (parts[4]) {
                    newParts.push(parts[4])
                }
                if (parts[5]) {
                    newParts.push(parts[5])
                }
                parts = newParts;
            }
        }

        this.traceToken = parts[0].match(/TraceToken: (.*)/)[1];
        this.timestamp = parts[0].match(/Timestamp: (.*)/)[1];
        const tsparts = this.timestamp.split(".");
        const tstamp = new Date(Date.parse(tsparts[0]));
        // change "0534526Z" to number of microseconds
        this.timeMicroSeconds = (tstamp.valueOf() * 1000.0) +
            parseInt(tsparts[1].slice(0,-1))/10.0;

        // parts[1] is the requestHeaders
        this.requestHeaders = parts[1];
        let urlMatches = parts[1].match(this.urlMatchesRegex)
        this.operation = urlMatches[1];
        this.url = urlMatches[2];
        this.cors = parts[1].includes("Sec-Fetch-Mode: cors");
        this.ndse = parts[1].includes("app.docusign.net");

        // Try another lookup technique for Unknown API methods
        if (!this.internalName) {
            const foundApiMethod = unidentifiedApiMethods.find(
                val => parts[1].match(val.regex))
            if (foundApiMethod) {
                this.internalName = foundApiMethod.correctName
            } else {
                this.internalName = "Unknown"
            }
        }

        // Special handling for some internalName corner cases
        if (this.internalName) {
            // See if we need to correct the internalName
            const special = specialInternalNames[this.internalName];
            if (special && this.operation === special.op && this.url.includes(special.urlIncludes)) {
                this.internalName = special.correctName;
            }
        } else {
            this.internalName = "unknown"
        }
        
        this.name = this.apiNames.name(this.internalName);
        this.html = this.apiNames.html(this.internalName);
        this.docsUrl = this.apiNames.docsUrl(this.internalName);
        
        // parts[2] is the requestBody or status code
        this.statusCodeString = "";
        if (parts[2].match(this.statusRegex)) {
            this.statusCodeString = parts[2];
            this.requestBody = "";
            this.requestJson = null;
        } else {
            // parts[2] is the requestBody
            if (this.multipart) {
                this.requestJson = null;
                this.requestBody = parts[2];
            } else {
                try {
                    this.requestJson = JSON.parse(parts[2]);
                } catch (e) {
                    this.requestJson = null;
                    this.requestBody = parts[2];
                    this.error = "Request body: JSON parse error";
                }
            }
        }

        // parts[3] is the status code or response headers
        if (parts[3].match(this.statusRegex)) {
            this.statusCodeString = parts[3];
            this.responseHeaders = "";
        } else {
            this.responseHeaders = parts[3];
        }

        // statusCodeString is now set. Set 
        // status {success, failed, other}. Other for 300-level
        let statusInt = parseInt(this.statusCodeString.match (this.statusCodeIntRegex)[1]);
        this.status = "other"
        if (statusInt >= 200 && statusInt <= 299) {
            this.status = "success"
        } else if (statusInt >= 400 && statusInt <= 599) {
            this.status = "failed"
        }

        // parts[4] is the response headers or response body or nothing
        let responseBodyPart = null;
        if (parts[4] && !this.responseHeaders) {
            // response headers
            this.responseHeaders = parts[4];
        } else if (parts[4]) {
            responseBodyPart = parts[4];
        }

        if (parts[5]) {
            responseBodyPart = parts[5];
        }

        if (responseBodyPart) {
            try {
                this.responseJson = JSON.parse(responseBodyPart);
            } catch (e) {
                this.responseJson = null;
                this.responseBody = responseBodyPart;
                this.error = "Response body: JSON parse error";
            }
        }

        //////
        if (false && this.multipart) console.log(`${this.fileName} -- ${this.internalName}\n` +
            `Trace: ${this.traceToken}\n` +
            `Timestamp: ${this.timestamp}\nTimestamp microSec: ${this.timeMicroSeconds}\n`+
            `Operation: ${this.operation}\n` +
            `CORS: ${this.cors?'Yes':'No'}\n` +
            `Multipart: ${this.multipart?'Yes':'No'}\n` +
            `Request Headers\n${this.requestHeaders}\n`+
            `Request JSON\n${this.requestJson ? JSON.stringify(this.requestJson,null,4):""}\n`+
            `Request Body\n${this.requestBody}\n` +
            `\n${this.statusCodeString}\n\n` +
            `Response Headers\n${this.responseHeaders}\n`+
            `Response JSON\n${this.responseJson ? JSON.stringify(this.responseJson,null,4):""}\n`+
            `Response Body\n${this.responseBody}\n`
         )
    }

    /**
     * Returns the log entry as one big clump of text, similar but not exactly
     * the same as the original file. 
     */
    asText() {
        let out = [];
        out.push(`API log filename: ${this.fileName}`);
        out.push(
            `TraceToken: ${this.traceToken}\nTimestamp: ${this.timestamp}\nAPI method: ${this.name}`);
        out.push(this.requestHeaders);
        out.push(this.requestJson ? JSON.stringify(this.requestJson, null, 4) : this.requestBody)
        out.push(this.responseHeaders);
        out.push(this.responseJson ? JSON.stringify(this.responseJson, null, 4) : this.responseBody);
        return out.join("\n\n");
    }

}
export { Log };
