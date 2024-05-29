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

## Docusign.js
tbd

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
Currently, payments tabs are only supported by the Classic Embedded Signing UX.

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


