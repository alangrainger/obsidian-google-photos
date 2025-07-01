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
      // Show a message that this feature is no longer available
      this.message('⚠️ "Today" photo filtering is no longer supported with the new Google Photos API. Please use the photo picker to manually select photos.')
      this.createPickerButton()
      return
    } else if (source === 'notedate') {
      // Show a message that this feature is no longer available
      this.message('⚠️ Note date photo filtering is no longer supported with the new Google Photos API. Please use the photo picker to manually select photos.')
      this.createPickerButton()
      return
    } else {
      // Attempt to parse a JSON object containing a Photos API search query
      let params = {
        query: null,
        title: null
      }
      try {
        params = JSON.parse(this.source)
      } catch (e) {
        // Unable to parse codeblock contents
        console.log(e)
        this.message('⚠️ Unable to parse codeblock contents. Photo search is no longer supported with the new Google Photos API.')
        this.createPickerButton()
        return
      }
      if (params.query) {
        // This is the new object format which contains additional keys for our use
        this.title = params.title || ''
        this.message('⚠️ Photo search and album display is no longer supported with the new Google Photos API. Please use the photo picker to manually select photos.')
        this.createPickerButton()
        return
      } else {
        // The correct way to write the JSON is with a 'query' param containing the Google search params.
        // We fall back to using the full object for legacy compatibility.
        this.message('⚠️ Photo search is no longer supported with the new Google Photos API. Please use the photo picker to manually select photos.')
        this.createPickerButton()
        return
      }
    }
  }

  createPickerButton () {
    const buttonEl = this.parentEl.createEl('button', {
      text: 'Open Photo Picker',
      cls: 'mod-cta google-photos-picker-btn'
    })
    
    buttonEl.onclick = () => {
      // We'll need to import PickerModal here, but for now let's use a workaround
      // This would normally trigger the picker modal
      console.log('Photo picker button clicked - this would open the picker modal')
      // TODO: Implement picker modal trigger from codeblock
    }
  }

  createGrid () {
    // This method is no longer used with the Picker API
    this.message('⚠️ Grid view is no longer supported with the new Google Photos API.')
  }

  message (text: string) {
    this.parentEl.createEl('p', { text })
  }
}