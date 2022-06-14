# kazagumo-spotify
## A spotify plugin for kazagumo module

## Accepted links
Track; `https://open.spotify.com/track/7nw4ElerVAP5235FN5D2OI`    
Playlist; `https://open.spotify.com/playlist/2gzszlY4WeJOTOUU6x3sgA`    
Album; `https://open.spotify.com/album/18UoCkfQKlMVnAcZXbiBz8`

## Installation
> npm i kazagumo-spotify

## Links
- Kazagumo; [npm](https://www.npmjs.com/package/kazagumo) [github](https://github.com/Takiyo0/Kazagumo)    
- Kazagumo-spotify; [npm](https://www.npmjs.com/package/kazagumo-spotify)

#### How to 
```js
const { Kazagumo } = require("kazagumo");
const Spotify = require("kazagumo-spotify");

const kazagumo = new Kazagumo({
    plugins: [
        new Spotify({
            clientId: "",
            clientSecret: ""
        })
    ]
}, new Connectors.DiscordJS(client), Nodes);

kazagumo.search(`https://open.spotify.com/track/7nw4ElerVAP5235FN5D2OI`)
```