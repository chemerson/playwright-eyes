module.exports = {
    
    serverUrl: "https://fidelityeyesapi.applitools.com",
    apiKey: process.env.APPLITOOLS_API_KEY,
    fullPage: true,
    logs: false,
    sendDom: false, //Enable this for RCA (Root Cause Analysis).
    lazyLoad: true,
    layoutBreakPoints: false,
    disableBrowserFetching: true, 
    proxy: null, //'http://localhost:8888,yourUser,yourPassword',
    // 1280x720 is the playwright default size
    // iosDeviceInfo.name must be one of: (iPhone 12 Pro Max, iPhone 12 Pro, iPhone 12, iPhone 12 mini, iPhone 11 Pro Max, iPhone 11 Pro, iPhone 11, iPhone Xs, iPhone X, iPhone XR, iPhone 8, iPhone 7, iPad Air (2nd generation), iPad Pro (12.9-inch) (3rd generation), iPad (7th generation))
    browsersInfo: [
        { width: 1200, height: 800, name: 'chrome'  },
        { width: 1022, height: 720, name: 'ie11'  },
        { width: 1022, height: 720, name: 'safari'  },
        // { width: 766, height: 720, name: 'chrome'  },
        // { width: 400, height: 720, name: 'chrome' },
         { width: 1200, height: 800, name: 'firefox'  },
        // { width: 1022, height: 720, name: 'firefox'  },
        // { width: 766, height: 720, name: 'firefox'  },
        // { width: 400, height: 720, name: 'firefox' },
         { iosDeviceInfo: {deviceName: 'iPhone X', 
                         screenOrientation: 'portrait', 
                         version: 'latest'}},
         { iosDeviceInfo: {deviceName: 'iPhone 12', 
                         screenOrientation: 'portrait', 
                         version: 'latest'}},
         { chromeEmulationInfo: {deviceName: 'Pixel 4 XL'}},
     ],
    
    // This is experimental...
    // An Array of raw Selenium steps to take after the page loads... clicks, sendKeys, scroll etc...
      afterPageLoad: [
        //  "page.click('text=/Accept cookies.*/');"
      ],

};