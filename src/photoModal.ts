import {
  App,
  Editor,
  MarkdownView,
  Modal,
  moment,
  Notice,
  Platform,
  requestUrl,
  Setting,
  ToggleComponent
} from 'obsidian'
import { GridView, ThumbnailImage } from './renderer'
import GooglePhotos from './main'
import { handlebarParse } from './handlebars'
import Litepicker from 'litepicker'
import { dateToGoogleDateFilter, GooglePhotosDateFilter } from 'photosApi'

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

  /**
   * Save a local thumbnail and insert the thumbnail plus a link back to the original Google Photos location
   * @param event
   */
  async insertImageIntoEditor (event: MouseEvent) {
    try {
      // Remove the photo grid and just show the loading spinner while we wait for the thumbnail to download
      await this.gridView.resetGrid()
      const thumbnailImage = <ThumbnailImage>event.target
      const src = thumbnailImage.baseUrl + `=w${this.plugin.settings.thumbnailWidth}-h${this.plugin.settings.thumbnailHeight}`
      const noteFolder = this.view.file.path.split('/').slice(0, -1).join('/')
      // Use the note folder or the user-specified folder from Settings
      let thumbnailFolder = noteFolder
      let linkPath = thumbnailImage.filename
      switch (this.plugin.settings.locationOption) {
        case 'specified':
          thumbnailFolder = this.plugin.settings.locationFolder
          // Set the Markdown image path to be the full specified path + filename
          linkPath = thumbnailFolder + '/' + thumbnailImage.filename
          break
        case 'subfolder':
          thumbnailFolder = noteFolder + '/' + this.plugin.settings.locationSubfolder
          // Set the Markdown image path to be the subfolder + filename
          linkPath = this.plugin.settings.locationSubfolder + '/' + thumbnailImage.filename
          break
      }
      thumbnailFolder = thumbnailFolder.replace(/^\/+/, '').replace(/\/+$/, '') // remove any leading/trailing slashes
      linkPath = encodeURI(linkPath)
      // Check to see if the destination folder exists
      const vault = this.view.app.vault
      if (!await vault.adapter.exists(thumbnailFolder)) {
        // Create the folder if not already existing. This works to any depth
        await vault.createFolder(thumbnailFolder)
      }
      // Fetch the thumbnail from Google Photos
      const imageData = await requestUrl({ url: src })
      await this.view.app.vault.adapter.writeBinary(thumbnailFolder + '/' + thumbnailImage.filename, imageData.arrayBuffer)
      const cursorPosition = this.editor.getCursor()
      const linkText = handlebarParse(this.plugin.settings.thumbnailMarkdown, {
        local_thumbnail_link: linkPath,
        google_photo_id: thumbnailImage.photoId,
        google_photo_url: thumbnailImage.productUrl,
        google_photo_desc: thumbnailImage.description || '', // Photo caption from Google Photos description text field
        google_base_url: thumbnailImage.baseUrl,
        taken_date: thumbnailImage.creationTime.format()
      })
      this.editor.replaceRange(linkText, cursorPosition)
      // Move the cursor to the end of the thumbnail link after pasting
      this.editor.setCursor({ line: cursorPosition.line, ch: cursorPosition.ch + linkText.length })
    } catch (e) {
      console.log(e)
    }
    this.close() // close the modal
  }

  onClose () {
    this.gridView?.destroy()
  }
}

export class DailyPhotosModal extends PhotosModal {
  noteDate: moment.Moment
  limitPhotosToNoteDate = false
  dateSetting: Setting
  dateToggle: ToggleComponent

  /**
   * Update the human-readable date toggle text
   */
  updateDateText () {
    let rangeText = ''
    if (this.plugin.settings.showPhotosInDateRange) {
      const range = []
      if (this.plugin.settings.showPhotosXDaysPast) range.push('-' + this.plugin.settings.showPhotosXDaysPast)
      if (this.plugin.settings.showPhotosXDaysFuture) range.push('+' + this.plugin.settings.showPhotosXDaysFuture)
      rangeText = ' (' + range.join('/') + ' days)'
    }
    this.dateSetting?.setName(`Limit photos to ${this.noteDate.format('dddd, MMMM D')} 📅` + rangeText)
  }

  /**
   * Update the date filter (if needed) and reset the photo grid
   */
  async updateView () {
    if (this.limitPhotosToNoteDate) {
      let dateFilter: GooglePhotosDateFilter = {
        dates: [dateToGoogleDateFilter(this.noteDate)]
      }
      if (this.plugin.settings.showPhotosInDateRange) {
        // Determine the date range to show photos in
        const xDaysBeforeDate = moment(this.noteDate).subtract(this.plugin.settings.showPhotosXDaysPast, 'days')
        const xDaysAfterDate = moment(this.noteDate).add(this.plugin.settings.showPhotosXDaysFuture, 'days')
        dateFilter = {
          ranges: [{
            startDate: dateToGoogleDateFilter(xDaysBeforeDate),
            endDate: dateToGoogleDateFilter(xDaysAfterDate)
          }]
        } as object
      }
      this.updateDateText()
      this.gridView.setSearchParams({
        filters: {
          dateFilter
        }
      })
    } else {
      this.gridView.clearSearchParams()
    }
    await this.gridView.resetGrid()
    this.gridView.getThumbnails().then()
  }

  async onOpen () {
    const { contentEl, modalEl } = this
    if (Platform.isDesktop) {
      // Resize to fit the viewport width on desktop
      modalEl.addClass('google-photos-modal-grid')
    }
    this.gridView = new GridView({
      scrollEl: modalEl,
      plugin: this.plugin,
      onThumbnailClick: event => this.insertImageIntoEditor(event)
    })

    // Check for a valid date from the note title
    this.noteDate = this.plugin.getNoteDate(this.view.file)
    if (this.noteDate.isValid()) {
      // The currently open note has a parsable date
      if (this.plugin.settings.defaultToDailyPhotos) {
        // Set the default view to show photos from today
        this.limitPhotosToNoteDate = true
      }
    } else {
      new Notice(`Unable to parse date from ${lowerCaseFirstLetter(this.plugin.settings.getDateFrom)} with format ${this.plugin.settings.getDateFromFormat}. Using today's date instead.`)
      // Set to today's date if there is no note date
      this.noteDate = moment()
    }

    // Create the date picker
    const datePicker = new Litepicker({
      element: document.createElement('div'),
      startDate: this.noteDate.format('YYYY-MM-DD')
    })
    datePicker.on('selected', date => {
      this.noteDate = moment(date.format('YYYY-MM-DD'))
      this.dateToggle.setValue(true)
    })

    // Create the checkbox to switch between date / all photos
    new Setting(contentEl)
      .setClass('google-photos-fit-content')
      .addToggle(toggle => {
        this.dateToggle = toggle
        toggle
          .setValue(this.limitPhotosToNoteDate)
          .onChange(checked => {
            this.limitPhotosToNoteDate = checked
            this.updateView()
          })
      })
      .then(setting => {
        this.dateSetting = setting
        this.updateDateText()
        setting.nameEl.onclick = () => { datePicker.show(setting.nameEl) }
      })

    // Attach the grid view to the modal
    contentEl.appendChild(this.gridView.containerEl)

    // Start fetching thumbnails!
    await this.updateView()
  }
}

function lowerCaseFirstLetter (string: string) {
  return string.charAt(0).toLowerCase() + string.slice(1)
}
