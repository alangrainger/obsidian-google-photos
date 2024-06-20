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
  method?: string,
  body?: string,
  filters?: {
    dateFilter?: GooglePhotosDateFilter
  }
}

export type GooglePhotosAlbum = {
  id: string,
  title: string,
  productUrl: string,
  isWriteable: boolean,
  isSharedAlbum?: boolean,
  mediaItemsCount: string,
  coverPhotoBaseUrl: string,
  coverPhotoMediaItemId: string
}

export type GooglePhotosAlbumSearch = {
  albums: GooglePhotosAlbum[],
  sharedAlbums: GooglePhotosAlbum[],
  nextPageToken: string
}

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

export type GooglePhotosMediaItemsSearch = {
  mediaItems: GooglePhotosMediaItem[],
  nextPageToken: string
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
  async request (endpoint: string, params: GooglePhotosSearchParams = {}): Promise<object> {
    // Check to make sure we have a valid access token
    const s = this.plugin.settings
    if (!s.accessToken || moment() > moment(s.expires)) {
      if (!await this.plugin.oauth.authenticate()) {
        throw new Error('Unauthenticated')
      }
    }

    // Make the authenticated request to Photos API
    const resp = await fetch(
      'https://photoslibrary.googleapis.com' + endpoint,
      Object.assign({
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + s.accessToken,
          'Content-Type': 'application/json'
        }
      }, params))
    if (resp.status === 200) {
      return resp.json()
    } else if (resp.status === 400) { // Malformed input
      throw new Error('⚠ Malformed input. Please check the filters you are using.')
    } else if (resp.status === 401) { // Unauthenticated
      if (await this.plugin.oauth.authenticate()) {
        throw new Error('Retry')
      } else {
        throw new Error('Unauthenticated')
      }
    } else {
      throw new Error('Unknown status ' + resp.status)
    }
  }

  /**
   * Perform a mediaItems search
   * https://developers.google.com/photos/library/reference/rest/v1/mediaItems/search
   *
   * @param {object} options
   * @returns {Promise<GooglePhotosMediaItemsSearch>}
   */
  async mediaItemsSearch (options: object = {}): Promise<GooglePhotosMediaItemsSearch> {
    return await this.request('/v1/mediaItems:search', {
      method: 'POST',
      body: JSON.stringify(options)
    }) as unknown as GooglePhotosMediaItemsSearch
  }

  async listAlbums (): Promise<GooglePhotosAlbumSearch> {
    // Get the user's own albums
    const albums = await this.request('/v1/albums?pageSize=50', {
      method: 'GET'
    }) as unknown as GooglePhotosAlbumSearch

    // Get shared albums. This includes BOTH albums owned by the user which have been shared with others,
    // and also albums owned by others which have been shared to this user.
    const sharedAlbums = await this.request('/v1/sharedAlbums?pageSize=50', {
      method: 'GET'
    }) as unknown as GooglePhotosAlbumSearch
    if (sharedAlbums?.sharedAlbums) {
      for (const sharedAlbum of sharedAlbums.sharedAlbums) {
        // Check to see if this album is already present in the normal albums list
        // (i.e. it is an album created by the user)
        if (sharedAlbum.title && !albums.albums.find(album => album.id === sharedAlbum.id)) {
          // Add it to the albums list
          sharedAlbum.isSharedAlbum = true
          albums.albums.push(sharedAlbum)
        }
      }
    }

    return albums
  }
}

export function dateToGoogleDateFilter (date: moment.Moment) {
  return {
    year: +date.format('YYYY') || 0,
    month: +date.format('M') || 0,
    day: +date.format('D') || 0
  }
}
