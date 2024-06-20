import { SuggestModal } from 'obsidian'
import GooglePhotos from '../main'
import PhotosApi, { GooglePhotosAlbum } from '../photosApi'

type Callback = (albumData: GooglePhotosAlbum) => void

export default class AlbumSuggest extends SuggestModal<unknown> {
  plugin: GooglePhotos
  callback: Callback

  constructor (plugin: GooglePhotos) {
    super(plugin.app)
    this.plugin = plugin
    this.setPlaceholder('Please wait, loading list of albums...')
  }

  show (callback: Callback) {
    this.callback = callback
    super.open()
  }

  async getSuggestions (): Promise<GooglePhotosAlbum[]> {
    let albums: GooglePhotosAlbum[] = []
    try {
      const photosApi = new PhotosApi(this.plugin)
      const result = await photosApi.listAlbums()
      albums = result.albums
    } catch (e) {
      console.log(e)
    }
    this.setPlaceholder('')
    return albums
  }

  renderSuggestion (item: GooglePhotosAlbum, el: HTMLElement) {
    // If this is a shared album, add some extra text to identify it in the list
    const sharedAlbum = item.isSharedAlbum ? ' - 👥 shared album' : ''
    el.setText(item.title + sharedAlbum)
  }

  onChooseSuggestion (item: GooglePhotosAlbum) {
    // Send the chosen album to the callback function
    this.callback(item)
  }
}
