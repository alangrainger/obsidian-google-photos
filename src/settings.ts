import { App, moment, PluginSettingTab, Setting } from 'obsidian'
import { FolderSuggest } from './suggesters/FolderSuggester'
import GooglePhotos from './main'

export interface GooglePhotosSettings {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  expires: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  filename: string;
  parseNoteTitle: string;
  defaultToDailyPhotos: boolean;
  locationOption: string;
  locationFolder: string;
  locationSubfolder: string;
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
  parseNoteTitle: 'YYYY-MM-DD',
  defaultToDailyPhotos: true,
  locationOption: 'note',
  locationFolder: '',
  locationSubfolder: 'photos'
}

export class GooglePhotosSettingTab extends PluginSettingTab {
  plugin: GooglePhotos

  constructor (app: App, plugin: GooglePhotos) {
    super(app, plugin)
    this.plugin = plugin
  }

  display (): void {
    const {containerEl} = this

    containerEl.empty()
    containerEl.createEl('h2', {text: 'Google Photos Settings'})

    new Setting(containerEl)
      .setName('Photos API')
      .setHeading()

    /**
     * Show or hide a setting item
     * @param {Setting} setting
     * @param {boolean} visible
     */
    const setVisible = (setting: Setting, visible: Boolean) => {
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
        .onChange(async (value) => {
          this.plugin.settings.clientId = value.trim()
          await this.plugin.saveSettings()
        }))
      .then(setting => {
        setting.descEl.appendText('Client ID from Google Photos API.')
        setting.descEl.createEl('br')
        setting.descEl.createEl('a', {
          text: 'See the documentation',
          href: 'https://github.com/alangrainger/obsidian-google-photos',
        })
        setting.descEl.appendText(' for instructions on how to get this ID.')
      })
    new Setting(containerEl)
      .setName('Client Secret')
      .addText(text => text
        .setPlaceholder('Enter your Client Secret')
        .setValue(this.plugin.settings.clientSecret)
        .onChange(async (value) => {
          this.plugin.settings.clientSecret = value.trim()
          await this.plugin.saveSettings()
        }))
      .then(setting => {
        setting.descEl.appendText('Secret from Google Photos API.')
        setting.descEl.createEl('br')
        setting.descEl.createEl('a', {
          text: 'See the documentation',
          href: 'https://github.com/alangrainger/obsidian-google-photos',
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
        .onChange(async (value) => {
          this.plugin.settings.thumbnailWidth = +value
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl)
      .setName('Thumbnail height')
      .setDesc('Maximum height of the locally-saved thumbnail image in pixels')
      .addText(text => text
        .setPlaceholder(DEFAULT_SETTINGS.thumbnailHeight.toString())
        .setValue(this.plugin.settings.thumbnailHeight.toString())
        .onChange(async (value) => {
          this.plugin.settings.thumbnailHeight = +value
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl)
      .setName('Image filename format')
      .addText(text => text
        .setPlaceholder(DEFAULT_SETTINGS.filename)
        .setValue(this.plugin.settings.filename)
        .onChange(async (value) => {
          this.plugin.settings.filename = value.trim()
          await this.plugin.saveSettings()
        }))
      .then(setting => {
        setting.descEl.appendText('This is the filename format used for saving thumbnail images. It must be in ')
        setting.descEl.createEl('a', {
          text: 'MomentJS format',
          href: 'https://momentjs.com/docs/#/displaying/format/',
        })
        setting.descEl.appendText('.')
        setting.descEl.createEl('br')
        setting.descEl.createEl('br')
        setting.descEl.appendText('The default value is')
        setting.descEl.createEl('br')
        setting.descEl.createEl('span', {cls: 'markdown-rendered'})
          .createEl('code', {text: 'YYYY-MM-DD[_google-photo_]HHmmss[.jpg]'})
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
          .onChange(async (value) => {
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
          .onChange(async (value) => {
            // Strip leading/trailing slashes
            this.plugin.settings.locationSubfolder = value.trim().replace(/^[\\\/]+/, '').replace(/[\\\/]+$/, '')
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
          .onChange(async (value) => {
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

    /*
     Other settings
     */

    new Setting(containerEl)
      .setName('Other  settings')
      .setHeading()
    new Setting(containerEl)
      .setName('Default to showing photos from note date')
      .setDesc('If the plugin detects you are on a daily note, it can default to show you photos from that date.')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.defaultToDailyPhotos)
          .onChange(async (value) => {
            this.plugin.settings.defaultToDailyPhotos = value
            await this.plugin.saveSettings()
          })
      })
    new Setting(containerEl)
      .setName('Daily note date format')
      .addText(text => text
        .setPlaceholder(DEFAULT_SETTINGS.parseNoteTitle)
        .setValue(this.plugin.settings.parseNoteTitle)
        .onChange(async (value) => {
          this.plugin.settings.parseNoteTitle = value.trim()
          await this.plugin.saveSettings()
        }))
      .then(setting => {
        setting.descEl.appendText('This is the ')
        setting.descEl.createEl('a', {
          text: 'MomentJS date format',
          href: 'https://momentjs.com/docs/#/displaying/format/',
        })
        setting.descEl.appendText(' used in the title of your daily notes, so we can parse them back to a date.')
      })
  }
}
