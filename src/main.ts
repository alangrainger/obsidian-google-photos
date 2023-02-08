import { MarkdownView, Plugin, Editor } from 'obsidian'
import { GridView } from './renderer'
import PhotosApi from './photosApi'
import OAuth from './oauth'
import { GooglePhotosSettingTab, GooglePhotosSettings, DEFAULT_SETTINGS } from './settings'
import { DailyPhotosModal } from './photoModal'

export default class GooglePhotos extends Plugin {
  settings: GooglePhotosSettings
  photosApi: PhotosApi
  oauth: OAuth

  async onload () {
    await this.loadSettings()

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
          new DailyPhotosModal(this.app, this, editor, view).open()
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
