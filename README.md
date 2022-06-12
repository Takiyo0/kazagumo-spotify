# kazagumo-spotify
#### A spotify plugin for kazagumo module

#### How to install
> npm i kazagumo-spotify

#### How to use
> const { Kazagumo } = require("kazagumo");
> const Spotify = require("kazagumo-spotify");
> 
> const kazagumo = new Kazagumo({
>     plugins: [
>         new Spotify({
>             clientId: "",
>             clientSecret: ""
>         })
>     ]
> }, new Connectors.DiscordJS(client), Nodes);