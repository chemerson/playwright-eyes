"use strict"

const utils = require('../src/utils')
const urlParser = require('url');
const sitemap = require('sitemap-generator');
const fs = require('fs');
const smta = require('sitemap-to-array');
const path = require('path');
//const sleep = require('sleep');
const program = require('commander');
const config = require('../applitools.config.js');
const PromisePool = require('es6-promise-pool');
const playwright = require('playwright')

const { 
   Eyes, 
   VisualGridRunner,
   ClassicRunner,
   Target, 
   ConsoleLogHandler,
   ProxySettings, 
   Configuration, 
   BrowserType, 
   DeviceName, 
   ScreenOrientation, 
   BatchInfo,
   StitchMode,
   TestResults,
   MatchLevel,
   FileLogHandler
} = require('@applitools/eyes-playwright');
const { Console } = require('console');

async function SitemapGenerator(url, maxUrls) {
   
   var host = urlParser.parse(url).host;
   var filepath = './sitemaps/' + host + '.xml';

   var generator = sitemap(url, {
   	maxDepth: 0,
     	filepath: filepath,
     	stripQuerystring: true,
     	maxEntriesPerFile: maxUrls
   });

   generator.start();

   generator.on('add', (url) => {
      console.log(url);
   });

   generator.on('error', (error) => {
      console.log(error);
   });

   return new Promise((resolve) => {
      generator.on('done', () => {
         console.log("\nSitemap Generation Complete!\n");
         resolve(filepath);
      });
   });
}

async function sitemapArray(sitemap, url = null) {
   var data;
   if (url === null) {
      console.log("Sitemap File: " + sitemap);
      try {
         var data = fs.readFileSync(sitemap, 'utf-8');
      } catch (err) {
         console.log('Error : %s : Sitemap file name invalid', sitemap)
         console.log(err.name + ': ' + err.message)
      }
   } else {
      console.log("Sitemap Url: " + url);
      var data = url;
   };
   
   var sitemapUrls = [];
   const options = { returnOnComplete: true };
   
   return new Promise(async (resolve) => {
      await smta(data, options, (error, list) => {
         for (var url in list) {
            sitemapUrls.push(list[url].loc);
         }
         resolve(sitemapUrls);
      });
   });
}

async function checkResponse(response) {
   if(!response.ok()) {
       console.log("RESPONSE OK          : " + response.ok())
       console.log("RESPONSE STATUS      : " + response.status())
       console.log("RESPONSE URL         : " + response.url())
   }
}

async function createEyes(url){
   if (enableVisualGrid) {
      var concurrency = config.browsersInfo.length || 10;
      var eyes = new Eyes(new VisualGridRunner(concurrency));
   } else {
      var eyes = new Eyes(new ClassicRunner());
   }

   if (appName === null) {
      var app = path.basename(sitemapFile, '.xml')
   } else {
      var app = appName;
   };

   if (testName === null) {
      if(duplicatePaths) {
         var test = urlParser.parse(url).host;
      } else {
         var test = url; //urlParser.parse(url).path;
      }
   } else {
      var test = testName;
   };

   const batchInfo = new BatchInfo({
      id: myBatchId,
      name: batch,
      sequenceName: batch,
      notifyOnCompletion: true,
    });

   var conf = {
      serverUrl: serverUrl,
      apiKey: apiKey,
      appName: app,
      testName: test,
      agentId: 'Playwright-Crawler',
      setSendDom: sendDom,
      // baselineName: baselineName  TODO *******
      stitchMode: StitchMode.CSS,
      setHideScrollbars: true,
      batch: batchInfo,
      browsersInfo: config.browsersInfo,
      viewportSize: viewport,
      visualGridOptions: {polyfillAdoptedStyleSheets: true},
      layoutBreakpoints: config.layoutBreakPoints, 
      disableBrowserFetching: config.disableBrowserFetching, 
      variantId: 'variant-id'
   };

   eyes.setConfiguration(conf);
   eyes.setMatchLevel(eval('MatchLevel.' + level))
   //eyes.setLogHandler(new ConsoleLogHandler(logs));
   if(logs){eyes.setLogHandler(new FileLogHandler(true, 'eyes ' + Date(), false))};

   if (environment) {
      eyes.setBaselineEnvName(environment);
   };

   if (proxyUrl) {
      var proxy = proxyUrl.split(',');
      var pProtocol = urlParser.parse(proxy[0]).protocol;
      var pHost = proxy[0];
      var pUser = proxy[1] || null;
      var pPass = proxy[2] || null;

      if(pProtocol === 'http:') {
         var isHttpOnly = true;
      } else {
         var isHttpOnly = false;
      }

      var proxyInfo = {
         url: pHost,
         username: pUser, 
         password: pPass, 
         isHttpOnly: isHttpOnly
      };

      console.log("\nProxy Settings: ", pHost, pUser, pPass, isHttpOnly, "\n");
      
      eyes.setProxy(proxyInfo);
   }

   return eyes;

}

async function browser(url) {   

   let browser, page, l_eyes

   // Initialize the playwright browser
   console.log('Headless Browser: ' + headless)
   if(headless) { browser = await playwright.chromium.launch() }
      else 
   {browser = await playwright.chromium.launch({ headless: false })}
   const context = await browser.newContext();
   page = await context.newPage();
   page.setDefaultNavigationTimeout(30000)
   page.setDefaultTimeout(2000)
   //page.on('response', checkResponse);

   try {

      console.log('\nStart Processing Url: ', url); 
      await page.goto(url)
      
      if(lazyLoad) {
         await utils.lazyLoadPage(page);
      }
   
      if (config.afterPageLoad) {
         try {
            for (var step in config.afterPageLoad) {
               await eval(config.afterPageLoad[step]);
               utils.sleep(1000)
            }
         } catch(err) {
            console.log("afterPageLoad Exception: " + err);
         }
      }

      console.log('\nEyes Processing Url: ', url);
      l_eyes = await createEyes(url) 
      myEyes = l_eyes
      await l_eyes.open(page);

      if (enableFullPage) {
         await l_eyes.check(url, Target.window().fully());
      } else {
         await l_eyes.check(url, Target.window());
      }
      
      await l_eyes.closeAsync();
      
      console.log('Eyes Done Processing Url: ', url);

   } catch(err) {
      console.log('Failed Url: ', url, '\n'); 
      console.error('>>> ' + err.name + ': ' + err.message)
   } finally {
      await browser.close()
      if(typeof l_eyes !== 'undefined') await l_eyes.abort();
      console.log('Done Processing Url: ', url);
   }
}

const promiseProducer = (eyes) => {
   
   if (array.length === 0) {
      return null;
   } else {
      console.log("\nURLs Remaining: " + array.length)
   }
   
   const url = array.shift();
      
   return new Promise((resolve) => {
      browser(url).then(function (url) {
         resolve(url);
      });
   });
}

function isInt(value) {
   if (isNaN(value)) {
      return false;
   }
   var x = parseFloat(value);
   return (x | 0) === x;
}

function onlyUnique(value, index, self) { 
   return self.indexOf(value) === index;
}

//Global variables
let myBatchId = Math.round((new Date()).getTime() / 1000).toString();
console.log("My Applitools Batch ID: " + myBatchId)

let apiKey = String;
let serverUrl = String;
let enableVisualGrid = Boolean;
let logs = Boolean;
let headless = Boolean;
let sitemapFile = String;
let array = Array;
let appName = String;
let testName = String;
let level = String;
let enableFullPage = Boolean;
let proxyUrl = String;
let batch = String;
let myEyes = Object;
let sendDom = Boolean;
let lazyLoad = Boolean;
let duplicatePaths = Boolean;
let viewport = Object;
let environment = String;
let urlCount = 0

async function crawler() {
   program
   .version('0.1.0')
   .option('-u --url [url]', 'Add the site URL you want to generate a sitemap for. e.g. -u https://www.seleniumconf.com')
   .option('-s --sitemap [sitemap]', 'Use an already existing sitemap file. e.g. -s "/path/to/sitemap.xml" Note: This overrides the -u arg')
   .option('-m, --sitemapUrl [sitemapUrl', 'Specify a sitemap URL. e.g. -m https://www.example.com/sitemap.xml')
   .option('-b, --browsers [browsers]', 'Add the MAX number of browsers to run concurrently. default 5 e.g. -b 5. Note: Be careful with this!', parseInt)
   .option('-k --key [key]', 'Set your Applitools API Key. e.g. -k yourLongAPIKeyyyyy')
   .option('-S --serverUrl [serverUrl]', 'Set your Applitools on-prem or private cloud server URL. (Default: https://eyes.applitools.com). e.g. -v https://youreyes.applitools.com')
   .option('--no-grid', 'Disable the Visual Grid and run locally only (Default: false). e.g. --no-grid')
   .option('--logs', 'Enable Applitools Debug Logs (Default: false). e.g. --logs')
   .option('--headless', 'Run Chrome headless (Default: false). e.g. --headless')
   .option('--no-fullPage', 'Disable Full Page Screenshot (Default: full page). e.g. --no-fullPage')
   .option('-U --URL [URL]', 'Add a single web URL you want to capture images for. e.g. -U https://www.google.com')
   .option('-a --appName [appName]', 'Override the appName. e.g. -a MyApp')
   .option('-t --testName [testName]', 'Override the testName. e.g. -t MyTest')
   .option('-l --level [level]', 'Set your Match Level "Layout2, Content, Strict, Exact" (Default: Strict). e.g. -l Layout2')
   .option('-p --proxy [proxy]', 'Set your Proxy URL" (Default: None). e.g. -p http://proxyhost:port,username,password')
   .option('-B --batch [batch]', 'Set your Batch Name" (Default: sitemap filename or url). e.g. -B MyBatch')
   .option('-v --viewport [viewport]', 'Set your browser viewport" (Default: 800x600). e.g. -v 1200x600')
   .option('-e --environment [environment]', 'Set a baseline environment name for cross-environment tests" (Default: none). e.g. -e "myEnvironment"')
   .parse(process.argv);
   
   const programOptions = program.opts();

   apiKey = programOptions.key || config.apiKey;
   serverUrl = programOptions.serverUrl || config.serverUrl;
   enableVisualGrid = programOptions.grid;
   logs = programOptions.log || config.logs;
   headless = programOptions.headless || false;
   appName = programOptions.appName || null;
   testName = programOptions.testName || null;
   level = programOptions.level || 'Strict';
   enableFullPage = programOptions.fullPage || config.fullPage;
   proxyUrl = programOptions.proxy || config.proxy || null;
   sendDom = config.sendDom || false;
   lazyLoad = config.lazyLoad;
   environment = programOptions.environment || null;

   // TODO branchname


   
   if (!isInt(programOptions.browsers)) {
      programOptions.browsers = 1;
   }
   console.log('Browser Running: ' + programOptions.browsers)
   
   var validMatchLevels = [  
      'Layout2',
      'Content',
      'Strict',
      'Exact'
   ]

   if (!validMatchLevels.includes(level)) {
      console.log("\nUnknown Match Level: " + level);
      console.log("\nPlease specify a valid Match Level: " + validMatchLevels);
      process.exit();
   }

   if (programOptions.viewport) {
      var vp = programOptions.viewport.split('x');
      viewport = { width: Number(vp[0]), height: Number(vp[1]) }
   } else {
      viewport = null;
   }
   

   if (programOptions.URL) {
      var host = urlParser.parse(programOptions.URL).host;
      console.log("MY URL: " + programOptions.url)
      if(programOptions.batch) {
         batch = programOptions.batch
      } else {
         batch = 'pec.' + host 
      }
      sitemapFile = host;
      array = [programOptions.URL];
      
      if(!testName){
         testName = host;
      }

   } else {
      //disable test names when crawling sitemap.
      testName = null;

      if (programOptions.sitemapUrl) {
         var host = urlParser.parse(programOptions.sitemapUrl).host;
         sitemapFile = host;
         array = await sitemapArray('', programOptions.sitemapUrl);
      } else {
         if (programOptions.sitemap) {
            sitemapFile = programOptions.sitemap;
         } else {
            sitemapFile = await SitemapGenerator(programOptions.url, 500);
         }
         array = await sitemapArray(sitemapFile);
      }
      
      if(programOptions.batch) {
         batch = 'pec.' + programOptions.batch
      } else {
         batch = 'pec.' + path.basename(sitemapFile, '.xml') 
      }
   }

   var urlPaths = {};
   array.forEach(function(x) { urlPaths[urlParser.parse(x).path] = (urlPaths[urlParser.parse(x).path] || 0)+1; });
   var pathValues = new Array();
   for (var key in urlPaths) {
      pathValues.push(urlPaths[key]);
   }
   var uniquePathValues = pathValues.filter(onlyUnique);

   if(uniquePathValues[0] === 1 && uniquePathValues.length === 1) {
      duplicatePaths = false;
   } else {
      duplicatePaths = true;
   }

   console.log('\nDuplicated URL Paths: ', duplicatePaths);

   //await eval(pry.it)
   
   var start = new Date();
   console.log("\nStart Time: " + start);
   console.log("Applitools API key: " + apiKey)

   urlCount = array.length
   const pool = new PromisePool(promiseProducer, programOptions.browsers);
   await pool.start();

   if(typeof myEyes !== 'undefined') await myEyes.getRunner().getAllTestResults(false);

   var finished = new Date();
   var diff = Math.abs(start - finished);
   var duration = utils.millisToMinutesAndSeconds(diff);
   var end = new Date();
   console.log("\nEnd Time: " + end);
   console.log("\nTotal Duration: " + duration);
   console.log('URLs Crawled: ' + urlCount)

}

crawler();