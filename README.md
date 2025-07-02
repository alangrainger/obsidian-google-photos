# Google Photos for Obsidian

## ✅ Working with Google Photos Picker API

This plugin has been successfully updated to work with Google's new Picker API after the Library API deprecation in March 2025.

## 📢 Maintenance mode - looking for new maintainer

I am now using [Immich](https://immich.app/) instead of Google Photos, which I strongly recommend to everyone. It's only a matter of time before Google sunsets their photos app, and/or removes your access. Just check out [all the other projects they have killed](https://killedbygoogle.com/).

Due to this, this plugin is now in maintenance mode. If you are interested in taking over this project please let me know.

---

A plugin to embed photos from Google Photos into your [Obsidian](https://obsidian.md/) notes using the Google Photos Picker.

## Features

- ✅ **Insert individual photos** using the Google Photos picker
- ✅ **Automatically download and save thumbnails** locally  
- ✅ **Link back to original photos** in Google Photos
- ✅ **Customizable image templates** and filenames
- ✅ **Flexible file organization** with configurable save locations

## Important Changes Due to Google's API Updates

**What's New:**
- Uses Google's official Picker API for photo selection
- Manual photo selection through Google Photos interface
- Secure, user-controlled photo access

**What's No Longer Available:**
- ~~Date filtering (daily photos, note date queries)~~ - **Removed**
- ~~Album browsing~~ - **Removed**  
- ~~Automatic photo queries~~ - **Removed**
- ~~Codeblock galleries~~ - **Removed**

## How it works

This plugin uses the Google Photos Picker API. When you want to insert photos:

1. Run the "Insert Google Photo" command in Obsidian
2. Click "Open Google Photos Picker" 
3. Select your photos in the Google Photos interface
4. Selected photos appear in Obsidian - click to insert them
5. Plugin automatically downloads thumbnails and creates markdown links

## Setup

Follow the **[Picker API Setup Guide](docs/Setup-PickerAPI.md)** for detailed instructions on:
- Creating a Google Cloud project
- Enabling the Photos Library API
- Configuring OAuth credentials
- Setting up the plugin

## Usage

### Insert Photos

1. Place your cursor where you want to insert a photo
2. Open command palette (`Cmd/Ctrl + P`)
3. Run **"Insert Google Photo"** 
4. Click **"Open Google Photos Picker"**
5. Select photos in Google Photos
6. Click on any photo in the selection grid to insert it

### Customize Markdown Output

In Settings, you can customize the markdown template using these variables:

```markdown
[![]({{local_thumbnail_link}})]({{google_photo_url}}) 
```

Available variables:
- `{{local_thumbnail_link}}` - Path to locally saved thumbnail
- `{{google_photo_url}}` - URL to original Google Photo  
- `{{google_photo_desc}}` - Photo description/caption
- `{{taken_date}}` - Date photo was taken
- `{{google_base_url}}` - Advanced: Direct image URL
- `{{google_photo_id}}` - Advanced: Google's photo ID

### File Organization

Configure where thumbnails are saved:
- **Same folder as note** - Keeps photos with your notes
- **Subfolder** - Organizes photos in a dedicated subfolder  
- **Specific folder** - Centralized photo storage location

## Migration from Previous Version

If you used this plugin before the API migration:

1. **Re-authenticate** - You'll need to set up new API credentials
2. **Replace codeblocks** - Remove old `````photos` codeblocks 
3. **Update workflow** - Use manual picker instead of automatic queries

Legacy codeblocks will show helpful migration messages.

## Troubleshooting

### Authentication Issues
- Ensure you've added yourself as a test user in OAuth consent screen
- Verify redirect URI is exactly: `http://localhost:51894/google-photos`
- Clear browser cookies and try authentication again

### Picker Not Opening  
- Check that Google Photos Library API is enabled in your project
- Verify your Client ID and Secret are correct
- Check browser console for CORS or network errors

### "Connection Refused" Error
If localhost connection fails:
1. Copy the error page URL
2. Replace `http://localhost:51894/` with `obsidian://`
3. Navigate to the modified URL to complete authentication

## Development

```bash
npm install
npm run build
```

## License

GPL-3.0 license

---

**Note:** This plugin works with Google's current Picker API and should remain functional as long as Google maintains this API. The previous Library API limitations were imposed by Google's business decisions, not technical constraints.

![](https://img.shields.io/github/license/alangrainger/obsidian-google-photos) ![](https://img.shields.io/github/v/release/alangrainger/obsidian-google-photos?style=flat-square) ![](https://img.shields.io/github/downloads/alangrainger/obsidian-google-photos/total)

---

[📝💬 Obsidian forum link for this plugin](https://forum.obsidian.md/t/51062)

This plugin let's you embed Google Photos images directly into Obsidian. When you select an image, it will save and embed a low-res thumbnail with a link back to the full-res image on Google Photos.

![](img/demo.gif)

If your note title has a detectable date, you can have the plugin default to showing you only photos from that date. There is a toggle at the top to show all photos instead.

## How to set up

Follow the [setup instructions here](docs/Setup.md).

## Using a mobile device

You can use Google Photos on a mobile device, but due to mobile limitations you will first need to connect to Google Photos from Obsidian using a desktop device.

Once your desktop is authenticated, you can sync the plugin settings to your mobile device and it will work without any issues. If you're using any sort of sync of your Obsidian vault, this should happen automatically. Specifically you need to transfer the `data.json` file from the desktop plugin folder to your mobile device.

If you're using Obsidian Sync, you'll need to make sure the **Installed community plugins** sync option is enabled on both your desktop and mobile device for the settings to be transferred correctly.

# Usage instructions

## Edit the inserted Markdown format

You can use template variables to change the way the photo is imported / inserted, in the **Inserted Markdown** setting..

The default format is as follows, which will add a thumbnail image which links back to the original Google Photo URL:

```markdown
[![]({{local_thumbnail_link}})]({{google_photo_url}}) 
```

If you want to bring across the description text field from your photos, you could add it as text following the photo like this:

```markdown
[![]({{local_thumbnail_link}})]({{google_photo_url}})

{{google_photo_desc}}
```

Alternatively if you use an [image captions plugin](https://obsidian.md/plugins?id=image-captions) you could use this format:

```markdown
[![{{google_photo_desc}}]({{local_thumbnail_link}})]({{google_photo_url}})
```

## Insert an album

1. Open the command palette, and choose **Google Photos: Insert album**.
2. Click on an album and it will be inserted into your note as a gallery.

If you want to style or hide the title, the CSS class is `.google-photos-album-title`

Points of note:

- It shows only your most recently used albums. This should be enough to get started, and I hope to update it in the future so it can fetch more of that list.
- Clicking on the photos doesn't do anything. I'd be interested to hear feedback on what it _should_ do, in an ideal world. Please [join the conversation here](https://github.com/alangrainger/obsidian-google-photos/issues/5).

## Codeblocks

You can use codeblocks to insert galleries of photos:

### Photos from the periodic note date

This is especially useful to put in your daily note template, and it will show the photos just from that daily note date. You can configure the settings to fetch the date from the note title or a frontmatter property.

```
```photos
notedate
```
```

### Photos from today

This will show photos from today - the current live date.

```
```photos
today
```
```

### Advanced codeblock usage

You can also input your own complex queries using the Photos API search format:

https://developers.google.com/photos/library/reference/rest/v1/mediaItems/search

For example, if you wanted to show photos of food taken on every April 1st, you would use:

```
```photos
{
  "query": {
    "filters": {
      "dateFilter": {
        "dates": [{
          "year": 0,
          "month": 4,
          "day": 1
        }]
      },
      "contentFilter": {
        "includedContentCategories": [
          "FOOD"
        ]
      }
    }
  }
}
```
```

## Adjusting the visual style

If you want to adjust the styles, these are the classes used:

`.google-photos-grid-thumbnail` - the thumbnail images
`.google-photos-codeblock` - the embedded codeblock container
`.google-photos-modal-grid` - the popup modal grid container
`.google-photos-album-title` - the title for an album codeblock

## FAQs

#### Do the images have to be saved locally? Can they be remote thumbnails?

The way that Photos API generates the URLs, the direct image links are only available for a short time and then they expire. So while you could add them to your notes, they would stop working at some point.

This means you can't have a remote thumbnail image, and you can't have a link to the thumbnail either.

## Attribution
Loading spinner from [loading.io](https://loading.io/)
