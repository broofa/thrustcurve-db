//
// Script to scrape motor delay values from Cesaroni website and save the data
// to a cache file
//

import ansi from 'ansi';
import axios from 'axios';
import cheerio from 'cheerio';
import cliSpinners from 'cli-spinners';
import fs from 'fs';

const MOTOR_PAGES = [
 'http://www.pro38.com/products/pro24/motor.php',
 'http://www.pro38.com/products/pro29/motor.php',
 'http://www.pro38.com/products/pro38/motor.php',
 'http://www.pro38.com/products/pro54/motor.php'
];

const CESARONI_CACHE = new URL('./_cesaroni_delays.json', import.meta.url);

let cesaroniDelays;
try {
  cesaroniDelays = JSON.parse(fs.readFileSync(CESARONI_CACHE));
} catch (err) {
  cesaroniDelays = {};
}

// PRO38 website is slooooow, so we add a little ANSI spinner just so it's
// obvious we're doing something.
const cursor = ansi(process.stdout)
let frame = 0;
const spinner = cliSpinners.dots.frames;
setInterval(() => {
  frame++;
  process.stdout.write(spinner[frame % spinner.length]);
  cursor.back();
}, 80);

// HTTP GET something
async function _fetch(url) {
  process.stdout.write(`\nFetching ${url}`);

  let res;
  try {
    res = await axios.get(url, {
      timeout: 10000,
      headers: {
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'DNT': '1',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
      }
    });
  } catch (err) {
    process.stdout.write(`\r${url}`);
    cursor.red();
    process.stdout.write(` ${err.message}`);
    cursor.black();
    return;
  }
  const {data} = res;

  cursor.horizontalAbsolute(0).eraseLine();
  process.stdout.write(`\r${url}`);

  return data;
}

// Scrape motor name and delays off a motor data page
async function scrapeDetail(url) {
  // Return cached value
  const name = url.replace(/.*prodid=/, '');
  if (name in cesaroniDelays) {

  process.stdout.write(`\n skipping ${url}`);
    return [name, cesaroniDelays[name]];
  }

  let data = await _fetch(url);
  if (!data) return;

  const $ = cheerio.load(data);

  // Uncomment to scrape name out of motor data page
  // const name = $('.prodsubhead').text().replace(/.*\s+/, '');

  // Delay strings are contained in the TD following one labeled "Delays ..."
  // NOTE: Figuring out this incantation took a bit of trial and error. It may
  // be a bit brittle
  const delay = $('td:contains("Delays")')
    .next()
    .text()
    .trim();

  return [name, delay];
}

// Scrape all motor data urls off a motor summary page
async function scrapeSummary(url) {
  let data = await _fetch(url);
  if (!data) return;

  const $ = cheerio.load(data);

  // Get all motor detail links
  return [...$('a')]
    .map(link => /(MotorData.php[^']*)/.test(link.attribs?.href) && RegExp.$1 )
    .filter(href => href)
    .map(href => `${url.replace(/motor.php.*/, 'motor')}/${href}`);
}

// Scrapety scrape scrape
async function scrape() {
  const cesaroniDelays = {};
  // 'Would Promise.all() this stuff, but the pro38 website can't seem to handle
  // the load.  So just do one request at a time.
  for (const url of MOTOR_PAGES) {
    const dataUrls = await scrapeSummary(url);
    if (!dataUrls) continue;

    for (const dataUrl of dataUrls) {
      const delayData = await scrapeDetail(dataUrl);
      if (!delayData) continue;

      const [name, delay] = delayData;
      cesaroniDelays[name] = delay;
    }
  }

  fs.writeFileSync(CESARONI_CACHE, JSON.stringify(cesaroniDelays, null, 2));
}

scrape().then(() => console.log('\nDONE'));
