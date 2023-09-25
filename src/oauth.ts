import { moment, Notice, Platform } from 'obsidian'
import GooglePhotos from './main'
import * as http from 'http'

export default class OAuth {
  plugin: GooglePhotos
  port = 51894
  redirectUrl: string
  httpServer: http.Server

  constructor (plugin: GooglePhotos) {
    this.plugin = plugin
    this.redirectUrl = `http://localhost:${this.port}/google-photos`
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
        return true
      } else {
        // Refresh token is no longer valid
        s.refreshToken = ''
      }
    }
    // If we can't refresh the access token, launch a full permissions request
    console.log('Google Photos: attempting permissions')
    this.requestPermissions()
    // This is an asynchronous call which is picked up by the httpServer
    // We return false here because there will no auth at this point
    return false
  }

  requestPermissions () {
    if (Platform.isMobile) {
      // Electron BrowserWindow is not supported on mobile:
      // https://github.com/obsidianmd/obsidian-releases/blob/master/plugin-review.md#nodejs-and-electron-api
      new Notice('You will need to authenticate using a desktop device first before you can use a mobile device.')
      return
    }
    // Check to see if there is already a server running
    if (!this.httpServer) {
      this.httpServer = http
        .createServer(async (req, res) => {
          if (req && req?.url?.startsWith('/google-photos')) {
            const code = new URL(this.redirectUrl + (req.url || '')).searchParams.get('code') || ''
            if (await this.processCode(code)) {
              res.end('Authentication successful! Please return to Obsidian.')
              this.httpServer.close()
            } else {
              new Notice('❌ Not able to authentication with Google Photos - please try again')
            }
          }
        })
        .listen(this.port, () => {
          this.startAuthProcess()
        })
    } else {
      // Start the auth process
      this.startAuthProcess()
    }
  }

  startAuthProcess () {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.search = new URLSearchParams({
      scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
      include_granted_scopes: 'true',
      response_type: 'code',
      access_type: 'offline',
      state: 'state_parameter_passthrough_value',
      redirect_uri: this.redirectUrl,
      client_id: this.plugin.settings.clientId
    }).toString()
    window.open(url.toString())
  }

  async processCode (code: string) {
    return this.getAccessToken({
      code,
      client_id: this.plugin.settings.clientId,
      client_secret: this.plugin.settings.clientSecret,
      redirect_uri: this.redirectUrl,
      grant_type: 'authorization_code'
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
      const tokenData = await res.json()
      this.plugin.settings.accessToken = tokenData.access_token
      if (tokenData.refresh_token) {
        this.plugin.settings.refreshToken = tokenData.refresh_token
      }
      this.plugin.settings.expires = moment().add(tokenData.expires_in, 'second').format()
      await this.plugin.saveSettings()
      return true
    } else {
      return false
    }
  }
}
