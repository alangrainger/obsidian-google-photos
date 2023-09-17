import { moment } from 'obsidian'
import GooglePhotos from './main'

export default class OAuth {
  plugin: GooglePhotos
  private readonly callbackUrl = 'https://alangrainger.github.io/obsidian-google-auth-proxy/?handler=google-photos'

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

      window.open(codeUrl.href)
    })
  }

  async sendCode (code: string) {
    await this.getAccessToken({
      code,
      client_id: this.plugin.settings.clientId,
      client_secret: this.plugin.settings.clientSecret,
      redirect_uri: this.callbackUrl,
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
