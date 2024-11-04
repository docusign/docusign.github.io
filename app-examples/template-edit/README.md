# Docusign Template Edit Example

## Introduction
This application example is a Single Page App (SPA) that:
* Lists the templates in an account
* Templates can be edited; copied; added to or removed from the set of match-eligible templates;
  deleted; downloaded; shared or unshared with everyone in the account. 

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

## Template table
When the example starts, it will load "My Templates," similar to the My Templates folder
in the Docusign web app. 
See the 
[Docusign Templates User Guide](https://support.docusign.com/s/document-item?language=en_US&rsc_301&bundleId=xry1643227563338&topicId=dqj1578456412286.html&_LANG=enus)

### Columns

#### *Star*
The *Star* column includes a star if the template was marked as a favorite template.

#### Shared All
The Shared All column has a check mark if the template is shared with all members of the account.

#### Name
The name of the template.

#### Owner
The owner of the template.

#### Created Date
The Create Date for the template.

#### Last Change
The date the template was last changed.

#### Folders
The private and shared folders that the template belongs to. 
Clicking on a folder name will update the table to show the 
templates in that folder.

#### Actions
The Action button for the template.

### **New Template** button
Creates a new template and opens the template edit view for the template.

### **Upload Template** button
Enables you to upload a template definition file (zip format), and add the 
new template to your template folder.

### Search
Enables you to search all of the templates listed in the table, including
templates not displayed on the current page of the table. 

The search is for the Matching, Name, Owner, and Folder content. For example,
to view only the templates eligible for matching, enter "eligible" in the search field.

### Template column controls
Use the Up Arrow/Down Arrow glyphs for each column to sort the entire table by that column,
ascending or descending.

### Template controls
At the bottom of the table, the number of templates in the table is shown,
the templates per page can be set, and the table can be paged to subsequent 
or prior pages.

## Template Actions
Templates can be edited; copied; added to or removed from the set of match-eligible templates;
  deleted; downloaded; shared or unshared with everyone in the account. 

## Template folders
The example lists the user's template folders in the left navigation column of the example.

Clicking on the **name** of a folder will update the table to show the templates in that 
folder. Some folder names are category names and clicks on those names open
the next level of sub-folders.
For example, the "Folders" and "Shared Folders" names are category names. 

Clicking on the **caret symbol** next to a folder name will expand the folder list
to show another level of sub-folders.

# Source
The example is an open source product and uses the MIT license.

The source for the example is the self-contained folder 
[template-edit](https://github.com/docusign/docusign.github.io/tree/master/app-examples/template-edit)

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
   [authCodePkce.js](https://github.com/docusign/docusign.github.io/blob/master/app-examples/template-edit/library/authCodePkce.js#L11)
   update the `oAuthClientIDdemo` constant with your client ID.
   (Client IDs are not secrets.)
1. Using your web browser, open the URL for the app's directory.

   Hopefully you'll see the app, same as if you open 
   [docusign.github.io/app-examples/template-edit/](https://docusign.github.io/app-examples/template-edit/)

   If not, debug and leave an issue (or better, a PR) for this 
   repo. 

   # Known Issues
   The Include / Exclude from Matching actions return an error.
   The API is planned to be updated to become a public API in 
   January 2025. At that time the Matching actions should work
   as expected.

   # Future work
   The example could be enhanced to:
   * enable templates to be
   moved to the user's folders
   * enable folders to be created or deleted
   * enable templates to be shared with specific people or groups
   * enable templated to be favorited

   Your help to add those features would be appreciated.
   Submit a pull request! All pull request software must
   use the MIT lcense.
