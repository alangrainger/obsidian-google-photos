# Authentication troubleshooting

## `localhost` connection refused

After attempting the initial connection to Google Photos API, your browser will be redirected to an address like:

```text
http://localhost:51894/google-photos?state=state_parameter_passthrough_value&code=d35fEac9&scope=https://www.googleapis.com/auth/photoslibrary.readonly
```

Instead of redirecting you back to Obsidian, you might see an error message like this:

> Unable to connect
> 
> **localhost** refused to connect
> 
> ERR_CONNECTION_REFUSED

In this case, there is a workaround:

Change the URL in your browser to replace `http://localhost:51894/` with `obsidian://`, so that the final result looks similar to:

```text
obsidian://google-photos?state=state_parameter_passthrough_value&code=d35fEac9&scope=https://www.googleapis.com/auth/photoslibrary.readonly
```

Press Enter to go to that URL, and Obsidian should launch and complete the authentication process.
