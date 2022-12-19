import { Editor, moment, Notice, requestUrl } from 'obsidian'
import GooglePhotos, { PhotosModal } from './main'

const path = require('path')

export default class Renderer {
  plugin: GooglePhotos
  thumbnailWidth: number
  thumbnailHeight: number
  spinner: HTMLElement

  constructor (plugin: GooglePhotos) {
    this.plugin = plugin
    this.thumbnailWidth = this.plugin.settings.thumbnailWidth
    this.thumbnailHeight = this.plugin.settings.thumbnailHeight

    // Create a nice Google-themed loading spinner
    this.spinner = document.createElement('div')
    this.spinner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="161px" height="161px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
      <circle cx="84" cy="50" r="10" fill="#c5523f"><animate attributeName="r" repeatCount="indefinite" dur="0.4807692307692307s" calcMode="spline" keyTimes="0;1" values="10;0" keySplines="0 0.5 0.5 1" begin="0s"></animate><animate attributeName="fill" repeatCount="indefinite" dur="1.923076923076923s" calcMode="discrete" keyTimes="0;0.25;0.5;0.75;1" values="#c5523f;#1875e5;#499255;#f2b736;#c5523f" begin="0s"></animate></circle>
      <circle cx="16" cy="50" r="10" fill="#c5523f"><animate attributeName="r" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="0;0;10;10;10" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="0s"></animate><animate attributeName="cx" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="16;16;16;50;84" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="0s"></animate></circle>
      <circle cx="50" cy="50" r="10" fill="#f2b736"><animate attributeName="r" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="0;0;10;10;10" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="-0.4807692307692307s"></animate><animate attributeName="cx" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="16;16;16;50;84" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="-0.4807692307692307s"></animate></circle>
      <circle cx="84" cy="50" r="10" fill="#499255"><animate attributeName="r" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="0;0;10;10;10" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="-0.9615384615384615s"></animate><animate attributeName="cx" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="16;16;16;50;84" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="-0.9615384615384615s"></animate></circle>
      <circle cx="16" cy="50" r="10" fill="#1875e5"><animate attributeName="r" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="0;0;10;10;10" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="-1.4423076923076923s"></animate><animate attributeName="cx" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="16;16;16;50;84" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="-1.4423076923076923s"></animate></circle></svg>`
    this.spinner.toggleVisibility(false)
    this.spinner.style.transform = 'scale(0.5)'
  }

  /**
   * Append an array of mediaItems to an HTML element
   *
   * @param {HTMLElement} el
   * @param {array} thumbnails
   * @param {function} onclick
   */
  appendThumbnailsToElement (el: HTMLElement, thumbnails: [], onclick: (el: any) => void) {
    (thumbnails || []).forEach(({productUrl, baseUrl, mediaMetadata}) => {
      // Image element
      const img = new Image()
      img.src = baseUrl + `=w500-h120`
      img.dataset.baseurl = baseUrl
      img.dataset.producturl = productUrl
      const {creationTime} = mediaMetadata
      img.dataset.filename = moment(creationTime).format(this.plugin.settings.filename)
      img.onclick = onclick
      img.classList.add('google-photos-grid')
      // Output to Obsidian
      el.appendChild(img)
    })
  }

  showWaitingCursor (state: boolean) {
    // Set spinner cursor
    document.body.style.cursor = state ? 'wait' : 'default'
  }
}

export class GridView extends Renderer {
  contentEl: HTMLElement
  scrollEl: HTMLElement
  grid: HTMLElement
  options: object
  plugin: GooglePhotos
  modal: PhotosModal
  editor: Editor
  nextPageToken: string
  noteDate: moment.Moment
  limitPhotosToNoteDate: boolean = true
  fetching: boolean = false
  moreResults: boolean = true
  active: boolean = true

  constructor ({contentEl, scrollEl, options = {}, plugin, modal, editor}: {
    contentEl: HTMLElement,
    scrollEl: HTMLElement,
    options?: object,
    plugin: GooglePhotos,
    modal: PhotosModal,
    editor: Editor
  }) {
    super(plugin)
    this.modal = modal
    this.editor = editor
    this.contentEl = contentEl
    this.scrollEl = scrollEl
    this.options = options
  }

  async init () {
    const createEl = function (type: string, classes: string, parent: HTMLElement) {
      const el = document.createElement(type)
      if (classes) el.addClasses(classes.split(' '))
      parent.appendChild(el)
      return el
    }

    // Show the checkbox for today / all photos
    this.noteDate = moment(this.modal.view.file.basename, this.plugin.settings.parseNoteTitle)
    if (this.noteDate.isValid()) {
      // Add the required checkbox DOM content
      const outer = createEl('div', 'setting-item mod-toggle', this.contentEl)
      outer.style.marginBottom = '10px'
      outer.style.width = 'fit-content'
      const settingInfo = createEl('div', 'setting-item-info', outer)
      const name = createEl('div', 'setting-item-name', settingInfo)
      name.innerText = 'Limit photos to ' + this.noteDate.format('dddd, MMMM D')
      createEl('div', 'setting-item-description', settingInfo)
      const settingControl = createEl('div', 'setting-item-control', outer)
      const checkboxContainer = createEl('div', 'checkbox-container is-enabled', settingControl)
      const input = document.createElement('input')
      input.type = 'checkbox'
      checkboxContainer.appendChild(input)
      // Watch for click events and reset the photo grid
      checkboxContainer.onclick = () => {
        if (this.limitPhotosToNoteDate) {
          checkboxContainer.removeClass('is-enabled')
        } else {
          checkboxContainer.addClass('is-enabled')
        }
        this.limitPhotosToNoteDate = !this.limitPhotosToNoteDate
        this.resetGrid()
        this.getThumbnails(this.grid)
      }
    }

    // Add the photo-grid container
    this.grid = this.contentEl.createEl('div')
    // Add the loading spinner
    this.contentEl.appendChild(this.spinner)
    this.spinner.toggleVisibility(true)

    if (this.scrollEl) {
      // Watch for a scroll event
      this.scrollEl.addEventListener('scroll', () => this.getThumbnails(this.grid))
    }

    // Add the first lot of thumbnails
    await this.getThumbnails(this.grid)
  }

  /**
   * Reset the photo-grid view to a blank state
   */
  async resetGrid () {
    this.spinner.toggleVisibility(true)
    const oldGrid = this.grid
    oldGrid.empty()
    this.grid = document.createElement('div')
    this.contentEl.replaceChild(this.grid, oldGrid)
    this.active = true
    this.fetching = false
    this.nextPageToken = ''
    this.moreResults = true
  }

  /**
   * Load more thumbnails if both of these checks are true:
   * 1. There are more results to return from Google Photos API
   * 2. The scrolled height is within 8 thumbnail's height from the bottom
   *
   * @returns {Promise<void>}
   */
  getThumbnails = async (targetEl: HTMLElement) => {
    if (this.fetching) {
      // An instance is already in the process of fetching more thumbnails
      return
    }
    this.fetching = true
    while (
      this.active && this.moreResults && this.scrollEl &&
      this.scrollEl.scrollHeight - this.scrollEl.scrollTop < this.scrollEl.clientHeight + (8 * this.thumbnailHeight)
      ) {
      // Perform the search with Photos API and output the result
      try {
        const localOptions = Object.assign({}, this.options)
        if (this.noteDate.isValid() && this.limitPhotosToNoteDate) {
          // Show only photos taken on the same date as the note
          Object.assign(localOptions, {
            filters: {
              dateFilter: {
                dates: [{
                  year: +this.noteDate.format('YYYY'),
                  month: +this.noteDate.format('M'),
                  day: +this.noteDate.format('D')
                }]
              }
            }
          })
        }
        if (this.nextPageToken) Object.assign(localOptions, {pageToken: this.nextPageToken})
        const {mediaItems, nextPageToken} = await this.plugin.photosApi.mediaItemsSearch(localOptions)
        // console.log(`appending ${mediaItems.length} items`)
        this.appendThumbnailsToElement(targetEl, mediaItems, (el) => this.insertImageIntoEditor(el))
        this.moreResults = !!nextPageToken
        this.spinner.toggleVisibility(this.moreResults)
        this.nextPageToken = nextPageToken
      } catch (e) {
        // Unable to fetch results from Photos API
        console.log(e)
        if (e === 'Retry') {
          // Re-authenticated, so try getting the thumbnails again
          console.log('Google Photos: Retrying authentication')
        } else {
          // Unable to authenticate or process the query
          this.moreResults = false
          this.nextPageToken = ''
          if (e === 'Unauthenticated') {
            this.active = false
            new Notice('Failed to authenticate')
            this.modal.close()
          }
          break
        }
      }
    }
    this.fetching = false
  }

  /**
   * Save a local thumbnail and insert the thumbnail plus a link back to the original Google Photos location
   * @param el
   */
  async insertImageIntoEditor (el: any) {
    this.showWaitingCursor(true)
    try {
      let {baseurl, producturl, filename} = el.target.dataset
      const src = baseurl + `=w${this.thumbnailWidth}-h${this.thumbnailHeight}`
      const folder = path.dirname(this.modal.view.file.path)
      this.modal.close()
      const imageData = await requestUrl({url: src})
      await this.modal.view.app.vault.adapter.writeBinary(folder + '/' + filename, imageData.arrayBuffer)
      this.editor.replaceRange(`[![](${filename})](${producturl})`, this.editor.getCursor())
    } catch (e) {
      console.log(e)
    }
    this.showWaitingCursor(false)
  }

  destroy () {
    try {
      this.scrollEl.removeEventListener('scroll', () => this.getThumbnails(this.grid))
    } catch (e) {
      // nothing
    }
    this.active = false
  }
}
