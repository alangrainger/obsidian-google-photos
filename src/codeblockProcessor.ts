import { moment, TFile } from 'obsidian'
import GooglePhotos from './main'

export default class CodeblockProcessor {
  plugin: GooglePhotos
  source: string
  parentEl: HTMLElement
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
    
    // Create a helpful notice for all deprecated codeblock types
    this.createDeprecationNotice()
    
    if (!source) {
      return
    }
    
    if (source === 'today') {
      this.showDeprecatedFeature('"Today" photo filtering')
      return
    } else if (source === 'notedate') {
      this.showDeprecatedFeature('Note date photo filtering')
      return
    } else {
      // Attempt to parse a JSON object containing a Photos API search query
      let params = {
        query: null,
        title: null
      }
      try {
        params = JSON.parse(this.source)
        this.showDeprecatedFeature('Photo search queries')
        return
      } catch (e) {
        // Unable to parse codeblock contents
        this.showDeprecatedFeature('Photo search')
        return
      }
    }
  }

  createDeprecationNotice () {
    const noticeEl = this.parentEl.createEl('div', { cls: 'google-photos-warning' })
    noticeEl.createEl('p', { 
      text: '📋 Google Photos codeblock queries are no longer supported due to API changes.' 
    })
    noticeEl.createEl('p', { 
      text: '💡 Use the "Insert Google Photo" command instead to manually select photos via the Google Photos picker.' 
    })
  }

  showDeprecatedFeature (featureName: string) {
    this.message(`⚠️ ${featureName} is no longer supported with the new Google Photos API.`)
  }

  message (text: string) {
    this.parentEl.createEl('p', { text })
  }
}