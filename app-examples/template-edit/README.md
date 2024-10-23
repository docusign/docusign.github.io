# Docusign Embedded Signing Examples

## Introduction
This application enables developers to test the multiple styles of Docusign signing ceremonies that 
can be embedded in web and mobile applications. The four styles are:
* **Focused View** is a minimalist signing ceremony that puts the documents to be
signed front and center for the signer. Focused View is designed to be embedded in a web application.
* **Click to Agree** is a Clickwrap *agreement ceremony*. It enables the user to agree with (not sign) a
document. The agreement can include one or more supplemental documents. An optional ERSD can be included too.
* **Docusign.js with Default View** uses the classic embedded signing UX with the developer-friendly 
benefits (see below) of docusign.js.
* **Classic Embedded Signing** is the most powerful Docusign signing ceremony. It can be used with all 
types of Docusign signatures (SES, AES, QES), and with all types of Docusign IDV authentication options.

## Limitations
Each of the four tabs for the signing examples includes an **Information** button. Use the 
Information button to see the known limitations, if any, for that style of signing. 

## Top Navigation Bar Items
* **Settings** -- see the Settings section below.
* **Start Logging** -- opens the logging window. The logging window includes the API calls used by the tool. 
Click on an API Call to expand it and to see the API request and response.
* **Save to URL** -- saves the current configuration of the tool to a URL. 
* **README** -- displays this file.

## Settings
Click the **Settings** item in the top navigation bar to open the Settings Modal.

### Account
Use this setting to change the account that will be used.

### Output
By default, the tool opens the signing or agreement ceremony by replacing the tool's UI with the Docusign session.

Instead of the tool opening the ceremony, you can choose to have the URL displayed for you to then open it. 
If you choose to have the URL displayed, remember that you must use it within 5 minutes. 

**Use an iframe & GUI chrome?** This field only applies if the **URL** output option is selected.
If this option is checked, then an iframe with minimal GUI chrome (just the top navigation bar)
is used. If the option is not checked, then a 100% iframe is used for the first three example 
categories since the Docusign JS library always creates an iframe.

### Signer User Experience
Show Decline option? -- This setting controls the visibility of the Decline 
button for the Focused View and Focused View/Click to Agree tabs.

Loading indicator -- choose the style for the loading indicator used while the app 
waits for the envelope and signing ceremony to be created. 

See [Tognazzini](https://asktog.com/atc/principles-of-interaction-design/#latencyReduction) 
and [Nielsen](https://www.nngroup.com/articles/response-times-3-important-limits/) 
for more information on application latency and loading indicators.

### Authentication
Select **Default Phone/SMS Authentication** and enter a phone number to enable this option.

### Payment Gateway
As discussed below, enter your Payment Gateway ID if your document includes a Payment tab.

## Common options

### Document
Chooses which document will be used.

### Template
Choose a template from the templates in your account.

If a template is chosen, the **Document** option is ignored.

#### Template Role
The template should have a role named `signer` (lowercase s).
The template's tabs and other settings for the `signer` role will be used. 
Note that the tool changes the signer recipient to be a captive (embedded) recipient.

### Supplemental Documents
Use the checkboxes to include or omit supplements 1 and 2.

Use the select fields to choose how the signer will interact with the supplemental document. 

## Docusign.js
The [Docusign.js library](https://developers.docusign.com/docs/esign-rest-api/esign101/concepts/embedding/docusign-js-embedded-reference/)
is used with first three example categories listed above. 

Docusign.js and [Classic Embedded Signing](https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopeviews/createrecipient/) 
differ in how they return control to your application:
* Classic Embedded Signing: the browser is redirected to your application. The **event** query parameter contains the status.
* Docusign.js: the library raises a DOM event to your application.

iframes: Docusign.js always creates an iframe in the DOM for the signing ceremony. The library deletes the iframe after the signing session has completed.

While the Classic Embedded Signing ceremony can be used with an iframe, management of the iframe is the developer's responsibility.

## Payment tabs
Testing the different signing ceremonies with a 
[payment tab](https://developers.docusign.com/docs/esign-rest-api/esign101/concepts/tabs/payment/) requires additional set up and configuration steps.

### Configure a test payment gateway
1. Login to your developer (demo) account.
1. Click the **Settings** link in the top navigation bar to open the eSignature Administration app.
1. Click the **Payments** link in the **Integrations** section of the lefthand navigation bar.
1. Click **Add Payment Gateway**
1. Click **Stripe** (It has an easy to use demo account feature.)
1. Click **Skip this form** in the test mode section
1. You are brought back to the **Payments** screen with a listing
for your new Stripe test account.
1. Click the **Edit** choice for the Stripe account. 
1. Select the credit cards you'd like to accept and save your changes.
1. Copy the **Gateway Account ID** for Stripe. You'll need it for the
next step. 

### Configure the application
1. Start the Embedded Signing Examples application
1. Click **Settings** (top navigation bar)
1. Enter the payment gateway ID into the Settings form
1. Close the form

### Testing payments
Currently, payments tabs are supported by the Classic Embedded Signing UX
and by Docusign.js with Default View.

1. In the test application, select the **Classic Embedded Signing** tab. 
1. Choose the *Payment example* Document.
1. Sign the document.
1. You will then be asked for your credit card information. You can use
a real credit card, or a test number.

Stripe test MasterCard number: 5555555555554444

Use any date in the future and any three digit CVC number. 
[Additional Stripe test numbers](https://docs.stripe.com/testing?locale=en-GB) 

If you would like to use payments with Focused View, please ask Docusign Customer
Service to add your company information to bug report C2A-3499.


