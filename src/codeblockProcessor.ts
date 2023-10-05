import { moment, TFile } from 'obsidian'
import GooglePhotos from './main'
import { GridView } from './renderer'
import { dateToGoogleDateFilter } from './photosApi'

export default class CodeblockProcessor {
  plugin: GooglePhotos
  source: string
  parentEl: HTMLElement
  title: string
  searchParams: object
  note: TFile
  noteDate: moment.Moment

  constructor (plugin: GooglePhotos, source: string, parentEl: HTMLElement, file: TFile) {
    this.plugin = plugin
    this.source = source
    this.parentEl = parentEl
    this.note = file

    this.noteDate = plugin.getNoteDate(file)
    this.parseContents()
  }

  parseContents () {
    // Process the codeblock contents
    const source = this.source.trim()
    if (!source) {
      return
    }
    if (source === 'today') {
      // Show a gallery of today's notes
      this.searchParams = {
        filters: {
          dateFilter: {
            dates: [dateToGoogleDateFilter(moment())]
          }
        }
      }
    } else if (source === 'notedate') {
      // Show a gallery of photos taken on the current note date
      if (this.noteDate.isValid()) {
        this.searchParams = {
          filters: {
            dateFilter: {
              dates: [dateToGoogleDateFilter(this.noteDate)]
            }
          }
        }
      } else {
        this.message('Unable to find a valid date for today\'s note. Double-check that you have the correct format in "Title date format" in the plugin settings.')
        return
      }
    } else {
      // Attempt to parse a JSON object containing a Photos API search query
      let params = {
        query: null,
        title: null
      }
      try {
        params = JSON.parse(this.source)
      } catch (e) {
        // Unable to parse codeblock contents - the API will return a 'malformed input' message
        console.log(e)
      }
      if (params.query) {
        // This is the new object format which contains additional keys for our use
        this.title = params.title || ''
        this.searchParams = params.query
      } else {
        // The correct way to write the JSON is with a 'query' param containing the Google search params.
        // We fall back to using the full object for legacy compatibility.
        this.searchParams = params
      }
    }
    this.createGrid()
  }

  createGrid () {
    // Set up the Grid View object
    const grid = new GridView({
      plugin: this.plugin,
      title: this.title
    })
    grid.containerEl.addClass('google-photos-codeblock')
    // Attach to the codeblock view
    this.parentEl.appendChild(grid.containerEl)

    if (this.searchParams) {
      grid.setSearchParams(this.searchParams)
    }

    // Finally, start the thumbnails populating
    grid.getThumbnails().then()
  }

  message (text: string) {
    this.parentEl.createEl('p', { text })
  }
}