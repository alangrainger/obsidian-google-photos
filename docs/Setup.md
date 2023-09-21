# Setup instructions

To connect to Google Photos from a third-party plugin, you will need to create an API key for the plugin to use.

**The plugin will only request read-only access. It is not able to modify your photos or albums.**

1. Visit [https://console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate)

2. Create a new project and give it any name you like. "Obsidian Google Photos" is a good choice.

<img src="images/create-project.png" width="400">

3. Click Create. Once the new project has been created, ensure that it is selected in the top menubar:

<img src="images/top-menu.png" width="400">

4. Click on the hamburger menu, then **APIs and servers**, then **Enabled APIs and services**:

<img src="images/api-services.png" width="400">

5. Search for "photos", then choose the Photos API, and then **Enable**:

<img src="images/photos-api.png" width="500">

<img src="images/enable-photos.png" width="400">

6. Click on **Credentials** > **Create credentials** > **OAuth client ID**:

<img src="images/credentials.png" width="560">

7. Consent screen 1 + 2

<img src="images/consent1.png" width="560">

<img src="images/consent2.png" width="560">

8. On the **Scopes** page, just click **Save and continue**.

9. On the **Test users** page, add yourself as a test user and click **Save and continue**. 

10. Click back into the client ID

<img src="images/click-back.png" width="400">

Copy the client ID and secret

<img src="images/client-id-secret.png" width="400">



4. Fill in these settings for the OAuth configuration screen:

Redirect URI: `https://localhost/google-photos`

![x200](../img/setup-oauth.png)

5. Click **Create**.

6. Copy the `Client ID` and `Client Secret`. You will need to add these values into the Obsidian plugin settings:

![](../img/setup-client-conf.png)
