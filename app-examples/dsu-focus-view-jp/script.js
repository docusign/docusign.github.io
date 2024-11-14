// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
//
// Docusign University Focus View example Javascipt

$(async function () {
    // This function is run by JQuery once the DOM is up and ready to go

    let recipientViewUrl = ""; // fill in via the debugger
    let clientId = "";
    debugger;
    const signElId = "signing-ceremony"; // the html file's div ID that will be filled with the 
        // focused view signing ceremony
    const padding = 100; // padding pixels of content above the signing div

    await focusedView(recipientViewUrl);
    //// End of the mainline /// 


    /***
     * focusedView, in the browser, calls the Docusign.js library
     * to display the signing ceremony in an iframe
     * 
     * Remember to also make changes in dsjsExternal.html
     */
    async function focusedView(recipientViewUrl) {
        let signingConfiguration = {
            url: recipientViewUrl,
            displayFormat: 'focused',
            style: {
                /** High-level variables that mirror our existing branding APIs. Reusing the branding name here for familiarity. */
                branding: {
                    primaryButton: {
                        /** Background color of primary button */
                        backgroundColor: "darkblue",  // Use CSS color names
                        /** Text color of primary button */
                        color: "lightyellow",
                    }
                },
                /** High-level components we allow specific overrides for */
                signingNavigationButton: {
                    finishText: "Signed!", // default is Submit
                    // 'bottom-left'|'bottom-center'|'bottom-right',  default: bottom-right
                    position: "bottom-right"
                },
                signingDeclineButton: {
                    show: true // planned feature
                },
            }
        }

        // Add a breakpoint on the next line if you'd like to change the colors or
        // other configuration settings
        try {
            const docusign = await window.DocuSign.loadDocuSign(clientId);
            const signing = docusign.signing(signingConfiguration);
                
            /** Event handlers **/
            signing.on('ready', (event) => {
                $(`#${signElId} > iframe`).css('height', `${window.innerHeight - padding}px`);
                window.scroll(0, 0); // for iOS

                console.log('UI is rendered');
            });
            signing.on('sessionEnd', (event) => {
                /** The event here denotes what caused the sessionEnd to trigger, such as signing_complete, ttl_expired etc../ */
                console.log('sessionend', event);
                // Event: { returnUrl: url, type: "sessionEnd", sessionEndType: "signing_complete"}
            });
            
            // Open the signing ceremony
            signing.mount(`#${signElId}`);
        } catch (error) {
            // Any configuration or API limits will be caught here
            console.log ("### Error calling docusign.js");
            console.log (error);              
        }
    }
})
