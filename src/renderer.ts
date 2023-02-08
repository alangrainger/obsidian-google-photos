import { moment, Notice } from 'obsidian'
import GooglePhotos from './main'

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
    this.spinner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="161px" height="161px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
      <circle cx="84" cy="50" r="10" fill="#c5523f"><animate attributeName="r" repeatCount="indefinite" dur="0.4807692307692307s" calcMode="spline" keyTimes="0;1" values="10;0" keySplines="0 0.5 0.5 1" begin="0s"></animate><animate attributeName="fill" repeatCount="indefinite" dur="1.923076923076923s" calcMode="discrete" keyTimes="0;0.25;0.5;0.75;1" values="#c5523f;#1875e5;#499255;#f2b736;#c5523f" begin="0s"></animate></circle>
      <circle cx="16" cy="50" r="10" fill="#c5523f"><animate attributeName="r" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="0;0;10;10;10" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="0s"></animate><animate attributeName="cx" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="16;16;16;50;84" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="0s"></animate></circle>
      <circle cx="50" cy="50" r="10" fill="#f2b736"><animate attributeName="r" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="0;0;10;10;10" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="-0.4807692307692307s"></animate><animate attributeName="cx" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="16;16;16;50;84" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="-0.4807692307692307s"></animate></circle>
      <circle cx="84" cy="50" r="10" fill="#499255"><animate attributeName="r" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="0;0;10;10;10" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="-0.9615384615384615s"></animate><animate attributeName="cx" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="16;16;16;50;84" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="-0.9615384615384615s"></animate></circle>
      <circle cx="16" cy="50" r="10" fill="#1875e5"><animate attributeName="r" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="0;0;10;10;10" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="-1.4423076923076923s"></animate><animate attributeName="cx" repeatCount="indefinite" dur="1.923076923076923s" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" values="16;16;16;50;84" keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1" begin="-1.4423076923076923s"></animate></circle></svg>`
    this.spinner.style.display = 'none'
    this.spinner.style.transform = 'scale(0.5)'
  }

  isVisible (el: HTMLElement) {
    return new Promise(resolve => {
      const o = new IntersectionObserver(([entry]) => {
        resolve(entry.intersectionRatio > 0.3)
        o.disconnect()
      })
      o.observe(el)
    })
  }

  /**
   * Append an array of mediaItems to an HTML element
   * @param {HTMLElement} el
   * @param {array} thumbnails
   * @param {function} onclick
   */
  appendThumbnailsToElement (el: HTMLElement, thumbnails: [], onclick: (event: MouseEvent) => void) {
    (thumbnails || []).forEach(({id, productUrl, baseUrl, mediaMetadata}) => {
      // Image element
      const img = new Image()
      img.src = baseUrl + `=w500-h130`
      img.dataset.photoid = id
      img.dataset.baseurl = baseUrl
      img.dataset.producturl = productUrl
      const {creationTime} = mediaMetadata
      img.dataset.filename = moment(creationTime).format(this.plugin.settings.filename)
      img.onclick = onclick
      img.classList.add('google-photos-grid-thumbnail')
      // Output to Obsidian
      el.appendChild(img)
    })
  }
}

export class GridView extends Renderer {
  scrollEl: HTMLElement
  containerEl: HTMLElement
  gridEl: HTMLElement
  searchParams: object = {}
  plugin: GooglePhotos
  onThumbnailClick: Function = () => {}
  nextPageToken: string
  fetching: boolean = false
  moreResults: boolean = true
  active: boolean = true

  constructor ({scrollEl, plugin, onThumbnailClick}: {
    plugin: GooglePhotos,
    scrollEl?: HTMLElement,
    onThumbnailClick?: Function
  }) {
    super(plugin)
    if (onThumbnailClick) {
      // Add an event handler if provided
      this.onThumbnailClick = onThumbnailClick
    }

    // Add the photo-grid container
    this.containerEl = document.createElement('div')
    this.gridEl = this.containerEl.createEl('div')
    // Add the loading spinner
    this.containerEl.appendChild(this.spinner)
    this.spinner.style.display = 'block'

    // Watch for a scroll event
    this.scrollEl = scrollEl || this.containerEl
    this.scrollEl.addEventListener('scroll', () => this.getThumbnails())
  }

  /**
   * Reset the photo-grid view to a blank state
   */
  async resetGrid () {
    this.spinner.style.display = 'block'
    const oldGrid = this.gridEl
    oldGrid.empty()
    this.gridEl = document.createElement('div')
    this.containerEl.replaceChild(this.gridEl, oldGrid)
    this.active = true
    this.fetching = false
    this.nextPageToken = ''
    this.moreResults = true
  }

  setSearchParams (searchParams: object) {
    this.searchParams = searchParams
  }

  clearSearchParams () {
    this.searchParams = {}
  }

  /**
   * Load more thumbnails if both of these checks are true:
   * 1. There are more results to return from Google Photos API
   * 2. The scrolled height is within 8 thumbnail's height from the bottom
   *
   * @returns {Promise<void>}
   */
  getThumbnails = async () => {
    if (this.fetching) {
      // An instance is already in the process of fetching more thumbnails
      return
    }
    this.fetching = true
    const targetEl = this.gridEl
    /*
    While:
     + the active flag is enabled, and there are more results to fetch from Photos API, and there is a scrollable element
     + the user is within 5 thumbnail's distance from the bottom of the scrollable element
     + the scrollable element is visible in the viewport OR we have not yet loaded any thumbnails
     */
    while (
      this.active && this.moreResults && this.scrollEl &&
      this.scrollEl.scrollHeight - this.scrollEl.scrollTop < this.scrollEl.clientHeight + (5 * this.thumbnailHeight) &&
      (!targetEl.innerHTML || await this.isVisible(this.scrollEl)) // Element is visible in the viewport
      ) {
      // Perform the search with Photos API and output the result
      try {
        const localOptions = Object.assign({}, this.searchParams)
        if (this.nextPageToken) Object.assign(localOptions, {pageToken: this.nextPageToken})
        const {mediaItems, nextPageToken} = await this.plugin.photosApi.mediaItemsSearch(localOptions)
        if (mediaItems) {
          // console.log(`appending ${mediaItems.length} items`)
          this.appendThumbnailsToElement(targetEl, mediaItems, event => this.onThumbnailClick(event))
        } else if (!targetEl.childElementCount) {
          targetEl.createEl('p', {
            text: 'No photos found for this query.'
          })
        }
        this.moreResults = !!nextPageToken
        this.spinner.style.display = this.moreResults ? 'block' : 'none'
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
          } else {
            // Add the error message to the photos grid
            targetEl.createEl('p', {
              text: e
            })
          }
          this.spinner.style.display = 'none'
          break
        }
      }
    }
    this.fetching = false
  }

  destroy () {
    try {
      this.scrollEl.removeEventListener('scroll', () => this.getThumbnails())
    } catch (e) {
      // nothing
    }
    this.active = false
  }
}
