### Template files (without the .json suffix) for use with eSign REST API code examples

## Before uploading
Check the file for any account IDs and user information. 

* Change any account or user ID GUIDs to `00000000-0000-0000-0000-000000000000`
* Other GUIDs in the template file are okay.
* Change any user names to generic names
* Change any email addresses to `@example.com` addresses
* Only use the default branding
* For recipient objects, remove the `recipientSignatureProviders` attribute if it just references the eSign pen `universalsignaturepen_imageonly`. Reason: including this attribute prevents the template from being used with accounts that do not include SBS.
