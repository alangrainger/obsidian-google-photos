import { BrowserWindow } from '@electron/remote'
import { moment } from 'obsidian'
import GooglePhotos from './main'

export default class OAuth {
  plugin: GooglePhotos
  private readonly callbackUrl = 'https://localhost/google-photos'

  constructor (plugin: GooglePhotos) {
    this.plugin = plugin
  }

  async authenticate (): Promise<boolean> {
    const s = this.plugin.settings
    // First attempt to use a stored refresh token
    if (s.refreshToken) {
      console.log('Google Photos: attempting refresh token')
      if (await this.getAccessToken({
        refresh_token: s.refreshToken,
        client_id: s.clientId,
        client_secret: s.clientSecret,
        grant_type: 'refresh_token'
      })) {
        // Successfully refreshed our access
        console.log('success')
        return true
      } else {
        // Refresh token is no longer valid
        s.refreshToken = ''
      }
    }
    // If we can't refresh the access token, launch a full permissions request
    console.log('Google Photos: attempting permissions')
    return this.requestPermissions()
  }

  requestPermissions (): Promise<boolean> {
    return new Promise(resolve => {
      const codeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      codeUrl.search = new URLSearchParams({
        scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
        include_granted_scopes: 'true',
        response_type: 'code',
        access_type: 'offline',
        state: 'state_parameter_passthrough_value',
        redirect_uri: this.callbackUrl,
        client_id: this.plugin.settings.clientId
      }).toString()

      // Load the Google OAuth request page in a browser window
      const window = new BrowserWindow({
        width: 600,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        },
      })
      window.loadURL(codeUrl.href).then()

      // Set up to watch for the callback URL
      const {session: {webRequest}} = window.webContents
      const filter = {
        urls: [this.callbackUrl + '*']
      }
      webRequest.onBeforeRequest(filter, async ({url}) => {
        // Exchange the authorisation code for an access token
        const code = new URL(url).searchParams.get('code') || ''
        const res = await this.getAccessToken({
          code: code,
          client_id: this.plugin.settings.clientId,
          client_secret: this.plugin.settings.clientSecret,
          redirect_uri: this.callbackUrl,
          grant_type: 'authorization_code'
        })
        resolve(res)
        if (window) window.close()
      })

      window.on('closed', () => {
        resolve(false)
      })
    })
  }

  /**
   * Exchange an authorisation code or a refresh token for an access token
   * @param {object} params - An object of URL query parameters
   */
  async getAccessToken (params = {}): Promise<boolean> {
    const url = new URL('https://oauth2.googleapis.com/token')
    url.search = new URLSearchParams(params).toString()
    const res = await fetch(url.href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    if (res.status === 200) {
      const {access_token, refresh_token, expires_in} = await res.json()
      this.plugin.settings.accessToken = access_token
      if (refresh_token) {
        console.log('Google Photos: saving refresh token ' + refresh_token)
        this.plugin.settings.refreshToken = refresh_token
      }
      this.plugin.settings.expires = moment().add(expires_in, 'second').format()
      await this.plugin.saveSettings()
      return true
    } else {
      return false
    }
  }
}
