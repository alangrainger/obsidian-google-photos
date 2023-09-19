# Important note for users prior to v1.6.0

The authentication method for this plugin was updated to make it more reliable, and to allow users with mobile devices to connect to Google Photos.

Because of this change you will need to update the **Redirect URI** that you have set up for the Photos API.

1. Go to [Google API Console](https://console.cloud.google.com/apis/credentials) and select the project you created when you set up the plugin.
2. Change the **Redirect URI** to be the new one specified in [Step 4 of the plugin documentation](https://github.com/alangrainger/obsidian-google-photos/blob/main/docs/Setup.md).
3. Allow 10 minutes for Google to make the change, and everything should work fine.
