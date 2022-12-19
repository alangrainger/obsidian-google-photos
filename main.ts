import { App, MarkdownView, Modal, Plugin, PluginSettingTab, Setting, moment, Editor } from 'obsidian'
import Renderer, { GridView } from './renderer'
import PhotosApi from './photosApi'
import OAuth from './oauth'

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
  defaultToDailyPhotos: true
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

    /*this.registerMarkdownCodeBlockProcessor('photos', (source, el) => {
      return this.renderer.gridView(el, this.parseCodeblock(source))
    })*/

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

  parseCodeblock (source: string) {
    let filters = {
      dateFilter: {}
    }
    const userOptions = JSON.parse(source)
    if (userOptions.rawQuery) {
      filters = userOptions.rawQuery
    } else if (userOptions.showToday) {
      const date = new Date()
      filters.dateFilter = {
        dates: [{
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate()
        }]
      }
    }
    return {
      filters: filters
    }
  }

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
    new Setting(containerEl).setName('Photos API').setHeading()
    new Setting(containerEl)
      .setName('Client ID')
      .setDesc('')
      .addText(text => text
        .setPlaceholder('Enter your Client ID')
        .setValue(this.plugin.settings.clientId)
        .onChange(async (value) => {
          this.plugin.settings.clientId = value.trim()
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl)
      .setName('Client Secret')
      .setDesc('')
      .addText(text => text
        .setPlaceholder('Enter your Client Secret')
        .setValue(this.plugin.settings.clientSecret)
        .onChange(async (value) => {
          this.plugin.settings.clientSecret = value.trim()
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl).addButton(btn => btn
      .setButtonText('Open Photos API auth')
      .setCta()
      .onClick(async () => {
        await this.plugin.oauth.authenticate()
      }))
    new Setting(containerEl).setName('Settings').setHeading()
    new Setting(containerEl)
      .setName('Thumbnail width')
      .setDesc('')
      .addText(text => text
        .setValue(this.plugin.settings.thumbnailWidth.toString())
        .onChange(async (value) => {
          this.plugin.settings.thumbnailWidth = +value
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl)
      .setName('Thumbnail height')
      .setDesc('')
      .addText(text => text
        .setValue(this.plugin.settings.thumbnailHeight.toString())
        .onChange(async (value) => {
          this.plugin.settings.thumbnailHeight = +value
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl)
      .setName('Image filename format')
      .setDesc('This is the filename format used for saving thumbnail images. It must be in MomentJS format.')
      .addText(text => text
        .setValue(this.plugin.settings.filename)
        .onChange(async (value) => {
          this.plugin.settings.filename = value.trim()
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl)
      .setName('Default to showing photos from note date')
      .setDesc('If the plugin detects you are on a daily note, it can default to show you only photos from that date.')
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
      .setDesc('This is the MomentJS date format used in your daily notes, so we can parse them back to a date.')
      .addText(text => text
        .setValue(this.plugin.settings.parseNoteTitle)
        .onChange(async (value) => {
          this.plugin.settings.parseNoteTitle = value.trim()
          await this.plugin.saveSettings()
        }))
  }
}

export class PhotosModal extends Modal {
  plugin: GooglePhotos
  gridView: GridView
  editor: Editor
  view: MarkdownView

  constructor (app: App, plugin: GooglePhotos, editor: Editor, view: MarkdownView) {
    super(app)
    this.plugin = plugin
    this.editor = editor
    this.view = view
  }

  async onOpen () {
    const {contentEl, modalEl} = this
    this.gridView = new GridView({
      contentEl,
      scrollEl: modalEl,
      plugin: this.plugin,
      editor: this.editor,
      modal: this
    })
    await this.gridView.init()
  }

  onClose () {
    const {contentEl} = this
    this.gridView.destroy()
  }
}
