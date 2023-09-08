import { MarkdownView, Plugin, Editor } from 'obsidian'
import PhotosApi from './photosApi'
import OAuth from './oauth'
import { GooglePhotosSettingTab, GooglePhotosSettings, DEFAULT_SETTINGS } from './settings'
import { DailyPhotosModal } from './photoModal'
import { AlbumSuggest } from './suggesters/AlbumSuggest'
import { codeblockProcessor } from './codeblock'

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
      codeblockProcessor(this, source, el)
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

    this.addCommand({
      id: 'insert-album',
      name: 'Insert album',
      editorCallback: async (editor: Editor) => {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (markdownView) {
          new AlbumSuggest(this).show((album) => {
            const searchJson = JSON.stringify({
              title: album.title,
              query: {
                albumId: album.id
              }
            })
            const codeblock = '\n```photos\n' + searchJson + '\n```\n'
            editor.replaceRange(codeblock, editor.getCursor())
          })
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
