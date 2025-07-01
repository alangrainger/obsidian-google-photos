# 🚨 WARNING 🚨 <br>This plugin is non-functional until it can be updated to work with Google's new photo API. [See this issue for more details](https://github.com/alangrainger/obsidian-google-photos/issues/56).

# Google Photos for Obsidian

## 🚨 Important Update - Google Photos API Changes

**Google has deprecated the Library API and moved to a new Picker API. This plugin has been updated to work with the new API, but with significant limitations:**

### What Changed (March 2025)
- **Date filtering removed**: Can no longer filter photos by date (daily photos, note date, etc.)
- **Album browsing removed**: Cannot browse or display album contents automatically  
- **Codeblock queries disabled**: Photo search queries in codeblocks no longer work
- **Manual selection required**: Users must manually pick photos through Google Photos interface

### What Still Works
- ✅ Basic photo insertion into notes
- ✅ Local thumbnail saving 
- ✅ Image linking and metadata

### Migration Required
- **Re-authentication needed**: You'll need to re-authenticate due to scope changes
- **Workflow changes**: Replace automatic date-based queries with manual photo selection
- **Codeblock updates**: Remove or replace ````photos` codeblocks - they will show picker buttons instead

---

A plugin to embed photos from Google Photos into your [Obsidian](https://obsidian.md/) notes.

## Features

- ~~Query photos based on date (e.g., "today's photos") - DEPRECATED~~
- ~~View albums and their photos - DEPRECATED~~  
- ~~Generate galleries using codeblocks - DEPRECATED~~
- ✅ Insert individual photos using the Google Photos picker
- ✅ Automatically download and save thumbnails locally
- ✅ Link back to the original photos in Google Photos
- ✅ Customizable image templates and filenames

## How it works

This plugin uses the new Google Photos Picker API. When you want to insert photos:

1. Run the "Insert Google Photo" command
2. A picker session is created and opens Google Photos in a new window/tab  
3. You manually select photos in the Google Photos interface
4. Return to Obsidian and the selected photos will be displayed
5. Click on a photo to insert it into your note

The plugin downloads thumbnails locally and creates markdown links with customizable templates.

## Installation and Setup

### Option 1: Community Plugins (Recommended)

Search for "Google Photos" in the Community Plugins section of Obsidian.

### Option 2: Manual Installation

1. Download the latest release from the [Releases](https://github.com/alangrainger/obsidian-google-photos/releases) page
2. Extract the plugin files to your Obsidian plugins folder: `VaultFolder/.obsidian/plugins/obsidian-google-photos/`
3. Reload Obsidian and enable the plugin

### Google API Setup

⚠️ **You must set up a Google API key** - see the [Setup Guide](docs/Setup.md) for detailed instructions.

## Usage

### Basic Photo Insertion

1. Use the command palette: `Insert Google Photo`
2. Click "Open Google Photos Picker" when the modal appears
3. Select photos in the Google Photos interface that opens
4. Return to Obsidian and click on photos to insert them

### ~~Previous Features (No Longer Available)~~

The following features were removed due to Google API changes:

- ~~Daily photos based on note date~~
- ~~Date range filtering~~ 
- ~~Album browsing and insertion~~
- ~~Codeblock photo galleries~~
- ~~Automatic "today's photos" queries~~

## Settings

### Photos API
- **Client ID** and **Client Secret**: From your Google Cloud Console setup
- **Authentication**: Re-authentication required due to API changes

### Thumbnail Settings  
- **Thumbnail width/height**: Maximum dimensions for locally saved thumbnails
- **Filename pattern**: Template for downloaded image filenames
- **Thumbnail markdown**: Template for the markdown inserted into notes

### File Location
- Choose where to save thumbnails (note folder, specified folder, or subfolder)

## Troubleshooting

### Authentication Issues
- You'll need to re-authenticate due to the API scope changes
- Follow the [Setup Guide](docs/Setup.md) if you encounter OAuth errors
- Check [Authentication Troubleshooting](docs/Authentication%20troubleshooting.md) for common issues

### API Limitations  
- If you see deprecation warnings, this is expected - the old API features are no longer available
- Replace codeblock queries with manual photo picker usage
- Date-based photo selection is not possible with the new API

## Migration from Previous Versions

If you were using this plugin before the API changes:

1. **Re-authenticate**: Clear your authentication and set up again
2. **Update workflows**: Replace date-based photo queries with manual selection
3. **Update codeblocks**: Remove ````photos` codeblocks or replace with picker buttons
4. **Expect limitations**: Date filtering and album browsing are permanently removed

## Changelog

### v2.0.0 (2025) - Google Picker API Migration
- 🚨 **BREAKING**: Migrated to Google Photos Picker API  
- ❌ **REMOVED**: Date filtering, album browsing, codeblock queries
- ✅ **ADDED**: New picker-based photo selection interface
- ⚠️ **REQUIRED**: Re-authentication with new OAuth scope

---

*This plugin is not affiliated with Google. Google Photos is a trademark of Google LLC.*

![](https://img.shields.io/github/license/alangrainger/obsidian-google-photos) ![](https://img.shields.io/github/v/release/alangrainger/obsidian-google-photos?style=flat-square) ![](https://img.shields.io/github/downloads/alangrainger/obsidian-google-photos/total)

## 📢 Maintenance mode - looking for new maintainer

I am now using [Immich](https://immich.app/) instead of Google Photos, which I strongly recommend to everyone. It's only a matter of time before Google sunsets their photos app, and/or removes your access. Just check out [all the other projects they have killed](https://killedbygoogle.com/).

Due to this, this plugin is now in maintenance mode. If you are interested in taking over this project please let me know.

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
