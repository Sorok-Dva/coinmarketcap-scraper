// TODO Discord commands bot to change parameters (e.g currency) and define custom time range execution (should be stream !)
const puppeteerOpts = require('./puppeteer').puppeteerOpts
const puppeteer = require('puppeteer')
const discord = require('./discord')
const fs = require('fs')

const cookiesPath = 'data/cookies'
const localStoragePath = 'data/storage'
const balancePath = 'data/balance.json'

const screenshotDOMElement = async (opts = {}) => {
  const element = await CMC.page.$(opts.selector)
  const box = await element.boundingBox()
  const x = box['x']
  const y = box['y']
  const w = box['width'] + 15
  const h = box['height']
  await element.screenshot({ path: opts.path, 'clip': {'x': x, 'y': y, 'width': w, 'height': h} });
}

const CMC = {
  browser: null,
  page: null,
  url: 'https://coinmarketcap.com/portfolio-tracker/',
  lastBalance: JSON.parse(fs.readFileSync(balancePath, 'utf-8')),
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
    await CMC.page.reload()
    return false
  },
  updateSession: async () => {
    const cookiesObject = await CMC.page.cookies()
    fs.writeFileSync(cookiesPath, JSON.stringify(cookiesObject))
    console.log('Session has been saved to ' + cookiesPath)
  },
  close: async () => {
    if (!CMC.browser) return true
    await CMC.browser.close().then(async () => {
      CMC.browser = null
      console.log(`Scrap finished for ${CMC.url}`)
    })
  },
  init: async () => {
    try {
      CMC.browser = await puppeteer.launch(puppeteerOpts)
      CMC.page = (await CMC.browser.pages())[0]
      await CMC.page.setViewport({ width: 1900, height: 1000, deviceScaleFactor: 1 })
      await CMC.page.goto(CMC.url, { waitUntil: 'networkidle0' })
      const title = await CMC.page.title()
      console.log(title)

      await CMC.defineSettings()
      await CMC.initSession('Log In')
      await CMC.page.waitForTimeout(5000) // new changes on CMC show the homepage for few ms
      if (process.env.CMC_SEND_MODE === 'text') await CMC.getFundText()
      else if (process.env.CMC_SEND_MODE === 'true') await CMC.getAssetsScreenshot()
      else await CMC.getFundScreenshot()
    } catch (e) {
      console.error('[INIT] Failed', e)
    } finally {
      fs.writeFileSync(balancePath, JSON.stringify(CMC.lastBalance))
      await CMC.updateSession()
      await CMC.close()
    }
  },
  initSession: async (text) => {
    console.log('initSession')
    const hasPreviousSession = await CMC.previousSession()
    if (!hasPreviousSession) await CMC.popupLogin(text)

    const localStorageData = fs.readFileSync(localStoragePath, 'utf8')
    const ls = JSON.parse(localStorageData || '[{"u": "undefined"}]')
    await CMC.page.evaluate((ls) => {
      console.log('set storage')
      localStorage.clear()
      localStorage.setItem('u', JSON.stringify(ls))
    }, ls);
    await CMC.page.reload()
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
  },
  completLoginForm: async () => {
    await CMC.page
      .type('input[type="email"]', process.env.CMC_LOGIN, { delay: 25 })
      .then(async () => console.info('Username complete'))
    await CMC.page.waitForTimeout(500)
    await CMC.page
      .type('input[type="password"]', process.env.CMC_PASS, { delay: 25 })
      .then(async () => console.info('Password complete'))
    await CMC.page.waitForTimeout(2000)
  },
  popupLogin: async (text) => {
    try {
      const [button] = await CMC.page.$x(`//button[contains(., '${text}')]`);
      if (button) {
        await button.click()
        await CMC.page.waitForSelector('input[type="email"]')
        await CMC.completLoginForm()
        await CMC.page.keyboard.press('Enter')
        await CMC.page.waitForFunction(
          'document.querySelector("body").innerText.includes("You have successfully logged in!")'
        )
      }
      console.info('connected')
    } catch (e) {
      console.error('[login] Error', e)
      await CMC.close()
    }
  },
  deleteLeftNode: async () => {
    const xpath = "//span[contains(text(),'My Main Portfolio')]";
    await CMC.page.evaluate(xpath => {
      const node = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue
        .parentNode.parentNode.parentNode.parentNode.parentNode
        .parentNode.parentNode.parentNode.parentNode // 😯 lot of parentNode, should find another way
      node.remove()
    }, xpath)
  },
  getFundScreenshot: async () => {
    try {
      // todo retrieve text funds to save into lastbalance
      // define time range settings
      const [timeRange] = await CMC.page.$x(`//span[contains(., '${process.env.CMC_TIMERANGE}')]`);
      if (timeRange) {
        await timeRange.click()
        await CMC.page.waitForFunction(() => document.querySelector("body").innerText.includes("Recalculating") === false)
      }
      const time = new Date()
      const timeString = `${time.getDate()}-${time.getMonth()}-${time.getFullYear()}`
      const filname = `data/screenshots/CMC_Result_${timeString}.png`
      const xpath = "//span[contains(text(),'Current Balance')]";
      const nodeClasses = await CMC.page.evaluate(xpath => {
        return document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue.parentNode.parentNode.parentNode.classList
      }, xpath)
      const selector = `.${nodeClasses[1]}` // first element seems to be generic and used in other places
      await screenshotDOMElement({
        path: filname,
        selector,
      })
      await discord('', filname)
    } catch (e) {
      console.error('[getFundScreenshot] Error', e)
      await CMC.close()
    }
  },
  getAssetsScreenshot: async () => {
    try {
      await CMC.deleteLeftNode()
      await CMC.page.waitForTimeout(2500)
      const time = new Date()
      const timeString = `${time.getDate()}-${time.getMonth()}-${time.getFullYear()}`
      const filname = `data/screenshots/CMC_Assets_${timeString}.png`
      const xpath = "//p[contains(text(),'Your Assets')]";
      const nodeClasses = await CMC.page.evaluate(xpath => {
        return document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue.parentNode.parentNode.classList
      }, xpath)
      const selector = `.${nodeClasses[0]}`
      await screenshotDOMElement({
        path: filname,
        selector,
      })
      await discord('', filname)
    } catch (e) {
      console.error('[getFundScreenshot] Error', e)
      await CMC.close()
    }
  },
  getFundText: async () => {
    try {
      const [timeRange] = await CMC.page.$x(`//span[contains(., '${process.env.CMC_TIMERANGE}')]`);
      if (timeRange) {
        await timeRange.click()
        await CMC.page.waitForFunction(() => document.querySelector("body").innerText.includes("Recalculating") === false)
      }
      const balance = await CMC.page.evaluate(() => document.getElementsByClassName('sc-9p9hwv-0')[0].innerText)
      const currencySplit = balance.replace(',', '').split(/[-+]?[0-9]*\.?[0-9]/)
      const currencySign = currencySplit.filter(sign => sign !== '')[0]
      CMC.lastBalance.total.current = parseFloat(
        balance.replace(/€|\$|£|BTC|R\$|Fr|¥|Kč|₽/g, '')
          .replace(',', ''),
      )

      let diff = CMC.lastBalance.total.last - CMC.lastBalance.total.current
      let sign = Math.sign(diff) === 1 || 0 ? '-' : '+'
      let diffTxt = CMC.lastBalance.total.last ? `_(**${sign}**${diff.toFixed(2).replace('-', '')} ${currencySign})_` : ''

      discord(`${process.env.CMC_DISCORD_MSG} **${balance}** ${diffTxt}`)
    } catch (e) {
      console.error('[getFundText] Error', e)
      await CMC.close()
    }
  },
}

module.exports = CMC
