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

type GooglePhotosPickingSession = {
  id: string,
  pickerUri: string,
  expireTime: string,
  mediaItemsSet: boolean
}

enum MediaType {
  TYPE_UNSPECIFIED,
  PHOTO,
  VIDEO
}

type GooglePhotosPickedMediaItem = {
  id: string,
  createTime: string,
  type: MediaType,
  mediaFile: GooglePhotosMediaItem
}

export type GooglePhotosMediaItemsSearch = {
  mediaItems: GooglePhotosPickedMediaItem[],
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
   * @param endpoint - Endpoint including the API version: '/v1' etc
   * @param [params] - Optional parameters
   *
   * @throws Will throw an error if the input is malformed, or if the user is not authenticated
   */
  async request (endpoint: string, params: RequestInit = {}) {
    // Check to make sure we have a valid access token
    const s = this.plugin.settings
    if (!s.accessToken || moment() > moment(s.expires)) {
      if (!await this.plugin.oauth.authenticate()) {
        throw new Error('Unauthenticated')
      }
    }

    // Make the authenticated request to Photos API
    const resp = await fetch(
      'https://photospicker.googleapis.com' + endpoint,
      Object.assign({
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
      console.log(await resp.text())
      throw new Error('Unknown status ' + resp.status)
    }
  }

  async createSession () {
    const session = await this.request('/v1/sessions') as unknown as GooglePhotosPickingSession
    // Open web picker
    window.open(session.pickerUri, '_blank')
    // Wait max 10 minutes for the session to complete (5 second blocks)
    for (let i = 0; i < 120; i++) {
      // Check to see if the session has completed
      const res = await this.getSession(session.id)
      if (res.mediaItemsSet) {
        const items = await this.getMediaItems(session.id)
        console.log(items)
        break
      }
      // Wait 5 seconds
      await new Promise(resolve => { setTimeout(resolve, 5000) })
    }
  }

  async getSession (id: string) {
    return await this.request('/v1/sessions/' + id, { method: 'GET' }) as unknown as GooglePhotosPickingSession
  }

  async getMediaItems (sessionId: string) {
    return await this.request('/v1/mediaItems?sessionId=' + sessionId, { method: 'GET' }) as unknown as GooglePhotosMediaItemsSearch
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
