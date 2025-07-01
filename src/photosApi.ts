import { moment } from 'obsidian'
import GooglePhotos from './main'

export type GooglePhotosMediaItem = {
  id: string,
  description: string,
  productUrl: string,
  baseUrl: string,
  mimeType: string,
  mediaMetadata: {
    creationTime: string
  },
  filename: string
}

// Picker API types
export type PickerSession = {
  id: string,
  pickerUri: string,
  pollingConfig: {
    pollInterval: string,
    timeoutIn: string
  },
  mediaItemsSet: boolean
}

export type PickedMediaItem = {
  id: string,
  mediaFile: {
    baseUrl: string,
    mimeType: string,
    filename: string
  },
  description?: string,
  mediaMetadata?: {
    creationTime: string
  }
}

export type PickedMediaItemsResponse = {
  mediaItems: PickedMediaItem[],
  nextPageToken?: string
}

export default class PhotosApi {
  plugin: GooglePhotos

  constructor (plugin: GooglePhotos) {
    this.plugin = plugin
  }

  /**
   * Make an authenticated request to Google Photos Picker API
   *
   * @param {string} endpoint - Endpoint including the API version: '/v1' etc
   * @param {object} [params] - Optional parameters
   * @returns {Promise<object>}
   *
   * @throws Will throw an error if the input is malformed, or if the user is not authenticated
   */
  async request (endpoint: string, params: any = {}): Promise<object> {
    // Check to make sure we have a valid access token
    const s = this.plugin.settings
    if (!s.accessToken || moment() > moment(s.expires)) {
      if (!await this.plugin.oauth.authenticate()) {
        throw new Error('Unauthenticated')
      }
    }

    console.log(`Making request to: https://photospicker.googleapis.com${endpoint}`)
    console.log('Request params:', params)

    // Make the authenticated request to Photos Picker API
    const resp = await fetch(
      'https://photospicker.googleapis.com' + endpoint,
      Object.assign({
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + s.accessToken,
          'Content-Type': 'application/json'
        }
      }, params))
      
    console.log(`Response status: ${resp.status}`)
    
    if (resp.status === 200) {
      const data = await resp.json()
      console.log('Response data:', data)
      return data
    } else if (resp.status === 400) { // Malformed input
      const errorText = await resp.text()
      console.error('400 error response:', errorText)
      throw new Error('⚠ Malformed input. Please check the request.')
    } else if (resp.status === 401) { // Unauthenticated
      console.log('401 error - attempting re-authentication')
      if (await this.plugin.oauth.authenticate()) {
        throw new Error('Retry')
      } else {
        throw new Error('Unauthenticated')
      }
    } else if (resp.status === 403) { // Permission denied
      const errorText = await resp.text()
      console.error('403 error response:', errorText)
      throw new Error('Permission denied. Please re-authenticate with Google Photos.')
    } else {
      const errorText = await resp.text()
      console.error(`${resp.status} error response:`, errorText)
      throw new Error('Unknown status ' + resp.status)
    }
  }

  /**
   * Create a new picker session
   * @returns {Promise<PickerSession>}
   */
  async createSession (): Promise<PickerSession> {
    console.log('Creating new picker session...')
    return await this.request('/v1/sessions', {
      method: 'POST',
      body: JSON.stringify({}) // Empty body for session creation
    }) as PickerSession
  }

  /**
   * Get session status
   * @param {string} sessionId
   * @returns {Promise<PickerSession>}
   */
  async getSession (sessionId: string): Promise<PickerSession> {
    console.log(`Getting session status for: ${sessionId}`)
    return await this.request(`/v1/sessions/${sessionId}`) as PickerSession
  }

  /**
   * List picked media items from a session
   * @param {string} sessionId
   * @param {string} [pageToken]
   * @returns {Promise<PickedMediaItemsResponse>}
   */
  async listPickedMediaItems (sessionId: string, pageToken?: string): Promise<PickedMediaItemsResponse> {
    console.log(`Listing picked media items for session: ${sessionId}`)
    let url = `/v1/mediaItems?sessionId=${sessionId}`
    if (pageToken) {
      url += `&pageToken=${pageToken}`
    }
    return await this.request(url) as PickedMediaItemsResponse
  }

  /**
   * Delete a session (cleanup)
   * @param {string} sessionId
   */
  async deleteSession (sessionId: string): Promise<void> {
    console.log(`Deleting session: ${sessionId}`)
    await this.request(`/v1/sessions/${sessionId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Convert PickedMediaItem to GooglePhotosMediaItem for compatibility
   * @param {any} pickedItem - Using any since API structure may vary
   * @returns {GooglePhotosMediaItem}
   */
  convertPickedMediaItem (pickedItem: any): GooglePhotosMediaItem {
    console.log('Converting picked media item:', pickedItem)
    
    // Handle different possible structures from the API
    const baseUrl = pickedItem.mediaFile?.baseUrl || pickedItem.baseUrl || ''
    const mimeType = pickedItem.mediaFile?.mimeType || pickedItem.mimeType || 'image/jpeg'
    const filename = pickedItem.mediaFile?.filename || pickedItem.filename || `photo-${pickedItem.id}.jpg`
    
    const converted = {
      id: pickedItem.id,
      description: pickedItem.description || '',
      productUrl: '', // Not available in Picker API
      baseUrl: baseUrl,
      mimeType: mimeType,
      mediaMetadata: {
        creationTime: pickedItem.mediaMetadata?.creationTime || moment().toISOString()
      },
      filename: filename
    }
    
    console.log('Converted media item:', converted)
    return converted
  }
}
