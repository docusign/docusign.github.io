/***
 * Logger "monkey patches" window.fetch and then logs fetch requests/responses
 * 
 * https://blog.logrocket.com/intercepting-javascript-fetch-api-requests-responses/
 */


import { ApiMethods } from "./apiMethods.js";
import {
    storageGet,
    storageSet
} from "./utilities.js";

const NAV_ITEM_ID = "#logger";
const LOGGER_URL = "../library/logger.html";
const LOGGER_SAVED_STATUS = "logger_saved_status"; // local storage key

class Logger {
    constructor(args) {
        this.trueFetch = null;
        this.logging = false;
        this.apiMethods = new ApiMethods();
        $(NAV_ITEM_ID).click(this.loggerClicked.bind(this));
        const openLogger = storageGet(LOGGER_SAVED_STATUS) && storageGet(LOGGER_SAVED_STATUS).openLogger;
        if (openLogger) {
            this.startLogging();
            this.openLoggingWindow();
        }
    }

    startLogging() {
        this.trueFetch = window.fetch;
        window.fetch = this.myFetch.bind(this);
        this.logging = true;
        $(NAV_ITEM_ID).text("Logging [Stop]");
        storageSet(LOGGER_SAVED_STATUS, {openLogger: true});
    }

    stopLogging() {
        if (this.trueFetch) {
            window.fetch = this.trueFetch;
        }
        this.logging = false;
        $(NAV_ITEM_ID).text("Start Logging");
        storageSet(LOGGER_SAVED_STATUS, {openLogger: false});
    }

    async myFetch(resource, options) { 
        // see https://stackoverflow.com/a/76558953/64904
        // log is an object with the different parts of the call/response
        let log = {};
        this.requestIntercept(log, resource, options);

        let response;
        try {
            response = await this.trueFetch.call(window, resource, options); 
        } catch (e) {
            await this.responseIntercept(log, response.clone(), e);
            this.postLog(log);
            return Promise.reject(e);
        }
        await this.responseIntercept(log, response.clone())
        this.postLog(log);
        return response;
    }

    requestIntercept(log, resource, options) {
        log.method = options.method || 'get';
        log.resource = resource;
        log.requestHeaders = {};
        if (options.headers) {
            options.headers.forEach((v, k) => {log.requestHeaders[k] = v});
            log.requestContentType = options.headers.get("Content-Type");
        }
        if (options.body instanceof FormData) {
            log.requestBody = `Form Data`;
            for (const pair of options.body.entries()) {
                log.requestBody += `\n${pair[0]}: ${pair[1]}`;
              }              
        } else {
            log.requestBody = options.body;
        }
        const nameRes = this.apiMethods.find(log.method, resource);
        if (nameRes) {
            log.apiName = nameRes.name;
            log.apiDocs = nameRes.docs;
        }
    }

    async responseIntercept(log, response, error=null) {
        log.status = response.status;
        log.statusText = response.statusText;
        log.responseHeaders = {};
        response.headers.forEach((v, k) => {log.responseHeaders[k] = v});
        await this.responseBody(log, response);
        if (error) {log.error = e.toString()}
    }

    /***
     * log the response body
     * tbd: handle non-json responses
     */
    async responseBody(log, response) {
        log.responseIsJson = false;
        log.responseContentType = response.headers.get("Content-Type");
        log.responseOk = response.ok;
        if (response.ok) {
            log.responseIsJson = log.responseContentType.indexOf("json") >= 0;
            if (log.responseIsJson) {
                log.responseBody = await response.text();
            } else {
                log.responseBlob = await response.blob();
            }
        } else {
            log.error = await response.text();
        }
    }

    /***
     * post a message to the logger. 
     * h is the headline, p is the message. Either can be set to null;
     */
    post (h, p=null) {
        if (!this.window || this.window.closed) {
            this.stopLogging();
            return; // EARLY return 
        } 
        this.window.postMessage ({source: "logger", op: "post", h: h, p:p})
    }

    /***
     * post a log entry to the logger. 
     */
    postLog (log) {
        if (!this.window || this.window.closed) {
            this.stopLogging();
            return; // EARLY return 
        } 
        this.window.postMessage ({source: "logger", op: "postLog", log: log})
    }

    /***
     * loggerClicked -- top navigation logger clicked
     */
    loggerClicked(e) {
        e.preventDefault();
        if (this.logging) {
            this.stopLogging();
        } else {
            this.startLogging();
            this.openLoggingWindow()
        }
    }

    openLoggingWindow() {
        if (this.window && this.window.closed === false) {return}; // EARLY return
        const screenHeight = screen.height;
        const screenWidth = screen.width;
        const height = Math.min(900, screenHeight);
        const width = Math.min(900, screenWidth);
        const top=((screenHeight/2)-(height/2))/2;
        const left=(screenWidth/2)-(width/2);

        const features = `popup=1,height=${height},width=${width},top=${top},left=${left},toolbar=1,Location=1,Directories=1,Status=1,menubar=1,Scrollbars=1,Resizable=1`;
        this.window = window.open(LOGGER_URL, "logger", features);
        window.focus(); // show the main window
        if(!this.window || this.window.closed || 
            typeof this.window.closed=='undefined') {
             // popup blocked
             this.window = null;
             alert ("Please enable the popup window");
             this.stopLogging();
         }
    }



}

export { Logger };
