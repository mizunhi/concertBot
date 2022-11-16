const puppeteer = require('puppeteer');
const https = require('node:https');


(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewpor: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const cityOI = process.argv[2];
  if (!cityOI) {
    throw "Please provide a city as a first argument";
}
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1")

  await page.goto(`https://www.fansale.it/fansale/tickets/pop-amp-rock/verdena/464127#3160790`);

  await page.waitForTimeout(2000)

  const citySelector = '.EvEntryRow-City'

  const list = await page.$$eval(citySelector, list => list.map(a => {
    return {
      city: a.innerHTML
    }
  }))

  const filter = list.filter(concert => {
    return String(concert.city).toLowerCase() === cityOI.toLowerCase()
  })

  const link = await page.$$eval('a[data-city="'+String(cityOI).toUpperCase()+'"]', list => list.map(a => {
    return {
      href: a.href
    }
  }))

  const message = `${filter.length > 0 ? '' : 'non'} ci sono biglietti per ${cityOI} ${filter.length > 0 ? link[0].href : ''}`
  browser.close()
  const tApi = '5648347431:AAE0yL3Kw0w2o-2-QPloGKek06uGvmYVFhM'
  const tGroup = '-621035090'
  const send_message_url = `https://api.telegram.org/bot${tApi}/sendMessage?chat_id=${tGroup}&text=${message}`

  if (filter.length > 0) {
    https.get(send_message_url, (res) => {
      // console.log('statusCode:', res.statusCode);
      // console.log('headers:', res.headers);
  
      res.on('data', (d) => {
        process.stdout.write(d);
      });
  
    }).on('error', (e) => {
      console.error(e);
    });
  } else {
    console.log(message);
  }

})();