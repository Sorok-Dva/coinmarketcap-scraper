/**
 * @Author : Сорок два (https://github.com/Sorok-Dva)
 * @Application : coinmarketcap-scraper
 * @Description : A scraper built with puppeteer to retrieve daily funds on CoinMarketCap (with screenshot or text)
 */
require('dotenv').config()
const CronJob = require('cron').CronJob
const CMC = require('./config/coinmarketcap')
const fs = require('fs')

const dataDir = './data'
const screensDir = './data/screenshots/'
const cookiesFile = './data/cookies'
const localStorageFile = './data/storage'
const balancesFile = './data/balance.json'

const initialization = () => {
  const balances = {
    total: {
      last: 0,
      current: 0,
    }
  }
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, 0o744)
  if (!fs.existsSync(screensDir)) fs.mkdirSync(screensDir, 0o744)
  fs.writeFile(cookiesFile, '{"value":{}}', { flag: 'wx' },(err) => {
    if (err) console.info('cookies directory already set')
    else console.log('cookies wasnt created. It\'s now done !')
  })
  fs.writeFile(localStorageFile, '[]', { flag: 'wx' },(err) => {
    if (err) console.info('local storage already set')
    else console.log('local storage wasnt created. It\'s now done but its empty. Fill the storage file.')
  })
  fs.writeFile(balancesFile, JSON.stringify(balances), { flag: 'wx' },(err) => {
    if (err) console.info('last balance file already set')
    else console.log('last balance file wasnt created. It\'s now done !')
  })
}

const CMC_job = new CronJob(process.env.CMC_CRONJOB, async () => {
  if (CMC.browser) await CMC.close()
  await CMC.init()
})

;(async () => {
  initialization()
  CMC_job.start()
})()
