import GooglePhotos from './main'
import { GridView } from './renderer'

export function codeblockProcessor (plugin: GooglePhotos, source: string, el: HTMLElement) {
  // Process the codeblock contents
  let title = ''
  let params
  if (source.trim()) {
    try {
      params = JSON.parse(source)
      if (params.query) {
        // This is the new object format which contains additional keys for our use
        title = params.title || ''
      }
    } catch (e) {
      // Unable to parse codeblock contents - we will simply render the normal thumbnail view
    }
  }

  // Set up the Grid View object
  const grid = new GridView({
    plugin: plugin,
    title: title
  })
  grid.containerEl.addClass('google-photos-codeblock')
  // Attach to the codeblock view
  el.appendChild(grid.containerEl)

  if (params) {
    // The correct way to write the JSON is with a 'query' param containing the Google search params.
    // We fall back to sending the full object for legacy compatibility.
    grid.setSearchParams(params.query || params)
  }

  // Finally, start the thumbnails populating
  grid.getThumbnails().then()
}
