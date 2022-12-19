# How to set up

To connect to Google Photos from a third-party plugin, you will need to create an API key for the plugin to use.

1. Visit [https://developers.google.com/photos/library/guides/get-started](https://developers.google.com/photos/library/guides/get-started)


2. Click the button that looks like this:

![](img/setup-enable.png)

3. Create a new project and give it any name you like. 
Use the same name on the next screen which asks for the "product name":

![](img/setup-create-project.png)

4. Fill in these settings for the OAuth configuration screen:

Redirect URI: `https://localhost/google-photos`

![x200](img/setup-oauth.png)

5. Click **Create**.


6. Copy the `Client ID` and `Client Secret`. You will need to add these values into the Obsidian plugin settings:

![](img/setup-client-conf.png)
