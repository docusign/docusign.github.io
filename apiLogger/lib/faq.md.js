/**
 * Copyright (c) 2023 - DocuSign, Inc. (https://www.docusign.com)
 * License: The MIT License. See the LICENSE file.
 */

/**
 * File: faq.md.js
 * The FAQ for the project, as markdown content. 
 */

window.faqmd = `
## F.A.Q.

1. Q: Is this application a DocuSign product?

   A: No, it is an open source example application. It is not a DocuSign product. It is not supported.
   please see the LICENSE file in the [source directory](https://github.com/docusign/docusign.github.io/tree/master/apiLogger) for more information.

2. Q: When I upload my API log zip file, is any data sent to DocuSign or to another server?
   
   A: No. The entire application runs in your browser. When you "upload" a zip file, the file
   is entirely processed within the browser. No data is sent to DocuSign or anywhere outside of
   your browser. 

   When you open the eSign logger HTML file, JavaScript libraries are *downloaded* into your 
   web browser. Data is not uploaded to any place on the Internet.

1. Q: How do I get an API log zip file?

   A: Download the API log from your developer (demo) or production DocuSign account. 
   See this 
   [support article](https://support.docusign.com/s/document-item?language=en_US&rsc_301&bundleId=jux1643235969954&topicId=poz1578456669909.html&_LANG=enus) 
   for more information.

1. Q: Please describe the table.

    A: The table shows the log entries from the zip file. One row per log entry. 
    (Each file in the zip file is one log entry.) Column definitions:

    * **Action** The **V** button opens a view to the complete information for the log entry. 
      The view includes the request and response headers and API bodies.

      The **C** button creates a plain text version of the log entry and copies it to the 
      system clip board. You can then *paste* the log entry into a text editor or email.

      The **C** buttons can be customized to produce different output. See the **Settings** FAQ, below.

    * **Timestamp** is the date and time (UTC) the API call was processed.

    * **Status** ✅ -- a successful API call. ❌ -- the API call failed.
    ⚠️ -- a 300 level status was returned.

    * **Status Code** The HTTP status code for the API call.

    * **Operation** The HTTP operation (GET, POST, PUT, DELETE) for the API call.

    * **API Name** The name of the API method. In some cases, a system-level API method
    name is shown. 
    Please file an [issue](https://github.com/docusign/docusign.github.io/issues/new) 
    when this occurs. Please include the 
    system-level API name that was displayed, the HTTP operation (GET, POST, etc),
    and the URL (omit IDs from the URL).

    * **URL** The URL that the application called. The port number may reflect an internal
    server, rather than the port that the application used. When the server name
    starts with demo.app or app, the client was usually the DocuSign web app.

1. Q: Can I sort the table by a column?

   A: Yes! Click on the small up/down arrows next to the column name. By default, the 
      table is sorted by the log entries' timestamps, in descending order 
      (most recent log entry is listed first).

1. Q: What are the Settings options?

   A: Use the **Setting** (top navigation, right corner) to set the application's settings.
   The settings enables you to redefine the **S** buttons on the grid, and to add a new
   button to the log entry view pages. Note: this feature is mostly of use to DocuSign 
   support staff.

    * **Custom or Default S button action** choice. Select **Custom** to enable the button
    redefinition.
   
    * **Custom button letter** -- What letter should be used for the grid buttons. 

    * **Custom button label** -- The label for the new button on the log entry view pages.

    * **Custom action template** -- Add your template text to the textarea. You can include the 
    substitution strings ***{TraceToken}*** and ***{Timestamp}*** one or more times in the
    template body.

1. Q: How is it possible to "upload" a ***zip*** file to a browser page, decode, and display its 
   multiple files?
   
   A: Modern web browsers (and some clever JavaScript) enable this. You can examine the source
   (see FAQ #1) to see how it's done.

`;
