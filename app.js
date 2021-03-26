/**
 * @Author : Сорок два (https://github.com/Sorok-Dva)
 * @Application : coinmarketcap-scraper
 * @Description : A scraper built with puppeteer to retrieve daily funds on CoinMarketCap (with screenshot or text)
 */
require('dotenv').config()
const CronJob = require('cron').CronJob

const CMC = require('./config/coinmarketcap')

const CMC_job = new CronJob(process.env.CMC_CRONJOB, async () => {
  if (CMC.browser) await CMC.close()
  await CMC.init()
})

CMC_job.start()
