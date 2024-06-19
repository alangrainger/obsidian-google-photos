import { App, moment, PluginSettingTab, Setting } from 'obsidian'
import { FolderSuggest } from './suggesters/FolderSuggester'
import GooglePhotos from './main'

export enum GetDateFromOptions {
  NOTE_TITLE = 'Note\'s title',
  FRONT_MATTER = 'Note\'s front matter',
  USE_TODAY = 'Use today\'s date',
}

export interface GooglePhotosSettings {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  expires: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  filename: string;
  thumbnailMarkdown: string;
  defaultToDailyPhotos: boolean;
  locationOption: string;
  locationFolder: string;
  locationSubfolder: string;
  convertPastedLink: boolean; // Monitor paste events to see if it's a Google Photo link
  // Date selection options
  getDateFrom: GetDateFromOptions;
  getDateFromFrontMatterKey: string;
  getDateFromFormat: string;
  showPhotosInDateRange: boolean;
  showPhotosXDaysPast: number;
  showPhotosXDaysFuture: number;
}

export const DEFAULT_SETTINGS: GooglePhotosSettings = {
  clientId: '',
  clientSecret: '',
  accessToken: '',
  refreshToken: '',
  expires: moment().format(),
  thumbnailWidth: 400,
  thumbnailHeight: 280,
  filename: 'YYYY-MM-DD[_google-photo_]HHmmss[.jpg]',
  thumbnailMarkdown: '[![]({{local_thumbnail_link}})]({{google_photo_url}}) ',
  defaultToDailyPhotos: true,
  locationOption: 'note',
  locationFolder: '',
  locationSubfolder: 'photos',
  convertPastedLink: true,
  getDateFrom: GetDateFromOptions.NOTE_TITLE,
  getDateFromFrontMatterKey: 'date',
  getDateFromFormat: 'YYYY-MM-DD',
  showPhotosInDateRange: false,
  showPhotosXDaysPast: 7,
  showPhotosXDaysFuture: 1
}

export class GooglePhotosSettingTab extends PluginSettingTab {
  plugin: GooglePhotos

  constructor (app: App, plugin: GooglePhotos) {
    super(app, plugin)
    this.plugin = plugin
  }

  display (): void {
    const { containerEl } = this

    containerEl.empty()

    new Setting(containerEl)
      .setName('Photos API')
      .setHeading()

    /**
     * Show or hide a setting item
     * @param {Setting} setting
     * @param {boolean} visible
     */
    const setVisible = (setting: Setting, visible: boolean) => {
      setting.settingEl.style.display = visible ? 'flex' : 'none'
    }

    /*
     Google Photos API connection
     */

    new Setting(containerEl)
      .setName('Client ID')
      .addText(text => text
        .setPlaceholder('Enter your Client ID')
        .setValue(this.plugin.settings.clientId)
        .onChange(async value => {
          this.plugin.settings.clientId = value.trim()
          await this.plugin.saveSettings()
        }))
      .then(setting => {
        setting.descEl.appendText('Client ID from Google Photos API.')
        setting.descEl.createEl('br')
        setting.descEl.createEl('a', {
          text: 'See the documentation',
          href: 'https://github.com/alangrainger/obsidian-google-photos'
        })
        setting.descEl.appendText(' for instructions on how to get this ID.')
      })
    new Setting(containerEl)
      .setName('Client Secret')
      .addText(text => text
        .setPlaceholder('Enter your Client Secret')
        .setValue(this.plugin.settings.clientSecret)
        .onChange(async value => {
          this.plugin.settings.clientSecret = value.trim()
          await this.plugin.saveSettings()
        }))
      .then(setting => {
        setting.descEl.appendText('Secret from Google Photos API.')
        setting.descEl.createEl('br')
        setting.descEl.createEl('a', {
          text: 'See the documentation',
          href: 'https://github.com/alangrainger/obsidian-google-photos'
        })
        setting.descEl.appendText(' for instructions on how to get this value.')
      })
    new Setting(containerEl)
      .setDesc('Google Photos will automatically authenticate you when you start using the plugin. You can also manually initiate the authentication process by clicking this button.')
      .addButton(btn => btn
        .setButtonText('Open Photos API auth')
        .setCta()
        .onClick(async () => {
          await this.plugin.oauth.authenticate()
        }))

    /*
     Thumbnail settings
     */

    new Setting(containerEl)
      .setName('Thumbnail settings')
      .setHeading()
      .setDesc('Set the maximum size for your locally-saved thumbnail image. The image will fit within these dimensions while keeping the original aspect ratio.')
    new Setting(containerEl)
      .setName('Thumbnail width')
      .setDesc('Maximum width of the locally-saved thumbnail image in pixels')
      .addText(text => text
        .setPlaceholder(DEFAULT_SETTINGS.thumbnailWidth.toString())
        .setValue(this.plugin.settings.thumbnailWidth.toString())
        .onChange(async value => {
          this.plugin.settings.thumbnailWidth = +value
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl)
      .setName('Thumbnail height')
      .setDesc('Maximum height of the locally-saved thumbnail image in pixels')
      .addText(text => text
        .setPlaceholder(DEFAULT_SETTINGS.thumbnailHeight.toString())
        .setValue(this.plugin.settings.thumbnailHeight.toString())
        .onChange(async value => {
          this.plugin.settings.thumbnailHeight = +value
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl)
      .setName('Image filename format')
      .addText(text => text
        .setPlaceholder(DEFAULT_SETTINGS.filename)
        .setValue(this.plugin.settings.filename)
        .onChange(async value => {
          this.plugin.settings.filename = value.trim()
          await this.plugin.saveSettings()
        }))
      .then(setting => {
        setting.descEl.appendText('This is the filename format used for saving thumbnail images. It must be in ')
        setting.descEl.createEl('a', {
          text: 'MomentJS format',
          href: 'https://momentjs.com/docs/#/displaying/format/'
        })
        setting.descEl.appendText('.')
        setting.descEl.createEl('br')
        setting.descEl.createEl('br')
        setting.descEl.appendText('The default value is')
        setting.descEl.createEl('br')
        setting.descEl.createEl('span', { cls: 'markdown-rendered' })
          .createEl('code', { text: 'YYYY-MM-DD[_google-photo_]HHmmss[.jpg]' })
        setting.descEl.createEl('br')
        setting.descEl.appendText('which will save thumbnails in a format like:')
        setting.descEl.createEl('br')
        setting.descEl.createEl('br')
        setting.descEl.appendText('2022-12-25_google-photo_182557.jpg')
        setting.descEl.createEl('br')
        setting.descEl.createEl('br')
        setting.descEl.appendText('The date used is the "photo taken" date from the photo\'s metadata rather than the current date/time. This is to ensure that when you\'re adding photos to old journal entries, they are dated correctly and stored in your filesystem correctly.')
      })
    const locationOptionEl = new Setting(this.containerEl)
    const locationFolderEl = new Setting(this.containerEl)
      .setName('Thumbnail image folder')
      .setDesc('Thumbnails will be saved to this folder')
      .addSearch(search => {
        new FolderSuggest(search.inputEl)
        search.setPlaceholder('Path/For/Thumbnails')
          .setValue(this.plugin.settings.locationFolder)
          .onChange(async value => {
            this.plugin.settings.locationFolder = value.trim()
            await this.plugin.saveSettings()
          })
      })
    const locationSubfolderEl = new Setting(this.containerEl)
      .setName('Subfolder name')
      .setDesc('If your current note is in "Journal/Daily" and you set the subfolder name to "photos", the thumbnails will be saved in "Journal/Daily/photos".')
      .addText(text => {
        text
          .setPlaceholder('photos')
          .setValue(this.plugin.settings.locationSubfolder)
          .onChange(async value => {
            // Strip leading/trailing slashes
            this.plugin.settings.locationSubfolder = value.trim().replace(/^[\\/]+/, '').replace(/[\\/]+$/, '')
            await this.plugin.saveSettings()
          })
      })
    locationOptionEl
      .setName('Location to save thumbnails')
      .setDesc('Where the local thumbnail images will be saved')
      .addDropdown(dropdown => {
        dropdown
          .addOption('note', 'Same folder as the note')
          .addOption('subfolder', 'In a subfolder of the current note')
          .addOption('specified', 'In a specific folder')
          .setValue(this.plugin.settings.locationOption)
          .onChange(async value => {
            // Show or hide the folder input field, depending on the choice
            setVisible(locationFolderEl, value === 'specified')
            setVisible(locationSubfolderEl, value === 'subfolder')
            this.plugin.settings.locationOption = value
            await this.plugin.saveSettings()
          })
      })
      .then(() => {
        // Set the default visibility for the folder input field
        setVisible(locationFolderEl, this.plugin.settings.locationOption === 'specified')
        setVisible(locationSubfolderEl, this.plugin.settings.locationOption === 'subfolder')
      })
    new Setting(containerEl)
      .setName('Inserted Markdown')
      .setDesc('This will be the text inserted when adding a thumbnail. You can use these variables:')
      .addTextArea(text => text
        .setPlaceholder(DEFAULT_SETTINGS.thumbnailMarkdown)
        .setValue(this.plugin.settings.thumbnailMarkdown)
        .onChange(async value => {
          this.plugin.settings.thumbnailMarkdown = value
          await this.plugin.saveSettings()
        }))
      .then(setting => {
        const ul = setting.descEl.createEl('ul')
        ul.createEl('li').setText('local_thumbnail_link - The path to the locally saved thumbnail image')
        ul.createEl('li').setText('google_photo_url - The URL to the original Google Photo')
        ul.createEl('li').setText('google_photo_desc - The description/caption from the Description text field')
        ul.createEl('li').setText('taken_date - The date the photo was taken')
        ul.createEl('li').setText('google_base_url - Advanced variable, see Photos API docs')
        ul.createEl('li').setText('google_photo_id - Advanced variable, see Photos API docs')
      })

    /*
     Other settings
     */

    new Setting(containerEl)
      .setName('Date settings')
      .setHeading()
    new Setting(containerEl)
      .setName('Default to limiting shown photos to date(s)')
      .setDesc('Choose to limit the photos shown in popup modal to a specific date(s) determined by the option below.')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.defaultToDailyPhotos)
          .onChange(async value => {
            this.plugin.settings.defaultToDailyPhotos = value
            await this.plugin.saveSettings()
            this.display()
          })
      })

    // Provide three options in a dropdown for how to parse the date to use for the photo search
    new Setting(containerEl)
      .setName('Determine date from')
      .addDropdown(dropdown =>
        dropdown
          .addOption(
            GetDateFromOptions.NOTE_TITLE,
            GetDateFromOptions.NOTE_TITLE
          )
          .addOption(
            GetDateFromOptions.FRONT_MATTER,
            GetDateFromOptions.FRONT_MATTER
          )
          .addOption(GetDateFromOptions.USE_TODAY, GetDateFromOptions.USE_TODAY)
          .setValue(this.plugin.settings.getDateFrom)
          .onChange(async (value: GetDateFromOptions) => {
            this.plugin.settings.getDateFrom = value
            await this.plugin.saveSettings()
            this.display()
          })
      )
      .then(setting => {
        setting.descEl.appendText(
          'The source of determining the date used to search for photos.'
        )
        setting.descEl.createEl('br')
        const ul = setting.descEl.createEl('ul')
        ul.createEl('li').setText(
          `${GetDateFromOptions.NOTE_TITLE} - The date will be parsed from the note's title, using the format below.`
        )
        ul.createEl('li').setText(
          `${GetDateFromOptions.FRONT_MATTER} - The date will be parsed from the note's front matter, using the property and format below.`
        )
        ul.createEl('li').setText(
          `${GetDateFromOptions.USE_TODAY} - Today's date will be used.`
        )
      })

    if (this.plugin.settings.getDateFrom === GetDateFromOptions.NOTE_TITLE) {
      new Setting(containerEl)
        .setName('Title date format')
        .addText(text =>
          text
            .setPlaceholder(DEFAULT_SETTINGS.getDateFromFormat)
            .setValue(this.plugin.settings.getDateFromFormat)
            .onChange(async value => {
              this.plugin.settings.getDateFromFormat = value.trim()
              await this.plugin.saveSettings()
            })
        )
        .then(setting => {
          setting.descEl.appendText('This is the ')
          setting.descEl.createEl('a', {
            text: 'MomentJS date format',
            href: 'https://momentjs.com/docs/#/displaying/format/'
          })
          setting.descEl.appendText(
            ' used in the title of your daily notes, so we can parse them back to a date.'
          )
        })
    } else if (
      this.plugin.settings.getDateFrom === GetDateFromOptions.FRONT_MATTER
    ) {
      new Setting(containerEl)
        .setName('Front matter key')
        .addText(text =>
          text
            .setPlaceholder(DEFAULT_SETTINGS.getDateFromFrontMatterKey)
            .setValue(this.plugin.settings.getDateFromFrontMatterKey)
            .onChange(async value => {
              this.plugin.settings.getDateFromFrontMatterKey = value.trim()
              await this.plugin.saveSettings()
            })
        )
        .then(setting => {
          setting.descEl.appendText(
            'This is the name of the front matter property that contains the date.'
          )
        })
      new Setting(containerEl)
        .setName('Front matter date format')
        .addText(text =>
          text
            .setPlaceholder(DEFAULT_SETTINGS.getDateFromFormat)
            .setValue(this.plugin.settings.getDateFromFormat)
            .onChange(async value => {
              this.plugin.settings.getDateFromFormat = value.trim()
              await this.plugin.saveSettings()
            })
        )
        .then(setting => {
          setting.descEl.appendText('This is the ')
          setting.descEl.createEl('a', {
            text: 'MomentJS date format',
            href: 'https://momentjs.com/docs/#/displaying/format/'
          })
          setting.descEl.appendText(
            ' used in the front matter property, so we can parse it back to a date.'
          )
        })
    }

    new Setting(containerEl)
      .setName('Show photos in range of days?')
      .setDesc('Enable to show photos from a range of days before and after the note date.')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.showPhotosInDateRange)
          .onChange(async value => {
            this.plugin.settings.showPhotosInDateRange = value
            await this.plugin.saveSettings()
            this.display()
          })
      })

    if (this.plugin.settings.showPhotosInDateRange) {
      new Setting(containerEl)
        .setName('Number of days in the past')
        .setDesc('Number of days in the past to show photos from.')
        .addText(text => {
          text
            .setPlaceholder(DEFAULT_SETTINGS.showPhotosXDaysPast.toString())
            .setValue(this.plugin.settings.showPhotosXDaysPast.toString())
            .onChange(async value => {
              if (isNaN(+value)) {
                return
              }
              this.plugin.settings.showPhotosXDaysPast = +value
              await this.plugin.saveSettings()
            })
          // Update display for above setting to update its description or to update validated value
          text.inputEl.onblur = () => {
            this.display()
          }
        })

      new Setting(containerEl)
        .setName('Number of days in the future')
        .setDesc('Number of days in the future to show photos from.')
        .addText(text => {
          text
            .setPlaceholder(DEFAULT_SETTINGS.showPhotosXDaysFuture.toString())
            .setValue(this.plugin.settings.showPhotosXDaysFuture.toString())
            .onChange(async value => {
              if (isNaN(+value)) {
                return
              }
              this.plugin.settings.showPhotosXDaysFuture = +value
              await this.plugin.saveSettings()
            })
          // Update display for above setting to update its description or to update validated value
          text.inputEl.onblur = () => {
            this.display()
          }
        })
    }
  }
}
