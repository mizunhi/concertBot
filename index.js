const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const util = require('util');
const fetch = require('node-fetch');
const PDFMerger = require('pdf-merger-js');
const shell = require('shelljs');



(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewpor: null
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1000,
    height: 1200
  })

  await page.goto(`https://area.kmd.it/users/sign_in`);

  await page.type('input#user_username', 'isaac@kmd.it');
  await page.type('input#user_password', 'DtZA@4!or8TuJkCqV:s:koXfz');
  await Promise.all([
    page.click('input[type=submit]'),
    page.waitForNavigation({ waitUntil: ['networkidle2', 'domcontentloaded'], timeout: 120000 }), // wait until page is loaded
  ]);

  await page.goto(`https://area.kmd.it/phone_activations/941030`);

  await page.waitForTimeout(2000)
  let activation = {}
  const dealerDocuments = await getDealerDocuments(page, browser).then(async value => {
    const merger = new PDFMerger()
    console.log('value', value)
    await mergePdf(merger, value, {_id: 'e54e1'}, './download')
    const output = shell.exec(`./shrinkpdf.sh -r 150 -o download/${'e54e1'}/merged/doc+pda_compressed.pdf download/${'e54e1'}/merged/doc+pda.pdf`,{silent:true,async:false}).output;
    console.log('complession output:', output)
    const pda_compressed = `./download/${'e54e1'}/merged/doc+pda_compressed.pdf`
    activation = pda_compressed
    const fileStats = fs.statSync(pda_compressed)
    console.log(fileStats.size/(1024*1024), 'Mb')
  })
})();

const getDealerDocuments = async (page, browser) => {
  await waitAndClick(page, '#h2_documenti_caricati_dal_dealer a');
  await page.waitForSelector('#section_documenti_caricati_dal_dealer', { visible: true });
  const fileListSelector = '.phone_activation_uploaded_files > div > div > div > div > div > div > div:first-child a';
  await page.waitForTimeout(2000)
  const documentsArray = []
  const list = await page.$$eval(fileListSelector, list => list.map(a => {
    return {
      url: a.href,
      filename: a.innerHTML
    }
  }))
  // list.map(async (file, i) => {
  for (let i = 0; i < list.length; i++) {
    const file = list[i]
    await page.waitForTimeout(2000)
    const linkElSelector = `#section_documenti_caricati_dal_dealer .phone_activation_uploaded_files  > div > div:nth-child(${i+1}) > div > div > div > div > div:first-child a`;
    await waitAndClick(page, linkElSelector)
    const newPage = await getNewPageWhenLoaded(browser)
    const filepath = await downloadFileFromUrl(newPage.url(), {_id: 'e54e1'}, file.filename, './download')
    await page.waitForTimeout(4000)
    newPage.close().catch(err => console.error(JSON.stringify(err)));
    documentsArray.push(filepath)
  }
  return documentsArray
}

async function mergePdf(merger, pdfsToMerge, activation, downloadFilePath) {
  for (let pdf of pdfsToMerge) {
    await merger.add(pdf);
  }
  await merger.save(activation._id + '.pdf'); //save under given name and reset the internal document
  
  const downloadFolder = path.resolve(downloadFilePath, activation._id, 'merged/');
  if (!fs.existsSync(downloadFolder)) {
    await util.promisify(fs.mkdir)(downloadFolder);
  }

  const mergedPdfBuffer = Buffer.from(await merger.saveAsBuffer());

  let filename = `${downloadFolder}/doc+pda.pdf`;

  fs.writeFileSync(filename, mergedPdfBuffer);

  return path.resolve(downloadFolder, filename);
}

async function waitAndClick(
  page,
  selector
) {
  const el = await page.waitForSelector(selector, {timeout: 60000});
  await page.click(selector);
  return el;
}

async function getNewPageWhenLoaded(browser) {
  return new Promise((resolve, reject) =>
    browser.once('targetcreated', async (target) => {
      // era once
      try {
        const newPage = await target.page();
        if (!newPage) {
          return reject(new Error('Target page not created'));
        }

        return resolve(newPage);
      } catch (error) {
        reject(error);
      }
    })
  );
}

const downloadFileFromUrl = async (
  url,
  activation,
  filename = 'DOC',
  downloadFilePath = ''
) => {
  if (!fs.existsSync(downloadFilePath)) {
    await util.promisify(fs.mkdir)(downloadFilePath);
  }

  const downloadFolder = path.resolve(downloadFilePath, activation._id);
  if (!fs.existsSync(downloadFolder)) {
    await util.promisify(fs.mkdir)(downloadFolder);
  }

  const response = await fetch(url, {
      redirect: 'follow',
      follow: 10,
  });
  const pdf = (await response.buffer());
  filename = `${downloadFolder}/${filename}`;

  fs.writeFileSync(filename, pdf);

  return path.resolve(downloadFolder, filename);
}