import { moment, Notice, requestUrl } from 'obsidian'
import GooglePhotos from './main'
import { Moment } from 'moment'
import { GooglePhotosMediaItem, GooglePhotosSearchParams } from 'photosApi'

export class ThumbnailImage extends Image {
  photoId: string
  baseUrl: string
  productUrl: string
  filename: string
  description?: string
  creationTime: Moment
}

type ThumbnailClick = (event: MouseEvent) => Promise<void>

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
  async appendThumbnailsToElement (el: HTMLElement, thumbnails: GooglePhotosMediaItem[], onclick: (event: MouseEvent) => void) {
    for (const mediaItem of thumbnails || []) {
      // Image element
      const img = new ThumbnailImage()
      const settings = this.plugin.settings
      
      // For Picker API, we need to fetch the image with authentication and create a blob URL
      try {
        const imageUrl = mediaItem.baseUrl + '=w500-h130'
        console.log(`Fetching authenticated image: ${imageUrl}`)
        
        // Create a placeholder image while loading
        img.src = 'data:image/svg+xml;base64,' + btoa(`
          <svg width="500" height="130" xmlns="http://www.w3.org/2000/svg">
            <rect width="500" height="130" fill="#f0f0f0"/>
            <text x="250" y="70" text-anchor="middle" fill="#666" font-family="Arial" font-size="14">Loading...</text>
          </svg>
        `)
        
        // Set other properties immediately
        img.photoId = mediaItem.id
        img.baseUrl = mediaItem.baseUrl
        img.productUrl = mediaItem.productUrl
        img.description = mediaItem.description // Optional caption
        img.creationTime = moment(mediaItem.mediaMetadata.creationTime)
        img.filename = img.creationTime.format(settings.filename)
        img.onclick = onclick
        img.classList.add('google-photos-grid-thumbnail')
        
        // Add to DOM first so user sees the placeholder
        el.appendChild(img)
        
        // Fetch the actual image with authentication
        // Picker API requires OAuth authorization header
        const s = this.plugin.settings
        const imageData = await requestUrl({ 
          url: imageUrl,
          headers: {
            'Authorization': 'Bearer ' + s.accessToken
          }
        })
        const blob = new Blob([imageData.arrayBuffer], { type: 'image/jpeg' })
        const blobUrl = URL.createObjectURL(blob)
        
        // Replace placeholder with actual image
        img.src = blobUrl
        
        // Clean up blob URL when image is no longer needed
        img.onload = () => {
          // Keep blob URL for now - it will be cleaned up when modal closes
        }
        
        console.log(`Successfully loaded authenticated image for: ${mediaItem.id}`)
        
      } catch (error) {
        console.error(`Failed to load image for ${mediaItem.id}:`, error)
        // Set a fallback error image
        img.src = 'data:image/svg+xml;base64,' + btoa(`
          <svg width="500" height="130" xmlns="http://www.w3.org/2000/svg">
            <rect width="500" height="130" fill="#ffebee"/>
            <text x="250" y="70" text-anchor="middle" fill="#c62828" font-family="Arial" font-size="12">Failed to load image</text>
          </svg>
        `)
        
        // Still set the properties so the click handler works
        img.photoId = mediaItem.id
        img.baseUrl = mediaItem.baseUrl
        img.productUrl = mediaItem.productUrl
        img.description = mediaItem.description
        img.creationTime = moment(mediaItem.mediaMetadata.creationTime)
        img.filename = img.creationTime.format(settings.filename)
        img.onclick = onclick
        img.classList.add('google-photos-grid-thumbnail')
        
        // Add to DOM
        el.appendChild(img)
      }
    }
  }
}

export class GridView extends Renderer {
  scrollEl: HTMLElement
  containerEl: HTMLElement
  gridEl: HTMLElement
  title: string
  searchParams: GooglePhotosSearchParams = {}
  plugin: GooglePhotos
  onThumbnailClick: ThumbnailClick
  nextPageToken: string
  fetching = false
  moreResults = true
  active = true

  constructor ({ scrollEl, plugin, onThumbnailClick, title }: {
    plugin: GooglePhotos,
    scrollEl?: HTMLElement,
    onThumbnailClick?: ThumbnailClick,
    title?: string
  }) {
    super(plugin)
    if (onThumbnailClick) {
      // Add an event handler if provided
      this.onThumbnailClick = onThumbnailClick
    }

    // Add the photo-grid container
    this.containerEl = document.createElement('div')
    if (title) {
      const titleEl = this.containerEl.createEl('div')
      titleEl.className = 'google-photos-album-title'
      titleEl.innerText = title
    }
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

  setTitle (title: string) {
    this.title = title
  }

  setSearchParams (searchParams: GooglePhotosSearchParams) {
    this.searchParams = searchParams
  }

  clearSearchParams () {
    this.searchParams = {}
  }

  /**
   * Load more thumbnails if both of these checks are true:
   * 1. There are more results to return from Google Photos API
   * 2. The scrolled height is within 8 thumbnails height from the bottom
   *
   * @returns {Promise<void>}
   */
  getThumbnails = async (): Promise<void> => {
    if (this.fetching) {
      // An instance is already in the process of fetching more thumbnails
      return
    }
    this.fetching = true
    const targetEl = this.gridEl
    /*
    While:
     + the active flag is enabled, and there are more results to fetch from Photos API, and there is a scrollable element
     + the user is within 5 thumbnails distance from the bottom of the scrollable element
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
        if (this.nextPageToken) Object.assign(localOptions, { pageToken: this.nextPageToken })
        const searchResult = await this.plugin.photosApi.mediaItemsSearch(localOptions)
        if (searchResult.mediaItems) {
          await this.appendThumbnailsToElement(targetEl, searchResult.mediaItems, event => this.onThumbnailClick(event))
        } else if (!targetEl.childElementCount) {
          targetEl.createEl('p', {
            text: 'No photos found for this query.'
          })
        }
        this.moreResults = !!searchResult.nextPageToken
        if (this.moreResults) {
          this.spinner.style.display = 'block'
        } else {
          // Remove the loading spinner after a short timeout, to give thumbnails a chance to load
          setTimeout(() => {
            this.spinner.style.display = 'none'
          }, targetEl.childElementCount ? 1000 : 0)
        }
        this.nextPageToken = searchResult.nextPageToken
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
