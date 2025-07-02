# Google Photos Picker API Setup Instructions

To connect to Google Photos using the new **Picker API**, you will need to create an API key for the plugin to use.

**The Picker API allows users to safely and securely pick their Google Photos content to use in your application.** As per [Google's official documentation](https://developers.google.com/photos), this gives users full control over which photos and videos they want to share.

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Visit [https://console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate)

2. Create a new project and give it any name you like. "Obsidian Google Photos Picker" is a good choice.

3. Click **Create**. Once the new project has been created, ensure that it is selected in the top menubar.

### 2. Enable the Google Photos Library API

⚠️ **Important**: Even though we're using the Picker API, you still need to enable the Photos Library API as the Picker API depends on it.

1. Go to [Google Cloud Console APIs Library](https://console.cloud.google.com/apis/library)
2. Search for "Google Photos Library API" 
3. Click on it and then click **Enable**
4. ✅ Wait for "API enabled" confirmation

### 3. Configure OAuth Consent Screen

The Picker API requires OAuth consent screen configuration:

1. Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Choose **External** user type and click **Create**
3. Fill in these required fields:
   - **App name**: "Obsidian Google Photos Picker" 
   - **User support email**: Your Gmail address
   - **Developer contact information**: Your Gmail address
4. Click **Save and continue**
5. **Scopes page**: Click **Save and continue** (the plugin will request the correct Picker API scope automatically)
6. **Test users page**: Click "Add users" and add your Gmail address, then **Save and continue**

### 4. Create OAuth Client ID for Picker API

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials** → **OAuth client ID**
3. Fill in these fields:
   - **Application type**: Web application
   - **Name**: "Obsidian Google Photos Picker"
   - **Authorized redirect URIs**: `http://localhost:51894/google-photos`

⚠️ **Critical**: The redirect URI must be exactly `http://localhost:51894/google-photos` for the plugin to work.

4. Click **Create**

### 5. Get Your Picker API Credentials

1. After creating the OAuth client, copy both:
   - **Client ID** (format: `123456789-abc...googleusercontent.com`)
   - **Client Secret** (format: `GOCSPX-abc...`)
2. Store these safely - you'll need them for the plugin configuration

### 6. Configure the Obsidian Plugin

1. Open Obsidian → **Settings** → **Google Photos**
2. You should see the new Picker API migration notices
3. Paste your **Client ID** and **Client Secret** into the respective fields
4. Click **Open Photos API auth** to start the authentication flow

### 7. Complete Picker API Authentication

The authentication flow will:
1. Open a browser window with Google's OAuth flow
2. Request the `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` scope
3. Allow you to grant permission for the picker functionality

**If you see "app isn't verified" warning:**
- This is normal for personal/development apps
- Click **Advanced** → **Go to [App Name] (unsafe)**
- This warning appears because the app isn't published to Google's app store

## How the Picker API Works

Based on [Google's Picker API documentation](https://developers.google.com/photos):

1. **User Control**: Users have full control over which photos they share
2. **Secure Selection**: Photos are selected through Google's official picker interface  
3. **Session-Based**: Each photo selection creates a temporary session
4. **Privacy-First**: No access to your entire library - only selected items

## Picker API Workflow in the Plugin

1. **Command**: Run "Insert Google Photo" in Obsidian
2. **Session**: Plugin creates a picker session via the Picker API
3. **Selection**: Google Photos picker opens for you to select photos
4. **Return**: Selected photos appear in Obsidian for insertion
5. **Cleanup**: Session is automatically cleaned up

## OAuth Scope Details

The plugin uses: `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`

This scope provides:
- ✅ Access to photos you manually select through the picker
- ✅ Read-only access to selected media items
- ❌ No access to your entire photo library
- ❌ No ability to modify or upload photos

## Troubleshooting Picker API Issues

### Authentication Problems
- Ensure you've added yourself as a test user in OAuth consent screen
- Verify redirect URI is exactly: `http://localhost:51894/google-photos`
- Clear browser cookies and try authentication again

### Picker Not Opening
- Check that Google Photos Library API is enabled in your project
- Verify your Client ID and Secret are correct
- Check browser console for any CORS or network errors

### "Connection Refused" Error
If localhost connection fails:
1. Copy the error page URL
2. Replace `http://localhost:51894/` with `obsidian://`
3. Navigate to the modified URL to complete authentication

## Testing the Picker API

Once configured:
1. ✅ "Insert Google Photo" command should open the picker modal
2. ✅ "Open Google Photos Picker" button should launch Google Photos
3. ✅ After selecting photos, they should appear in Obsidian
4. ✅ Clicking a photo should insert it into your note

## References

- [Google Photos APIs Overview](https://developers.google.com/photos)
- [Picker API Documentation](https://developers.google.com/photos/picker)
- [OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2)

The Picker API setup ensures compliance with Google's current security requirements while maintaining a user-friendly photo selection experience! 