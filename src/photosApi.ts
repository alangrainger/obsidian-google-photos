import { moment } from 'obsidian'
import GooglePhotos from './main'

export type GooglePhotosDate = {
  year: number;
  month: number;
  day: number;
}

// https://developers.google.com/photos/library/reference/rest/v1/mediaItems/search#DateFilter
export type GooglePhotosDateFilter = {
  dates?: Array<GooglePhotosDate>;
  ranges?: {
    startDate: GooglePhotosDate;
    endDate: GooglePhotosDate;
  }
}

export type GooglePhotosSearchParams = {
  filters?: {
    dateFilter?: GooglePhotosDateFilter 
  }
}

export default class PhotosApi {
  plugin: GooglePhotos

  constructor (plugin: GooglePhotos) {
    this.plugin = plugin
  }

  /**
   * Make an authenticated request to Google Photos API
   *
   * @param {string} endpoint - Endpoint including the API version: '/v1' etc
   * @param {object} [params] - Optional parameters
   * @returns {Promise<object>}
   *
   * @throws Will throw an error if the input is malformed, or if the user is not authenticated
   */
  async request (endpoint: string, params: GooglePhotosSearchParams = {}) {
    // Check to make sure we have a valid access token
    const s = this.plugin.settings
    if (!s.accessToken || moment() > moment(s.expires)) {
      if (!await this.plugin.oauth.authenticate()) {
        throw 'Unauthenticated'
      }
    }

    // Make the authenticated request to Photos API
    const resp = await fetch(
      'https://photoslibrary.googleapis.com' + endpoint,
      Object.assign({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + s.accessToken,
          'Content-Type': 'application/json'
        }
      }, params))
    if (resp.status === 200) {
      return resp.json()
    } else if (resp.status === 400) { // Malformed input
      throw '⚠ Malformed input. Please check the filters you are using.'
    } else if (resp.status === 401) { // Unauthenticated
      if (await this.plugin.oauth.authenticate()) {
        throw 'Retry'
      } else {
        throw 'Unauthenticated'
      }
    } else {
      throw 'Unknown status ' + resp.status
    }
  }

  /**
   * Perform a mediaItems search
   * https://developers.google.com/photos/library/reference/rest/v1/mediaItems/search
   *
   * @param {object} options
   * @returns {Promise<object>}
   */
  async mediaItemsSearch (options = {}) {
    return this.request('/v1/mediaItems:search', {
      method: 'POST',
      body: JSON.stringify(options)
    })
  }
  async listAlbums () {
    return this.request('/v1/albums', {
      method: 'GET'
    })
  }
}
