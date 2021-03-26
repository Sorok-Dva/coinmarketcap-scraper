<p style="text-align: center; margin: 20px auto;">
  <img src="https://s2.coinmarketcap.com/static/cloud/img/coinmarketcap_1.svg" width="150px" /> <b>CoinMarketCap Scraper</b>
</p>

# CoinMarketCap Scraper

## Description
This application is a scraper built with puppeteer that will send on discord your crypto assets balance with screenshot or simply with text.

It is highly recommended using this app under a process manager like pm2, as it become a background process that will run on your server.
If you don't have a dedicated server that is always on, consider using [Heroku](https://www.heroku.com/).

### Prerequisites

- `node` >= 11
- `npm`
- `pm2`

### Quickstart

```
npm install
cp .env.sample .env
pm2 start app.js --name "CoinMarketCapScraper"
```

### Env file

Before running for the first time, you need to fill your `.env` file with your own values.

```dotenv
CHROME_PATH=/usr/bin/chromium-browser
DISCORD_WEBHOOK_ID=
DISCORD_WEBHOOK_TOKEN=
CMC_LOGIN=email
CMC_PASS=password
CMC_DISCORD_MSG="Today Crypto Assets Balance :"
CMC_CRONJOB="44 11 * * *"
CMC_SEND_MODE="screenshot"
CMC_CURRENCY="EUR"
CMC_LIGHTMODE="night"
CMC_TIMERANGE=0
```

- **CHROME_PATH**: The path to a chromium browser used by puppeteer
- **DISCORD_WEBHOOK_ID**: The discord webhook ID used to send crypto assets balance on your discord server *(More info on [Discord Support](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks))*
- **DISCORD_WEBHOOK_TOKEN**: The discord webhook TOKEN used to send crypto assets balance on your discord server
- **CMC_LOGIN**: Your email of your CoinMarketCap account
- **CMC_PASS**: Your password of your CoinMarketCap account
- **CMC_DISCORD_MSG**: The specific message to send before the text balance, working only if `CMC_SEND_MODE=text`
- **CMC_CRONJOB**: The cronjob rule on you want to retrieve your crypto assets balance. By default, the cronjob rule is set at `11 PM 44 every day`. *(More info on [Crontab.guru](https://crontab.guru/))*
- **CMC_SEND_MODE**: Which format to use to send balance on discord. `text` or `screenshot` _1_
- **CMC_CURRENCY**: Currency to use (default to `EUR`)
- **CMC_LIGHTMODE**: Website theme to use for the screenshot (`day` or `night`)
- **CMC_TIMERANGE**: Time range to use for the screenshot. `0` = 24h | `1` = 7d | `2` = 30d | `3` = 90d | `4` = All.

 _1_ : If you set the `CMC_SEND_MODE` to `text`, you'll have a diff with the previous captured balance. Maybe useful for automatic short time range scraping. See examples.

### Examples

#### Default Text Mode
<p style="text-align: center; margin: 20px auto;">
  <img src="/doc/default-text-mode.jpg" />
</p>

#### Text Mode with short time range (every minute (CMC_CRONJOB="*/1 * * * *")) 
<p style="text-align: center; margin: 20px auto;">
  <img src="/doc/custom-text-mode.jpg" />
</p>

#### Default Screenshot Mode (Night theme, Eur, 24h)
<p style="text-align: center; margin: 20px auto;">
  <img src="/doc/default-screenshot-mode.jpg" />
</p>

#### Screenshot mode with custom settings (Day theme, USD, 90d)
<p style="text-align: center; margin: 20px auto;">
  <img src="/doc/custom-screenshot-mode.jpg" />
</p>
