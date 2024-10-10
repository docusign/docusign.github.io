## Docusign University Focused View Embedded Signing Example

### Introduction
The HTML and JavaScript script file are a minimal example of 
rendering an embedded signing ceremony using the Focused View
feature. 

### Example steps
1. Create an envelope and obtain the envelope ID. The signer recipient
   **must** be a "captive" (embedded) signer. Set the recipient's `clientUserId` 
   property to make the signer a captive signer.
2. Create the recipient view URL by calling EnvelopeViews:createRecipient

   ```
    createRecipientViewRequest = {
            authenticationMethod: "None",
            clientUserId: clientUserId,  // from the Envelopes:create call
            email: email,                // from the Envelopes:create call
            userName: name,              // from the Envelopes:create call
            frameAncestors: FRAME_ANCESTORS, // the origin of the signing ceremony page
            messageOrigins: ["https://apps-d.docusign.com"],
            returnUrl: returnUrl, // to your application
        }
    ```
3. The response URL is the recipientViewUrl
4. Open this example's index.html file in your browser
5. Open the inspector for the page
6. Reload the page, the inspector will open at the `debugger` statement
7. Use the inspector's console to set the JavaScript variables
   `recipientViewUrl` and `clientId`. Note that the recipientViewUrl
   is very long
8. In the debugger, continue execution. The Focused View signing ceremony
   for the envelope should open.
9. In the inspector's console, note the console messages from the script.