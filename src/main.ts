import { MarkdownView, Plugin, Editor, moment, TFile } from 'obsidian'
import PhotosApi from './photosApi'
import OAuth from './oauth'
import { GooglePhotosSettingTab, GooglePhotosSettings, DEFAULT_SETTINGS, GetDateFromOptions } from './settings'
import { DailyPhotosModal } from './photoModal'
import AlbumSuggest from './suggesters/AlbumSuggest'
import CodeblockProcessor from './codeblockProcessor'

export default class GooglePhotos extends Plugin {
  settings: GooglePhotosSettings
  photosApi: PhotosApi
  oauth: OAuth

  async onload () {
    await this.loadSettings()

    this.photosApi = new PhotosApi(this)
    this.oauth = new OAuth(this)

    this.addSettingTab(new GooglePhotosSettingTab(this.app, this))

    // Codeblock handler
    this.registerMarkdownCodeBlockProcessor('photos', (source, el, context) => {
      const file = app.vault.getAbstractFileByPath(context.sourcePath)
      if (file instanceof TFile) {
        new CodeblockProcessor(this, source, el, file)
      }
    })

    this.registerObsidianProtocolHandler('google-photos', async data => {
      //
      // The data comes back twice from the handler, so make sure to only process it once
      await this.oauth.sendCode(data.code)
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
          new AlbumSuggest(this).show(album => {
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

  /**
   * Gets the date from the note title, front matter, or returns today based on user setting
   * @param file
   */
  getNoteDate (file: TFile): moment.Moment {
    if (this.settings.getDateFrom === GetDateFromOptions.NOTE_TITLE) {
      // Get date from note title
      return moment(file.basename, this.settings.getDateFromFormat, true)
    } else if (this.settings.getDateFrom === GetDateFromOptions.FRONT_MATTER) {
      // Get date from frontmatter / YAML
      const meta = this.app.metadataCache.getFileCache(file)
      const frontMatter = meta?.frontmatter
      if (frontMatter && frontMatter[this.settings.getDateFromFrontMatterKey]) {
        return moment(frontMatter[this.settings.getDateFromFrontMatterKey], this.settings.getDateFromFormat, true)
      } else {
        return moment('invalid date')
      }
    } else {
      // Elses return today's date
      return moment()
    }
  }
}
