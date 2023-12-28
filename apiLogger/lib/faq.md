# F.A.Q.

1. Q: Is this application a DocuSign product?
   A: No, it is an open source example application. It is not a DocuSign product. It is not supported.
   please see the LICENSE file in the [source directory](https://github.com/docusign/docusign.github.io/tree/master/apiLogger) for more information.

2. Q: When I upload my API log zip file, is any data sent to DocuSign or to another server?
   A: No. The entire application runs in your browser. When you "upload" a zip file, the file
   is entirely processed within the browser. No data is sent to DocuSign or anywhere outside of
   your browser. 

   When you open the eSign logger HTML file, JavaScript libraries are *downloaded* into your 
   web browser. Data is not uploaded to any place on the Internet.

3. Q: How is it possible to "upload" a ***zip*** file to a browser page, decode, and display its 
   multiple files?
   A: Modern web browsers (and some clever JavaScript) enable this. You can examine the source
   (see FAQ #1) to see how it's done.
   
    