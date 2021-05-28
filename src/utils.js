'use strict'


exports.millisToMinutesAndSeconds = function(millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}


exports.sleep = async function(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

exports.lazyLoadPage = async function (page) {
    //const sleep = require('sleep');

    let height =  await page.evaluate("window.innerHeight");
    let pageHeight = await getPageHeight(page);
    let dots = '.'
    for (var j = 0; j < pageHeight; j += (height - 20)) {
        await page.evaluate("window.scrollTo( 0, " + j + ")")
        await sleep(500);
        pageHeight = await getPageHeight(page);
        dots += '.'
        process.stdout.write('\rLazyLoad scrolling ' + dots)
    }
    process.stdout.write('\rLazyLoad scrolling ' + dots + ' done\n')
    
    // Going back to the top of the page will put the floating footer at the bottom of the first viewport
    //await page.evaluate("window.scrollTo(0, 0)");
};

 async function getPageHeight(page) {
    var clientHeight = await page.evaluate("document.documentElement.clientHeight")
    var bodyClientHeight = await page.evaluate("document.body.clientHeight")
    var scrollHeight = await page.evaluate("document.documentElement.scrollHeight")
    var bodyScrollHeight = await page.evaluate("document.body.scrollHeight")
    var maxDocElementHeight = Math.max(clientHeight, scrollHeight);
    var maxBodyHeight = Math.max(bodyClientHeight, bodyScrollHeight);
    var max = Math.max(maxDocElementHeight, maxBodyHeight);
    return Math.min(max, 15000)  //Applitools default limit
 }