# Docusign Console Embedded View Example

## Introduction
This application example is a Single Page App (SPA) that:
* opens the Console View either with or without an Envelope ID. 

## Support
This example is ***not a Docusign product!*** It is **not** supported by Docusign.
Support can be purchased from Docusign Professional Services.
Docusign support contracts do **not** include support for this example or other code examples.

## Top Navigation Bar Items
* **Settings** -- see the Settings section below.
* **Start Logging** -- opens the logging window. The logging window includes the API calls used by the tool. 
Click on an API Call to expand it and to see the API request and response.
* **README** -- displays this file.

## Settings
Click the **Settings** item in the top navigation bar to open the Settings Modal.

### Account
Use this setting to change the account that will be used. The setting is sticky and the 
selected account will again be used the next time the example is used on the same browser.
If the selected account is not available to the user then the user's default 
account will be used.

### Loading indicator
Choose the style for the loading indicator used while the app 
waits for API calls to complete. 

See [Tognazzini](https://asktog.com/atc/principles-of-interaction-design/#latencyReduction) 
and [Nielsen](https://www.nngroup.com/articles/response-times-3-important-limits/) 
for more information on application latency and loading indicators.

## Authentication
This example runs entirely in the browser. It obtains its access token when the
user logs in. The OAuth Authorizatiion Code grant flow is used with PKCE and without
a secret (since the example is classified as a 
[Public client](https://datatracker.ietf.org/doc/html/rfc6749#section-2.1) per the OAuth standards.)

# Source
The example is an open source product and uses the MIT license.

The source for the example is the self-contained folder 
[embedded-console](https://github.com/docusign/docusign.github.io/tree/master/app-examples/embedded-console)

## Installation
1. Download the folder to a directory served by your web server.
   Your server must be configured to serve the index.html
   file when a directory is requested. 

   Your web server does not need Node, PHP, or any other
   server-side configuration. Since the app is a SPA,
   any type of web server can be used, including a 
   files-only server such as S3 or a CDN.
1. Configure a Client ID (integration key) in Docusign with 
   **Apps and Keys** settings
    
    1. Is your application able to securely store a client secret? **No**
    1. Select App Type: **Single-Page Web Application**
    1. Authentication Method for your App **Authorization Code Grant with Proof Key for Code Exchange (PKCE)**
    1. Additional settings / Redirect URIs: enter the full URL (including the path) to the app on your host. Do not include index.html. Do include the trailing slash.
    
       Example: http://localhost/template-edit/
    1. CORS Origin URL: include the origin (not the URL) for the app. 

       Example: http://localhost
    1. Allow CORS for OAuth calls: **Check** (allow)
    1. Allowed HTTP Methods: **Check all**
1. In the source file 
   [authCodePkce.js](https://github.com/docusign/docusign.github.io/blob/master/app-examples/embedded-console/library/authCodePkce.js#L11)
   update the `oAuthClientIDdemo` constant with your client ID.
   (Client IDs are not secrets.)
1. Using your web browser, open the URL for the app's directory.

   Hopefully you'll see the app, same as if you open 
   [docusign.github.io/app-examples/embedded-console/](https://docusign.github.io/app-examples/embedded-console/)

   If not, debug and leave an issue (or better, a PR) for this 
   repo. 

