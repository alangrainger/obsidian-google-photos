# Google Photos for Obsidian

![](https://img.shields.io/github/license/alangrainger/obsidian-google-photos) ![](https://img.shields.io/github/v/release/alangrainger/obsidian-google-photos?style=flat-square) ![](https://img.shields.io/github/downloads/alangrainger/obsidian-google-photos/total)

<a href="https://ko-fi.com/alan_" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy me a coffee" style="width:190px"></a>

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
- Clicking on the photos doesn’t do anything. I’d be interested to hear feedback on what it _should_ do, in an ideal world. Please [join the conversation here](https://github.com/alangrainger/obsidian-google-photos/issues/5).

## Codeblocks

You can use codeblocks to insert galleries of photos:

### Photos from the periodic note date

This is especially useful to put in your daily note template, and it will show the photos just from that daily note date. You can configure the settings to fetch the date from the note title or a frontmatter property.

````
```photos
notedate
```
````

### Photos from today

This will show photos from today - the current live date.

````
```photos
today
```
````

### Advanced codeblock usage

You can also input your own complex queries using the Photos API search format:

https://developers.google.com/photos/library/reference/rest/v1/mediaItems/search

For example, if you wanted to show photos of food taken on every April 1st, you would use:

````
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
````

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
