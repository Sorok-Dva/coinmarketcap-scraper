const puppeteerOpts = require('./puppeteer').puppeteerOpts
const puppeteer = require('puppeteer')
const discord = require('./discord')
const fs = require('fs')

const cookiesPath = 'data/cookies'
const balancePath = 'data/lastBalance'

const lastBalance = fs.readFileSync(balancePath)

async function screenshotDOMElement(opts = {}) {
  const padding = 'padding' in opts ? opts.padding : 0
  const path = 'path' in opts ? opts.path : null
  const selector = opts.selector

  if (!selector) throw Error('Please provide a selector.')

  const rect = await CMC.page.evaluate(selector => {
    const element = document.querySelector(selector)
    if (!element) return null
    const { x, y, width, height } = element.getBoundingClientRect()
    return { left: x, top: y, width, height, id: element.id }
  }, selector)

  if (!rect) throw Error(`Could not find element that matches selector: ${selector}.`)

  return await CMC.page.screenshot({
    path: path,
    clip: {
      x: rect.left - padding,
      y: rect.top - padding,
      width: rect.width,
      height: rect.height,
    },
  })
}

const CMC = {
  browser: null,
  page: null,
  url: 'https://accounts.coinmarketcap.com/login',
  lastBalance: isNaN(parseInt(lastBalance)) ? null : parseInt(lastBalance),
  close: async () => {
    if (!CMC.browser) return true
    await CMC.browser.close().then(async () => {
      CMC.browser = null
      console.log(`Scrap finished for ${CMC.url}`)
    })
  },
  previousSession: async () => {
    const previousSession = fs.existsSync(cookiesPath)
    if (previousSession) {
      const content = fs.readFileSync(cookiesPath)
      const cookies = JSON.parse(content || '[]')
      if (cookies.length > 0) {
        for (let cookie of cookies) await CMC.page.setCookie(cookie)
        console.log('Session has been loaded in the browser')
        return true
      }
    }

    return false
  },
  updateSession: async () => {
    const cookiesObject = await CMC.page.cookies()
    fs.writeFileSync(cookiesPath, JSON.stringify(cookiesObject))
    console.log('Session has been saved to ' + cookiesPath)
  },
  init: async () => {
    try {
      CMC.browser = await puppeteer.launch(puppeteerOpts)
      CMC.page = await CMC.browser.newPage()
      await CMC.page.goto(CMC.url, { waitUntil: 'networkidle2' })

      const title = await CMC.page.title()
      console.log(title)

      const hasPreviousSession = await CMC.previousSession()
      if (!hasPreviousSession) await CMC.login()

      await CMC.page.goto('https://coinmarketcap.com/portfolio-tracker/', { waitUntil: 'networkidle2' })
      await CMC.page.waitFor(500)
      await CMC.defineSettings()
      if (process.env.CMC_SEND_MODE === 'text') await CMC.getFundText()
      else await CMC.getFundScreenshot()
    } catch (e) {
      console.error('[INIT] Failed', e)
    } finally {
      await CMC.updateSession()
      await CMC.close()
    }
  },
  login: async () => {
    try {
      await CMC.page
        .type('input[type="email"]', process.env.CMC_LOGIN, { delay: 25 })
        .then(async () => console.log('Username complete'))
      await CMC.page.waitFor(500)
      await CMC.page
        .type('input[type="password"]', process.env.CMC_PASS, { delay: 25 })
        .then(async () => console.log('Password complete'))
      await CMC.page.waitFor(100)
      await CMC.page.click('button.ekKQHW')
      await CMC.page.waitFor('body.DAY')
      console.log('connected')
    } catch (e) {
      console.error('[login] Error', e)
      await CMC.close()
    }
  },
  defineSettings: async () => {
    const cookies = [{
      'name': 'currency',
      'value': process.env.CMC_CURRENCY,
    }, {
      'name': 'cmc-theme',
      'value': process.env.CMC_LIGHTMODE,
    }, {
      'name': 'cmc_gdpr_hide',
      'value': '1',
    }]

    await CMC.page.setCookie(...cookies)
    await CMC.page.goto('https://coinmarketcap.com/portfolio-tracker/', { waitUntil: 'networkidle2' })
  },
  getFundScreenshot: async () => {
    try {
      // define time range settings
      await CMC.page.evaluate((timerange) => document.getElementsByClassName('kpCnDw')[0].childNodes[timerange].click(), Number(process.env.CMC_TIMERANGE))
      await CMC.page.waitFor(45000) // recalculation make take long time.
      await screenshotDOMElement({
        path: 'CMCDayFund.png',
        selector: '.lktzEZ',
        padding: 2,
      })
      discord('', 'CMCDayFund.png')
    } catch (e) {
      console.error('[getFundScreenshot] Error', e)
      await CMC.close()
    }
  },
  getFundText: async () => {
    try {
      const balance = await CMC.page.evaluate(() => document.getElementsByClassName('price___3rj7O')[0].innerText)
      const currencySplit = balance.replace(',', '').split(/[-+]?[0-9]*\.?[0-9]/)
      const currencySign = currencySplit.filter(sign => sign !== '')[0]
      let old = CMC.lastBalance || 0
      CMC.lastBalance = parseFloat(
        balance
          .replace(/€|\$|£|BTC|R\$|Fr|¥|Kč|₽/g, '')
          .replace(',', ''),
      )
      fs.writeFileSync(balancePath, JSON.stringify(CMC.lastBalance))

      let diff = old - CMC.lastBalance
      let sign = Math.sign(diff) === 1 || 0 ? '-' : '+'
      let diffTxt = old ? `_(**${sign}**${diff.toFixed(2).replace('-', '')} ${currencySign})_` : ''

      discord(`${process.env.CMC_DISCORD_MSG} **${balance}** ${diffTxt}`)
    } catch (e) {
      console.error('[getFundText] Error', e)
      await CMC.close()
    }
  },
}

module.exports = CMC
