// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
//
// Logger main JS script

const LOG_EL = "#logEl";
const blobClickNameSpace = "click.blobView";

$(function () {
    let responseBlobs = {}; // used to hold blobs that represent responses

    // message format: 
    // {source: "logger", op: string, data: object}
    const incomingMessage = function incomingMessageF (e) {
        const data = e.data;
        if ( !data.source || data.source !== "logger") {return}

        console.log (`LOG MSG`, data);
        if (data.op === "post") {
            // data: {h: headline, p: paragraph}
            const time = new Date().toLocaleTimeString();
            const h = data.h ? `<h4 class="mt-4">${time} ${data.h}</h4>` : '';
            let p;
            if (data.p) {
                p = data.p.substring(0, 1) === "<" ? data.p : `<p>${data.p}</p>`
            } else {
                p = ``;
            }
            $(LOG_EL).append(h, p);

        } else if (data.op === "postLog") {
           postLog(data.log)
        }
        hljs.highlightAll(); // Add highlighting https://highlightjs.org/
    }.bind(this);

    /***
     * blobView
     * Displays the appropriate blob
     */
    const blobView = function blobViewF(e) {
        // https://stackoverflow.com/a/61858167/64904
        const blobId = e.currentTarget.getAttribute("data-blobId");
        const winUrl = URL.createObjectURL(responseBlobs[blobId]);
        const popEl = window.open(winUrl, 'blobView', `popup=1,width=800,height=800`);
        if (!popEl || popEl.closed || typeof popEl.closed=='undefined') {
            // popup blocked
            alert ("Please enable the popup window");
        }
        popEl.focus();
        // URL.revokeObjectURL(winUrl) // we're not calling this--enables 
                                       // the url to be copied to a regular tab

    }.bind(this);

    /***
     * log contains
     *    log.method
     *    log.resource
     *    log.requestHeaders 
     *    log.requestContentType
     *    log.requestBody
     *    log.status
     *    log.statusText
     *    log.responseHeaders
     *    log.error
     *    log.responseIsJson
     *    log.responseContentType
     *    log.responseOk
     *    log.error
     *    log.responseBody
     *    log.apiName
     *    log.apiDocs
     */
    function postLog(log) {
        const accordianId = `id${(new Date).getTime()}`
        const accordianItemId = `${accordianId}Item`
        let logHtml = `
<div class="accordion" id="${accordianId}">
    <div class="accordion-item">
        <h2 class="accordion-header">
            <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#${accordianItemId}" aria-expanded="true" aria-controls="${accordianItemId}">
                ${title(log)}
            </button>
        </h2>
        <div id="${accordianItemId}" class="accordion-collapse collapse" data-bs-parent="#${accordianId}">
            <div class="accordion-body">
                ${logInfo(log)}
                ${tabs(log)}
            </div>
        </div>
    </div>
</div>
`
        $(LOG_EL).append(logHtml);
        // remove existing click handlers, then re-add
        $(".blob-button").unbind(blobClickNameSpace).bind(blobClickNameSpace, blobView);
    }

    function logInfo(log) {
        let out = `<p class="mb-0">Status: ${log.status} ${log.statusText}</p>`;
        if (log.apiDocs) {
            out += `<p class="mb-0">${log.resource}</p>`;
            out += `<p><a href="${log.apiDocs}" target="_blank">${log.apiName} documentation</a></p>`;
        } else {
            out += `<p>${log.resource}</p>`
        }
        return out
    }
    
    function tabs(log) {
        const idBase = `id${(new Date).getTime()}`;
        const reqTab = `${idBase}Req`;
        const resTab = `${idBase}Res`;
        const resBodyId = `${idBase}ResBody`; // response body id -- used when the response is a blob
        if (log.responseBlob) {
            responseBlobs[resBodyId] = fixBlob(log.resource, log.responseBlob);
        }
        const tabHtml =  
`
<ul class="nav nav-tabs" role="tablist">
    <li class="nav-item" role="presentation">
        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#${reqTab}" 
            type="button" role="tab" aria-controls="${reqTab}" aria-selected="true">Request</button>
    </li>
    <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#${resTab}" 
        type="button" role="tab" aria-controls="${resTab}" aria-selected="false">Response</button>
    </li>
</ul>
<div class="tab-content">
    <div class="tab-pane fade show active" id="${reqTab}" role="tabpanel" tabindex="0">
        <p class="mt-4"></p>
        ${headers(log.requestHeaders)}
        ${body(log.requestContentType, log.requestBody)}
    </div>
    <div class="tab-pane fade" id="${resTab}" role="tabpanel" tabindex="1">
        <p class="mt-4"></p>
        ${headers(log.responseHeaders)}
        ${body(log.responseContentType, log.responseBody, log.responseBlob, resBodyId, log.error)}
    </div>
</div>
`;
        return tabHtml
    }

    function headers(headers) {
        let keys = Object.keys(headers).sort();
        const out = keys.map((v, i) => `${v}: ${headers[v]}`).join('\n');
        return `<pre class="whtbgnd">${out}</pre>`
    }

    function body(contentType, body, responseBlob = null, resBodyId = null, errorMsg = null) {
        const isJson = contentType && contentType.indexOf("json") >= 0;
        let outBody = '';
        if (errorMsg) {
            return `<pre><code>Error: ${errorMsg}</code></pre>`
        }
        if (isJson) {
            try {
                outBody = JSON.stringify(JSON.parse(body), null, 4);
            } catch (e) {
                outBody = body;
            }
            return `<pre><code class="language-json">${outBody}</code></pre>`
        } else if (responseBlob) {
            return `<button class="btn btn-primary display-inline ms-2 blob-button" type="button" role="button" data-blobId="${resBodyId}">View</button>`
        } else if (body) {
            return `<pre><code>${body}</code></pre>` // future show images, pdf, etc
        } else {
            return ""
        }
    }
    
    /***
     * If the blob represents an html file, then fix the blob's type
     */
    function fixBlob(resource, blob) {
        const html = resource.indexOf("html.txt") !== -1; // is it actually html handled as txt?
        if (html) {
            const fixedBlob = new Blob([blob], {type: "text/html"});
            return fixedBlob;
        } else {
            return blob
        }
    }    

    function title(log) {
        const success = log.status > 199 && log.status < 300 ? "✅" : "❌";
        const name = log.apiName ? log.apiName : log.resource
        const result = `${success}<span class="ms-2 me-2">${operationFormatter(log)}</span>${name}`;
        return result
    }

    function operationFormatter(log) {
        const op = log.method.toUpperCase();
        let klass = ""
        if (op === "GET") {
            klass = "pill get"
        } else if (op === "POST") {
            klass = "pill post"
        } else if (op === "PUT") {
            klass = "pill put"
        } else if (op === "DELETE") {
            klass = "pill delete";
            newVal = "DEL"
        }
        return `<span class="${klass}">${op}</span>`
    }

    function bodyFormatter(body) {
        if (!body) {return}; // EARLY return

        return `<div><pre><code class="language-json">${body}</code></pre></div>`
    }




    // mainline
    window.addEventListener("message", incomingMessage);
})

