import { App, Editor, MarkdownView, Modal, moment, Notice, Platform, requestUrl, Setting, ToggleComponent } from 'obsidian'
import { GridView, ThumbnailImage } from './renderer'
import GooglePhotos from './main'
import { handlebarParse } from './handlebars'
import Litepicker from 'litepicker'
import { GetDateFromOptions } from 'settings'
import { GooglePhotosDateFilter } from 'photosApi'

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
  async insertImageIntoEditor (event: { target: ThumbnailImage }) {
    try {
      // Remove the photo grid and just show the loading spinner while we wait for the thumbnail to download
      await this.gridView.resetGrid()
      const thumbnailImage = event.target
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
      const imageData = await requestUrl({url: src})
      await this.view.app.vault.adapter.writeBinary(thumbnailFolder + '/' + thumbnailImage.filename, imageData.arrayBuffer)
      const cursorPosition = this.editor.getCursor()
      const linkText = handlebarParse(this.plugin.settings.thumbnailMarkdown, {
        local_thumbnail_link: linkPath,
        google_photo_id: thumbnailImage.photoId,
        google_photo_url: thumbnailImage.productUrl,
        google_base_url: thumbnailImage.baseUrl,
        taken_date: thumbnailImage.creationTime.format()
      })
      this.editor.replaceRange(linkText, cursorPosition)
      // Move the cursor to the end of the thumbnail link after pasting
      this.editor.setCursor({line: cursorPosition.line, ch: cursorPosition.ch + linkText.length})
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
  xDaysBeforeDate: moment.Moment
  xDaysAfterDate: moment.Moment
  limitPhotosToNoteDate = false
  dateSetting: Setting
  dateToggle: ToggleComponent

  constructor (app: App, plugin: GooglePhotos, editor: Editor, view: MarkdownView) {
    super(app, plugin, editor, view)
  }

  /**
   * Update the human-readable date toggle text
   */
  updateDateText () {
    if (this.plugin.settings.showPhotosInDateRange) {
      this.dateSetting?.setName(`Limit photos between ${this.xDaysBeforeDate.format('dddd, MMMM D')} and ${this.xDaysAfterDate.format('dddd, MMMM, D')} 📅`)
    } else {
      this.dateSetting?.setName('Limit photos to ' + this.noteDate.format('dddd, MMMM D') + ' 📅')
    }
  }

  /**
   * Update the date filter (if needed) and reset the photo grid
   */
  async updateView () {
    if (this.limitPhotosToNoteDate) {
      let dateFilter: GooglePhotosDateFilter = {
        dates: [dateToGoogleDateFilter(this.noteDate)],
      }
      if (this.plugin.settings.showPhotosInDateRange) {
        dateFilter = {
          ranges: [{
            startDate: dateToGoogleDateFilter(this.xDaysBeforeDate),
            endDate: dateToGoogleDateFilter(this.xDaysAfterDate)
          }],
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
    const {contentEl, modalEl} = this
    if (Platform.isDesktop) {
      // Resize to fit the viewport width on desktop
      modalEl.addClass('google-photos-modal-grid')
    }
    this.gridView = new GridView({
      scrollEl: modalEl,
      plugin: this.plugin,
      onThumbnailClick: (event: { target: ThumbnailImage }) => this.insertImageIntoEditor(event)
    })

    // Check for a valid date from the note title
    this.noteDate = await this.getDateUsingSetting()
    if (this.noteDate.isValid()) {
      // The currently open note has a parsable date
      if (this.plugin.settings.defaultToDailyPhotos) {
        // Set the default view to show photos from today
        this.limitPhotosToNoteDate = true
      }
    } else {
      new Notice(`Unable to parse date from ${lowerCaseFirstLetter(this.plugin.settings.getDateFrom)} with format ${this.plugin.settings.getDateFromFormat}. Using today's date instead.`)
      // Set to today's date if there is not note date
      this.noteDate = moment()
    }

    // Determine the date range to show photos in
    if (this.plugin.settings.showPhotosInDateRange) {
      this.xDaysBeforeDate = moment(this.noteDate).subtract(this.plugin.settings.showPhotosXDaysPast, 'days')
      this.xDaysAfterDate = moment(this.noteDate).add(this.plugin.settings.showPhotosXDaysFuture, 'days')
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
        setting.nameEl.onclick = () => {datePicker.show(setting.nameEl)}
      })

    // Attach the grid view to the modal
    contentEl.appendChild(this.gridView.containerEl)

    // Start fetching thumbnails!
    await this.updateView()
  }

  // Gets the date from the note title, front matter, or returns today based on user setting
  async getDateUsingSetting(): Promise<moment.Moment> {
    if (this.plugin.settings.getDateFrom === GetDateFromOptions.NOTE_TITLE) {
      return moment(this.view.file.basename, this.plugin.settings.getDateFromFormat, true)
    } else if (this.plugin.settings.getDateFrom === GetDateFromOptions.FRONT_MATTER) {
      const file = this.app.metadataCache.getFileCache(this.view.file)
      const frontMatter = file?.frontmatter
      if (frontMatter && frontMatter[this.plugin.settings.getDateFromFrontMatterKey]) {
        return moment(frontMatter[this.plugin.settings.getDateFromFrontMatterKey], this.plugin.settings.getDateFromFormat, true)
      }
    }
    // GetDateFromOptions.TODAY option, use today's date
    return moment()
  }
}

/* export class ShowAlbumsModal extends PhotosModal {

  constructor (app: App, plugin: GooglePhotos, editor: Editor, view: MarkdownView) {
    super(app, plugin, editor, view)
  }

  async onOpen () {
    const {contentEl, modalEl} = this
    if (Platform.isDesktop) {
      // Resize to fit the viewport width on desktop
      modalEl.addClass('google-photos-modal-grid')
    }

    console.log(await this.plugin.photosApi.listAlbums())
  }
} */

function dateToGoogleDateFilter(date: moment.Moment) {
  return {
    year: +date.format('YYYY'),
    month: +date.format('M'),
    day: +date.format('D')
  }
}

function lowerCaseFirstLetter(string: string) {
  return string.charAt(0).toLowerCase() + string.slice(1)
}