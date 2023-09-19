import { moment, requestUrl } from 'obsidian'
import GooglePhotos from './main'

const serviceUrl = 'https://google-auth.obsidianshare.com'

interface AccessTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export default class OAuth {
  plugin: GooglePhotos

  constructor (plugin: GooglePhotos) {
    this.plugin = plugin
  }

  async authenticate (): Promise<boolean> {
    const s = this.plugin.settings
    // First attempt to use a stored refresh token
    if (s.refreshToken) {
      console.log('Google Photos: attempting refresh token')
      if (await this.refreshToken()) {
        // Successfully refreshed our access
        console.log('success')
        return true
      } else {
        // Refresh token is no longer valid
        s.refreshToken = ''
        await this.plugin.saveSettings()
      }
    }
    // If we can't refresh the access token, launch a full permissions request
    console.log('Google Photos: attempting permissions')
    this.requestCode()
    // This is an asynchronous call which is picked up by an Obsidian protocol handler
    // We return false here because there will no auth at this point
    return false
  }

  /**
   * This function works asynchronously and receives the result via an Obsidian Protocol Handler.
   * The result is picked up in the handler and set to getAccessToken()
   */
  requestCode (): void {
    const codeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    codeUrl.search = new URLSearchParams({
      scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
      include_granted_scopes: 'true',
      response_type: 'code',
      access_type: 'offline',
      state: 'state_parameter_passthrough_value',
      redirect_uri: 'https://google-auth.obsidianshare.com',
      client_id: '257180575925-p643qmm39evc9vd6i2k2lbcprcgr6ipa.apps.googleusercontent.com'
    }).toString()
    window.open(codeUrl.href)
  }

  /**
   * Exchange an authorisation code for an access token
   */
  async getAccessToken (code: string): Promise<boolean> {
    const res = await requestUrl({
      url: serviceUrl,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getAccessToken',
        code
      })
    })
    if (res.status === 200) {
      await this.saveToken(res.json)
      return true
    }
    return false
  }

  /**
   * Exchange a refresh token for a fresh access token
   */
  async refreshToken () {
    const res = await requestUrl({
      url: serviceUrl,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'refreshToken',
        refreshToken: this.plugin.settings.refreshToken
      })
    })
    if (res.status === 200) {
      await this.saveToken(res.json)
      return true
    }
    return false
  }

  /**
   * Save the token result returned from the Google Auth proxy
   * @param data
   */
  async saveToken (data: AccessTokenResult) {
    this.plugin.settings.accessToken = data.accessToken
    if (data.refreshToken) {
      this.plugin.settings.refreshToken = data.refreshToken
    }
    this.plugin.settings.expires = moment().add(data.expiresIn, 'second').format()
    await this.plugin.saveSettings()
  }
}
