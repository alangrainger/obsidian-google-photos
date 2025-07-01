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
import { dateToGoogleDateFilter, GooglePhotosDateFilter, PickerSession } from 'photosApi'

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
      // Picker API requires OAuth authorization header
      const s = this.plugin.settings
      const imageData = await requestUrl({ 
        url: src,
        headers: {
          'Authorization': 'Bearer ' + s.accessToken
        }
      })
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

export class PickerModal extends PhotosModal {
  session: PickerSession | null = null
  pollingInterval: NodeJS.Timeout | null = null
  pickerWindow: Window | null = null

  async onOpen () {
    const { contentEl, modalEl } = this
    
    if (Platform.isDesktop) {
      modalEl.addClass('google-photos-modal-grid')
    }

    // Show loading message
    contentEl.createEl('h2', { text: 'Google Photos Picker' })
    const statusEl = contentEl.createEl('p', { text: 'Initializing photo picker...' })
    const pickerEl = contentEl.createEl('div')

    try {
      // Create picker session
      console.log('Creating picker session...')
      this.session = await this.plugin.photosApi.createSession()
      console.log('Session created:', this.session)
      
      statusEl.setText('Click the button below to open Google Photos and select your photos:')
      
      const openPickerBtn = pickerEl.createEl('button', {
        text: 'Open Google Photos Picker',
        cls: 'mod-cta'
      })
      
      openPickerBtn.onclick = () => {
        if (this.session) {
          console.log('Opening picker with URI:', this.session.pickerUri)
          // Open picker in new window/tab
          this.pickerWindow = window.open(this.session.pickerUri, '_blank')
          openPickerBtn.disabled = true
          openPickerBtn.setText('Waiting for photo selection...')
          statusEl.setText('Select your photos in the Google Photos window, then return here. This window will automatically detect when you\'re done.')
          
          // Start polling for completion
          this.startPolling(statusEl)
        }
      }
      
    } catch (error) {
      console.error('Failed to create picker session:', error)
      statusEl.setText('Error: ' + error.message)
    }
  }

  startPolling (statusEl: HTMLParagraphElement) {
    if (!this.session) return

    console.log('Starting polling for session:', this.session.id)
    let pollCount = 0
    
    const poll = async () => {
      try {
        pollCount++
        console.log(`Poll attempt ${pollCount} for session ${this.session!.id}`)
        
        const sessionStatus = await this.plugin.photosApi.getSession(this.session!.id)
        console.log('Session status:', sessionStatus)
        
        if (sessionStatus.mediaItemsSet) {
          // User has finished selecting photos
          console.log('Media items set detected, stopping polling')
          this.stopPolling()
          statusEl.setText('Photos selected! Loading...')
          await this.displaySelectedPhotos()
        } else {
          // Continue polling
          console.log('Media items not set yet, continuing to poll...')
          const pollInterval = this.parseDuration(sessionStatus.pollingConfig?.pollInterval || '5s')
          console.log(`Next poll in ${pollInterval}ms`)
          statusEl.setText(`Waiting for photo selection... (checked ${pollCount} times)`)
          this.pollingInterval = setTimeout(poll, pollInterval)
        }
      } catch (error) {
        console.error('Polling error:', error)
        this.stopPolling()
        statusEl.setText('Error checking photo selection status: ' + error.message)
        new Notice('Error checking photo selection status: ' + error.message)
      }
    }

    // Start first poll after a short delay
    console.log('Starting initial poll in 3 seconds...')
    this.pollingInterval = setTimeout(poll, 3000)
  }

  stopPolling () {
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval)
      this.pollingInterval = null
      console.log('Polling stopped')
    }
  }

  parseDuration (duration: string): number {
    // Parse duration string like "5s" or "30s" and return milliseconds
    const match = duration.match(/^(\d+)s$/)
    const seconds = match ? parseInt(match[1]) : 5
    console.log(`Parsed duration "${duration}" as ${seconds} seconds`)
    return seconds * 1000
  }

  async displaySelectedPhotos () {
    if (!this.session) return

    const { contentEl } = this
    contentEl.empty()
    
    contentEl.createEl('h2', { text: 'Selected Photos' })
    const statusEl = contentEl.createEl('p', { text: 'Loading selected photos...' })
    
    try {
      console.log('Fetching picked media items for session:', this.session.id)
      // Get picked media items
      const mediaItemsResponse = await this.plugin.photosApi.listPickedMediaItems(this.session.id)
      console.log('Media items response:', mediaItemsResponse)
      
      // Debug the condition check
      console.log('mediaItemsResponse.mediaItems exists?', !!mediaItemsResponse.mediaItems)
      console.log('mediaItemsResponse.mediaItems type:', typeof mediaItemsResponse.mediaItems)
      console.log('mediaItemsResponse.mediaItems length:', mediaItemsResponse.mediaItems?.length)
      console.log('Is array?', Array.isArray(mediaItemsResponse.mediaItems))
      console.log('Length > 0?', (mediaItemsResponse.mediaItems?.length || 0) > 0)
      
      if (mediaItemsResponse.mediaItems && mediaItemsResponse.mediaItems.length > 0) {
        console.log(`✅ Found ${mediaItemsResponse.mediaItems.length} selected photos`)
        statusEl.setText(`Found ${mediaItemsResponse.mediaItems.length} selected photo(s). Click on a photo to insert it into your note:`)
        
        // Create grid view for selected photos
        this.gridView = new GridView({
          scrollEl: this.modalEl,
          plugin: this.plugin,
          onThumbnailClick: event => this.insertImageIntoEditor(event)
        })

        // Convert picked items to compatible format and display
        const compatibleItems = mediaItemsResponse.mediaItems.map(item => 
          this.plugin.photosApi.convertPickedMediaItem(item)
        )
        
        console.log('Compatible items created:', compatibleItems)
        
        await this.gridView.appendThumbnailsToElement(
          this.gridView.containerEl, 
          compatibleItems, 
          event => this.insertImageIntoEditor(event)
        )
        
        contentEl.appendChild(this.gridView.containerEl)
      } else {
        console.log('❌ Condition failed - debugging why:')
        console.log('- mediaItemsResponse.mediaItems:', mediaItemsResponse.mediaItems)
        console.log('- Truthy check:', !!mediaItemsResponse.mediaItems)
        console.log('- Length:', mediaItemsResponse.mediaItems?.length)
        console.log('- Length > 0:', (mediaItemsResponse.mediaItems?.length || 0) > 0)
        console.log('Full response:', mediaItemsResponse)
        statusEl.setText('No photos were selected. You can close this window and try again.')
      }
      
    } catch (error) {
      console.error('Failed to load selected photos:', error)
      statusEl.setText('Error loading selected photos: ' + error.message)
    }
  }

  onClose () {
    this.stopPolling()
    
    // Clean up session
    if (this.session) {
      this.plugin.photosApi.deleteSession(this.session.id).catch(error => {
        console.error('Failed to delete session:', error)
      })
    }
    
    // Close picker window if still open
    if (this.pickerWindow && !this.pickerWindow.closed) {
      this.pickerWindow.close()
    }
    
    super.onClose()
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
    // Note: Date filtering is no longer available with Picker API
    this.dateSetting?.setName(`Note: Date filtering is not available with the new Google Photos API`)
  }

  /**
   * Update the date filter (if needed) and reset the photo grid
   */
  async updateView () {
    // Date filtering is no longer supported with Picker API
    // Show notice to user about this limitation
    new Notice('⚠️ Date filtering is no longer supported with the new Google Photos API. Please use the picker to manually select photos.')
    
    // Redirect to picker modal instead
    this.close()
    new PickerModal(this.app, this.plugin, this.editor, this.view).open()
  }

  async onOpen () {
    const { contentEl, modalEl } = this
    
    contentEl.createEl('h2', { text: 'Google Photos Integration Update' })
    
    const warningEl = contentEl.createEl('div', { cls: 'google-photos-warning' })
    warningEl.createEl('p', { 
      text: '⚠️ Important: Google has updated their Photos API. Date filtering and automatic "daily photos" are no longer available.' 
    })
    warningEl.createEl('p', { 
      text: 'You will now need to manually select photos through the Google Photos picker interface.' 
    })
    
    const btnContainer = contentEl.createEl('div', { cls: 'google-photos-btn-container' })
    
    const openPickerBtn = btnContainer.createEl('button', {
      text: 'Open Photo Picker',
      cls: 'mod-cta'
    })
    
    openPickerBtn.onclick = () => {
      this.close()
      new PickerModal(this.app, this.plugin, this.editor, this.view).open()
    }
    
    const cancelBtn = btnContainer.createEl('button', {
      text: 'Cancel'
    })
    
    cancelBtn.onclick = () => {
      this.close()
    }
  }
}

function lowerCaseFirstLetter (string: string) {
  return string.charAt(0).toLowerCase() + string.slice(1)
}
