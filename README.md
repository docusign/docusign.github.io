# docusign.github.io

## Docusign eSignature Examples and Utilities

* [API Logger utility](https://docusign.github.io/apiLogger) displays the API log zip
files in an easy to use format. 
[How to collect API logs](https://support.docusign.com/s/document-item?language=en_US&rsc_301&bundleId=jux1643235969954&topicId=poz1578456669909.html&_LANG=enus). [Blog post about the utility](https://www.docusign.com/blog/developers/analyze-your-api-calls-api-logger).

* [Embedded Signing example](app-examples/embedded-signing/) demonstrates the different formats for 
embedding the signing ceremony into your application including Click to Agree and Focused View.

* [Embedded Sending example](app-examples/embedded-views-v2) demonstrates the 
    * embedded sending view, including UX customization options
    * embedded correct view, including UX customization options
    * embedded template edit view

* [Template Edit example](https://docusign.github.io/app-examples/template-edit/) demonstrates
    * listing template folders
    * listing templates 
    * Editing templates by using the [embedded template edit view](https://developers.docusign.com/docs/esign-rest-api/reference/templates/templateviews/createedit/)
    * Creating, Uploading, and Downloading templates

### Individual Consent Thank You page
A [generic consent thank you page](https://docusign.github.io/thankyou) can be used
as the redirectUrl for people who have granted consent to an application.

The page removes any query parameters from the URL resulting from the OAuth Authorization Grant flow.
