import { GridView } from './renderer'

export function codeblockProcessor (source: string, el: HTMLElement) {
  const grid = new GridView({plugin: this})
  el.appendChild(grid.containerEl)
  grid.containerEl.addClass('google-photos-codeblock')
  try {
    if (source.trim()) grid.setSearchParams(JSON.parse(source))
  } catch (e) {
    // unable to parse source block
  }
  grid.getThumbnails().then()
}
