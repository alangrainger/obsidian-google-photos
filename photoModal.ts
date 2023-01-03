import { App, Editor, MarkdownView, Modal, moment, Platform, requestUrl } from 'obsidian'
import { GridView } from './renderer'
import GooglePhotos from './main'

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
      // Remove the photo grid and just show the loading spinner while we wait for the thumbnail to download
      await this.gridView.resetGrid()
      let {baseurl, producturl, filename} = event.target.dataset
      const src = baseurl + `=w${this.plugin.settings.thumbnailWidth}-h${this.plugin.settings.thumbnailHeight}`
      const noteFolder = this.view.file.path.split('/').slice(0, -1).join('/')
      // Use the note folder or the user-specified folder from Settings
      let thumbnailFolder = this.plugin.settings.locationOption === 'specified' ? this.plugin.settings.locationFolder : noteFolder
      thumbnailFolder = thumbnailFolder.replace(/^\//, '') // remove any leading slash
      // Check to see if the destination folder exists
      const vault = this.view.app.vault
      if (!await vault.adapter.exists(thumbnailFolder)) {
        // Create the folder if not already existing. This works to any depth
        await vault.createFolder(thumbnailFolder)
      }
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
