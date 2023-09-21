import { moment, Notice, Platform } from 'obsidian'
import GooglePhotos from './main'
import * as http from 'http'
import type { IncomingMessage, ServerResponse } from 'http'

export default class OAuth {
  plugin: GooglePhotos
  port: number
  redirectUrl: string
  httpServer: http.Server
  authUrl: string
  private readonly callbackUrl = 'https://localhost/google-photos'

  constructor (plugin: GooglePhotos) {
    this.plugin = plugin
    this.port = Math.floor(Math.random() * 15000 + 50000) // random port from 50,000-65,000
    this.redirectUrl = `http://localhost:${this.port}/google-photos`
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
    this.authUrl = url.toString()
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

  async requestPermissions (): Promise<boolean> {
    // Check to see if there is already a server running
    if (!this.httpServer) {
      this.httpServer = http
        .createServer(async (req: IncomingMessage, res: ServerResponse) => {
          console.log(req)
          const code = new URL(req.url || '').searchParams.get('code') || ''
          /* const tokenRes = await this.getAccessToken({
            code,
            client_id: this.plugin.settings.clientId,
            client_secret: this.plugin.settings.clientSecret,
            redirect_uri: this.callbackUrl,
            grant_type: 'authorization_code'
          }) */
          const tokenRes = false
          this.httpServer.close()
          resolve(tokenRes)
        })
        .listen(this.port, () => {
          this.startAuthProcess()
        })
      if (Platform.isMobile) {
        // Electron BrowserWindow is not supported on mobile:
        // https://github.com/obsidianmd/obsidian-releases/blob/master/plugin-review.md#nodejs-and-electron-api
        new Notice('You will need to authenticate using a desktop device first before you can use a mobile device.')
        resolve(false)
      } else {
        // Desktop devices only
      }
    }

    // Start the auth process
    this.startAuthProcess()
  }

  startAuthProcess () {
    window.open(this.authUrl)
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
      const { access_token, refresh_token, expires_in } = await res.json()
      this.plugin.settings.accessToken = access_token
      if (refresh_token) {
        this.plugin.settings.refreshToken = refresh_token
      }
      this.plugin.settings.expires = moment().add(token.expires_in, 'second').format()
      await this.plugin.saveSettings()
      return true
    } else {
      return false
    }
  }
}
