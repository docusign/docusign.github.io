# docusign.github.io

## DocuSign Signing Complete page

This repo exists to provide as Github Pages returnUrl page for DocuSign API remote signing calls.

The hosted page parses event URLs like:

- https://docusign.github.io/returnUrl/?event=session_timeout&e=16e6c226...
- https://docusign.github.io/returnUrl/?event=signing_complete

And displays the status (Signing Complete, Session Timeout etc.) in the page body.

![screen shot](https://github.com/docusign/docusign.github.io/blob/master/doc/docusign.github.io_screenshot.png?raw=true)

## Individual Consent Thank You page

Page https://docusign.github.io/thankyou shows a thank you page for
people who have granted consent to an application.

The page removes any query parameters from the URL resulting from the OAuth Authorization Grant flow.

## CodePen example assets
The /examples directory includes documents and templates used by the CodePen examples. 
See [codepen.io/docusign](https://codepen.io/docusign)
