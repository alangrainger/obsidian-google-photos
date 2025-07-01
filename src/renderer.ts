import { moment, Notice, requestUrl } from 'obsidian'
import GooglePhotos from './main'
import { Moment } from 'moment'
import { GooglePhotosMediaItem } from 'photosApi'

export class ThumbnailImage extends Image {
  photoId: string
  baseUrl: string
  productUrl: string
  filename: string
  description?: string
  creationTime: Moment
}

export default class Renderer {
  plugin: GooglePhotos

  constructor (plugin: GooglePhotos) {
    this.plugin = plugin
  }
}

export class GridView extends Renderer {
  onThumbnailClick: (event: MouseEvent) => void
  containerEl: HTMLElement
  scrollEl: HTMLElement
  isLoading = false

  constructor (options: { scrollEl: HTMLElement, plugin: GooglePhotos, onThumbnailClick: (event: MouseEvent) => void }) {
    super(options.plugin)
    this.scrollEl = options.scrollEl
    this.onThumbnailClick = options.onThumbnailClick
    this.containerEl = document.createElement('div')
    this.containerEl.classList.add('google-photos-fit-content')
  }

  /**
   * Remove all the items from the thumbnails list
   */
  async resetGrid () {
    this.containerEl.innerHTML = '<p>Downloading thumbnail...</p>'
  }

  /**
   * Show a loading spinner
   */
  async setLoading () {
    // Show loading spinner
    this.isLoading = true
    this.containerEl.innerHTML = '<p>Loading photos...</p>'
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
        
        // Create blob URL and update image
        const blob = new Blob([imageData.arrayBuffer], { type: 'image/jpeg' })
        const blobUrl = URL.createObjectURL(blob)
        img.src = blobUrl
        
        // Clean up blob URL when image is removed from DOM
        img.addEventListener('remove', () => {
          URL.revokeObjectURL(blobUrl)
        })
        
      } catch (error) {
        console.error('Failed to load image:', error)
        img.src = 'data:image/svg+xml;base64,' + btoa(`
          <svg width="500" height="130" xmlns="http://www.w3.org/2000/svg">
            <rect width="500" height="130" fill="#ffebee"/>
            <text x="250" y="70" text-anchor="middle" fill="#c62828" font-family="Arial" font-size="14">Failed to load</text>
          </svg>
        `)
      }
    }
    this.isLoading = false
  }

  destroy () {
    // Clean up any blob URLs
    const images = this.containerEl.querySelectorAll('img')
    images.forEach(img => {
      if (img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src)
      }
    })
  }
}
