import { App, MarkdownView, Modal, Plugin, PluginSettingTab, Setting, moment, Editor, requestUrl, Platform } from 'obsidian'
import Renderer, { GridView } from './renderer'
import PhotosApi from './photosApi'
import OAuth from './oauth'
import { FolderSuggest } from './suggesters/FolderSuggester'

interface GooglePhotosSettings {
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
}

const DEFAULT_SETTINGS: GooglePhotosSettings = {
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
  locationFolder: ''
}

export default class GooglePhotos extends Plugin {
  settings: GooglePhotosSettings
  renderer: Renderer
  photosApi: PhotosApi
  oauth: OAuth

  async onload () {
    await this.loadSettings()

    this.renderer = new Renderer(this)
    this.photosApi = new PhotosApi(this)
    this.oauth = new OAuth(this)

    this.addSettingTab(new GooglePhotosSettingTab(this.app, this))

    this.registerMarkdownCodeBlockProcessor('photos', (source, el) => {
      const grid = new GridView({plugin: this})
      el.appendChild(grid.containerEl)
      grid.containerEl.addClass('google-photos-codeblock')
      try {
        if (source.trim()) grid.setSearchParams(JSON.parse(source))
      } catch (e) {
        // unable to parse source block
      }
      grid.getThumbnails()
    })

    this.addCommand({
      id: 'insert-google-photo',
      name: 'Insert Google Photo',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (markdownView) {
          new PhotosModal(this.app, this, editor, view).open()
        }
      }
    })
  }

  onunload () { }

  async loadSettings () {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings () {
    await this.saveData(this.settings)
  }
}

class GooglePhotosSettingTab extends PluginSettingTab {
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
      /*.addText(text => text
        .setPlaceholder('Path/For/Thumbnails')
        .setValue(this.plugin.settings.locationFolder)
        .onChange(async (value) => {
          this.plugin.settings.locationFolder = value.trim()
          await this.plugin.saveSettings()
        }))*/
      .addSearch((cb) => {
        new FolderSuggest(cb.inputEl)
        cb.setPlaceholder('Path/For/Thumbnails')
          .setValue(this.plugin.settings.locationFolder)
          .onChange(async (value) => {
            this.plugin.settings.locationFolder = value.trim()
            await this.plugin.saveSettings()
          })
      })
    locationOptionEl
      .setName('Location to save thumbnails')
      .setDesc('Where the local thumbnail images will be saved')
      .addDropdown(dropdown => {
        dropdown
          .addOption('note', 'Same folder as the note')
          .addOption('specified', 'In the folder specified below')
          .setValue(this.plugin.settings.locationOption)
          .onChange(async (value) => {
            // Show or hide the folder input field, depending on the choice
            setVisible(locationFolderEl, value === 'specified')
            this.plugin.settings.locationOption = value
            await this.plugin.saveSettings()
          })
      })
      .then(() => {
        // Set the default visibility for the folder input field
        setVisible(locationFolderEl, this.plugin.settings.locationOption === 'specified')
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

export class PhotosModal extends Modal {
  plugin: GooglePhotos
  gridView: GridView
  editor: Editor
  view: MarkdownView
  noteDate: moment.Moment
  limitPhotosToNoteDate: boolean = true

  constructor (app: App, plugin: GooglePhotos, editor: Editor, view: MarkdownView) {
    super(app)
    this.plugin = plugin
    this.editor = editor
    this.view = view
  }

  /**
   * Save a local thumbnail and insert the thumbnail plus a link back to the original Google Photos location
   * @param event
   */
  async insertImageIntoEditor (event: { target: HTMLImageElement }) {
    this.plugin.renderer.showWaitingCursor(true)
    try {
      let {baseurl, producturl, filename} = event.target.dataset
      const src = baseurl + `=w${this.plugin.settings.thumbnailWidth}-h${this.plugin.settings.thumbnailHeight}`
      const noteFolder = this.view.file.path.split('/').slice(0, -1).join('/')
      // Use the note folder or the user-specified folder from Settings
      let thumbnailFolder = this.plugin.settings.locationOption === 'specified' ? this.plugin.settings.locationFolder : noteFolder
      thumbnailFolder = thumbnailFolder.replace(/^\//, '') // remove any leading slash
      // Remove the photo grid and just show the loading spinner while we wait for the thumbnail to download
      await this.gridView.resetGrid()
      // Fetch the thumbnail from Google Photos
      const imageData = await requestUrl({url: src})
      await this.view.app.vault.adapter.writeBinary(thumbnailFolder + '/' + filename, imageData.arrayBuffer)
      const cursorPosition = this.editor.getCursor()
      const linkText = `[![](${filename})](${producturl}) `
      this.editor.replaceRange(linkText, cursorPosition)
      // Move the cursor to the end of the thumbnail link after pasting
      this.editor.setCursor(cursorPosition.ch + linkText.length)
    } catch (e) {
      console.log(e)
    }
    this.close() // close the modal
    this.plugin.renderer.showWaitingCursor(false)
  }

  async onOpen () {
    const {contentEl, modalEl} = this
    if (Platform.isDesktop) {
      // Resize to fit the viewport width on desktop
      modalEl.addClass('google-photos-modal-grid')
    }
    this.gridView = new GridView({
      scrollEl: modalEl,
      plugin: this.plugin,
      onThumbnailClick: (event: { target: HTMLImageElement }) => this.insertImageIntoEditor(event)
    })

    // Check for a valid date from the note title
    this.noteDate = moment(this.view.file.basename, this.plugin.settings.parseNoteTitle, true)
    if (this.noteDate.isValid()) {
      // The currently open note has a parsable date
      const dailyNoteParams = {
        filters: {
          dateFilter: {
            dates: [{
              year: +this.noteDate.format('YYYY'),
              month: +this.noteDate.format('M'),
              day: +this.noteDate.format('D')
            }]
          }
        }
      }
      if (this.plugin.settings.defaultToDailyPhotos) {
        // Set the default view to show photos from today
        this.gridView.setSearchParams(dailyNoteParams)
      }

      // Create the checkbox to switch between today / all photos
      this.plugin.renderer.createCheckbox(contentEl, 'Limit photos to ' + this.noteDate.format('dddd, MMMM D'), checked => {
        if (checked) {
          this.gridView.setSearchParams(dailyNoteParams)
        } else {
          this.gridView.clearSearchParams()
        }
        this.limitPhotosToNoteDate = checked
        this.gridView.resetGrid()
        this.gridView.getThumbnails()
      })
    }

    // Attach the grid view to the modal
    contentEl.appendChild(this.gridView.containerEl)

    // Start fetching thumbnails!
    await this.gridView.getThumbnails()
  }

  onClose () {
    // const {contentEl} = this
    this.gridView.destroy()
  }
}
