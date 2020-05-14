/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


let gIsInitialized = false;
let gOS;
let gHostAppVer;
let gPrefs;
let gHideAll = false;
let gReplaceSession = false;
let gReplacemtWndID = null;
let gShowCamouflageWnd = false;
let gCamouflageWndID = null;
let gMinimizedWndStates = [];
let gClosedWndStates = [];
let gClosedWndActiveTabIndexes = [];

let gToolbarBtnIcons = [
  "default",
  "exclamation-in-ball",
  "quit",
  "exit-door",
  "window-minimize",
  "window-with-exclamation",
  "window-with-exclamation-ball",
  "window-with-cross",
  "window-with-check",
  "plain-window",
  "dotted-window",
  "window-with-globe",
  "web-page",
  "web-page-with-globe",
  "web-document",
  "smiley",
  "picture",
  "desktop",
  "computer",
  "letter-a"
];


//
// First-run initialization
//

browser.runtime.onInstalled.addListener(aDetails => {
  if (aDetails.reason == "install") {
    log("Panic Button/wx: Extension installed");

    setDefaultPrefs().then(() => {
      init();
    });
  }
  else if (aDetails.reason == "update") {
    let oldVer = aDetails.previousVersion;
    let currVer = browser.runtime.getManifest().version;
    
    log(`Panic Button/wx: Upgrading from version ${oldVer} to ${currVer}`);

    browser.storage.local.get().then(aPrefs => {
      gPrefs = aPrefs;

      if (! hasSantaCruzPrefs()) {
        log("Initializing 4.1 user preferences");
        return setSantaCruzPrefs();
      }
      return null;

    }).then(() => {
      if (! hasSantaRosaPrefs()) {
        log("Initializing 4.2 user preferences.");
        return setSantaRosaPrefs();
      }
      return null;

    }).then(() => {
      init();
    });
  }
});


function hasSantaCruzPrefs()
{
  // Version 4.1
  return gPrefs.hasOwnProperty("restoreSessPswdEnabled");
}


async function setSantaCruzPrefs()
{
  let newPrefs = {
    panicButtonKey: "F9",
    panicButtonKeyMod: "",
    restoreSessPswdEnabled: false,
    restoreSessPswd: null,
  };

  for (let pref in newPrefs) {
    gPrefs[pref] = newPrefs[pref];
  }

  await browser.storage.local.set(newPrefs);
}


function hasSantaRosaPrefs()
{
  // Version 4.2
  return gPrefs.hasOwnProperty("showCamouflageWebPg");
}


async function setSantaRosaPrefs()
{
  let newPrefs = {
    showCamouflageWebPg: false,
    camouflageWebPgURL: aeConst.REPLACE_WEB_PAGE_DEFAULT_URL,
  };

  for (let pref in newPrefs) {
    gPrefs[pref] = newPrefs[pref];
  }

  await browser.storage.local.set(newPrefs);
}


async function setDefaultPrefs()
{
  let aePanicButtonPrefs = {
    action: aeConst.PANICBUTTON_ACTION_REPLACE,
    toolbarBtnIcon: 0,
    toolbarBtnLabel: browser.i18n.getMessage("defaultBtnLabel"),
    toolbarBtnRevContrastIco: false,
    shortcutKey: true,
    panicButtonKey: "F9",
    panicButtonKeyMod: "",
    replacementWebPgURL: aeConst.REPLACE_WEB_PAGE_DEFAULT_URL,
    restoreSessPswdEnabled: false,
    restoreSessPswd: null,
    showCamouflageWebPg: false,
    camouflageWebPgURL: aeConst.REPLACE_WEB_PAGE_DEFAULT_URL,
  };

  gPrefs = aePanicButtonPrefs;
  await browser.storage.local.set(aePanicButtonPrefs);
}



//
// Initializing integration with host application
//

browser.runtime.onStartup.addListener(() => {
  log("Panic Button/wx: Initializing Panic Button during browser startup.");

  browser.storage.local.get().then(aPrefs => {
    gPrefs = aPrefs;
    init();
  });
});


function init()
{
  if (gIsInitialized) {
    return;
  }

  let getBrwsInfo = browser.runtime.getBrowserInfo();
  let getPlatInfo = browser.runtime.getPlatformInfo();

  Promise.all([getBrwsInfo, getPlatInfo]).then(aResults => {
    let brws = aResults[0];
    let platform = aResults[1];
    
    gHostAppVer = brws.version;
    log(`Panic Button/wx: Host app: ${brws.name} ${gHostAppVer}`);

    gOS = platform.os;
    log("Panic Button/wx: OS: " + gOS);

    browser.browserAction.onClicked.addListener(aTab => {
      panic();
    });

    browser.commands.onCommand.addListener(aCmd => {
      if (aCmd == "ae-panicbutton" && gPrefs.shortcutKey) {
        panic();
      }
    });

    browser.storage.onChanged.addListener((aChanges, aAreaName) => {
      let changedPrefs = Object.keys(aChanges);
      
      for (let pref of changedPrefs) {
        gPrefs[pref] = aChanges[pref].newValue;
      }

      setPanicButtonCustomizations();

      if (versionCompare(gHostAppVer, "66.0") < 0) {
        log("Panic Button/wx: User prefs changed; updating keyboard shortcut.");
        setPanicButtonKeys();
      }
    });

    setPanicButtonCustomizations();

    if (versionCompare(gHostAppVer, "66.0") < 0) {
      setPanicButtonKeys().then(() => {
        gIsInitialized = true;
        log("Panic Button/wx: Initialized keyboard shortcut from user prefs.\nInitialization complete.");
      });
    }
    else {
      gIsInitialized = true;
      log("Panic Button/wx: Initialization of keyboard shortcut is automatically handled in Firefox 66 and newer.\nInitialization complete.");
    }
  });
}


function setPanicButtonCustomizations()
{
  setToolbarButtonIcon(gPrefs.toolbarBtnIcon, gPrefs.toolbarBtnRevContrastIco);
  browser.browserAction.setTitle({ title: gPrefs.toolbarBtnLabel });
}


function setToolbarButtonIcon(aIconIndex, isReverseContrast)
{
  if (aIconIndex == aeConst.CUSTOM_ICON_IDX) {
    setCustomToolbarButtonIcon();
    return;
  }
  
  let toolbarBtnIconName = gToolbarBtnIcons[aIconIndex];
  let revCntrst = isReverseContrast ? "_reverse" : "";

  browser.browserAction.setIcon({
    path: {
      16: "img/" + toolbarBtnIconName + "16" + revCntrst + ".svg",
      32: "img/" + toolbarBtnIconName + "16" + revCntrst + ".svg",
    }
  }).catch(onError);
}


function setCustomToolbarButtonIcon()
{
  let getPrefs = browser.storage.local.get();
  getPrefs.then(aResult => {
    let iconDataURL = aResult.toolbarBtnData;

    browser.browserAction.setIcon({
      path: {
        16: iconDataURL,
        32: iconDataURL,
        64: iconDataURL
      }
    });
  });
}


function getToolbarButtonIconLookup()
{
  return gToolbarBtnIcons;
}


async function setPanicButtonKeys()
{
  let shortcutKeyMod = gPrefs.panicButtonKeyMod;
  if (shortcutKeyMod) {
    shortcutKeyMod += "+";
  }

  let shortcut = `${shortcutKeyMod}${gPrefs.panicButtonKey}`;
  
  await browser.commands.update({
    name: aeConst.CMD_PANIC_BUTTON_ACTION,
    shortcut,
  });
}


function panic()
{
  if (gReplaceSession) {
    if (gPrefs.restoreSessPswdEnabled) {
      browser.tabs.update({ url: "pages/restoreSession.html" });
    }
    else {
      restoreBrowserSession();
    }
  }
  else if (gShowCamouflageWnd) {
    restoreBrowserWindowState();
    gShowCamouflageWnd = false;
  }
  else {
    if (gPrefs.action == aeConst.PANICBUTTON_ACTION_REPLACE) {
      let replacementURL = gPrefs.replacementWebPgURL;
      closeAll(true, replacementURL);
    }
    else if (gPrefs.action == aeConst.PANICBUTTON_ACTION_MINIMIZE) {
      minimizeAll();
    }
    else if (gPrefs.action == aeConst.PANICBUTTON_ACTION_QUIT) {
      closeAll(false);
    }
  }
}


function restoreBrowserWindowState()
{
  if (gShowCamouflageWnd) {
    browser.windows.remove(gCamouflageWndID);
    gCamouflageWndID = null;
  }
  
  while (gMinimizedWndStates.length > 0) {
    let minzWnd = gMinimizedWndStates.pop();

    browser.windows.get(minzWnd.id).then(aWnd => {
      // Confirm that the minimized window still exists.
      browser.windows.update(minzWnd.id, { state:  minzWnd.wndState });
    }).catch(aErr => {
      warn("Panic Button/wx: Window ID no longer valid (was it just closed?): " + minzWnd.id);
    });
  }
}


function restoreBrowserSession()
{
  function isNonrestrictedURL(aURL)
  {
    // The restricted URLs for browser.tabs.create() are described here:
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/create
    return (!(aURL.startsWith("chrome:")
              || aURL.startsWith("file:")
              || aURL.startsWith("javascript:")
              || aURL.startsWith("data:")
              || aURL.startsWith("about:")));
  }

  let activeTabIndexes = [];

  if (gReplaceSession) {
    log(`Panic Button/wx: Closing replacement browser window (window ID: ${gReplacemtWndID})`);
    browser.windows.get(gReplacemtWndID).then(aWnd => {
      return browser.windows.remove(aWnd.id);

    }).then(() => {
      gReplacemtWndID = null;
      gReplaceSession = false;

      log("Panic Button/wx::restoreBrowserSession(): Number of windows to restore: " + gClosedWndStates.length);

      let restoredWnds = [];
      
      while (gClosedWndStates.length > 0) {   
        let closedWnd = gClosedWndStates.shift();

        let wndPpty = {
          type: "normal",
          incognito: closedWnd.incognito,
          state: closedWnd.state,
        };

        if (closedWnd.state == "normal") {
          wndPpty.top = closedWnd.top;
          wndPpty.left = closedWnd.left;
          wndPpty.width = closedWnd.width;
          wndPpty.height = closedWnd.height;
        }
        
        if (closedWnd.tabs.length == 1) {
          let brwsTabURL = closedWnd.tabs[0].url;

          // Default to home page if URL is restricted.
          wndPpty.url = isNonrestrictedURL(brwsTabURL) ? brwsTabURL : null;
        }
        else {
          let safeBrwsTabs = closedWnd.tabs.filter(aTab => isNonrestrictedURL(aTab.url));
          wndPpty.url = safeBrwsTabs.map(aTab => aTab.url);
        }

        log("Panic Button/wx::restoreBrowserSession(): Info about window being restored: ");
        log(wndPpty);

        browser.windows.create(wndPpty).then(aCreatedWnd => {
          let activeTabIdx = gClosedWndActiveTabIndexes.shift();
          let activeTabID = 0;

          if (activeTabIdx >= aCreatedWnd.tabs.length) {
            // Some tabs may not be restored (e.g. "about:" pages), which would
            // mess up the saved index of the active tab.
            log(`Setting last tab for window (id = ${aCreatedWnd.id}) to be active.`);
            activeTabIdx = aCreatedWnd.tabs.length - 1;
            activeTabID = aCreatedWnd.tabs[activeTabIdx].id;
          }
          else {
            log(`Setting tab[${activeTabIdx}] for window (id = ${aCreatedWnd.id}) to be active.`);
            activeTabID = aCreatedWnd.tabs[activeTabIdx].id;
          }
          browser.tabs.update(activeTabID, {active: true});
          
          if (closedWnd.focused) {
            browser.windows.update(aCreatedWnd.id, {focused: true}).then(aUpdWnd => {
              log(`Finished restoring window (ID = ${aCreatedWnd.id}) - giving this window the focus.`);
            });
          }
          else {
            log(`Finished restoring window (ID = ${aCreatedWnd.id})`);
          }
        });
      }
    });
  }
}


function minimizeAll()
{
  log("Panic Button/wx: Invoked function minimizeAll()");

  browser.windows.getAll().then(aWnds => {
    for (let wnd of aWnds) {
      gMinimizedWndStates.push({
        id: wnd.id,
        wndState: wnd.state,
      });
      browser.windows.update(wnd.id, { state: "minimized" }).then(() => {
        log("Minimized window: " + wnd.id);
      });
    }
  });

  if (gPrefs.showCamouflageWebPg) {
    browser.windows.create({ url: gPrefs.camouflageWebPgURL }).then(aWnd => {
      info("Panic Button/wx: Camouflage window: ID: " + aWnd.id);
      gCamouflageWndID = aWnd.id;
      gShowCamouflageWnd = true;
    });
  }
}


function closeAll(aSaveSession, aReplacementURL)
{
  log("Panic Button/wx: Invoked function closeAll()");
  log(`aSaveSession = ${aSaveSession}, aReplacementURL = ${aReplacementURL}`);

  browser.windows.getAll({populate: true}).then(aWnds => {
    log("Panic Button/wx: Total number of windows currently open: " + aWnds.length);

    if (aSaveSession) {
      gClosedWndStates = aWnds;
    }

    let closeWnds = [];

    for (let wnd of aWnds) {
      if (aSaveSession) {
        gClosedWndActiveTabIndexes.push(wnd.tabs.findIndex(aTab => aTab.active));
      }
      
      log("Panic Button/wx::closeAll(): Closing window " + wnd.id);
      closeWnds.push(browser.windows.remove(wnd.id));
    }

    Promise.all(closeWnds).then(() => {
      if (aSaveSession && aReplacementURL) {
        gReplaceSession = true;

        log("Opening temporary replacement window.");
        browser.windows.create({ url: aReplacementURL }).then(aWnd => {
          gReplacemtWndID = aWnd.id;
          info("Window ID of temporary replacement window: " + gReplacemtWndID);
        });
      }
    });
  });
}


async function setRestoreSessPasswd(aPswd)
{
  // The password for restoring the browser session for "Hide and Replace" is
  // simply obfuscated, not encrypted, since we're not trying to protect
  // sensitive user data.  Anyone who is very motivated would find other ways
  // to access the user's browsing session without having to crack the
  // restore session password.  This is unlikely to be the case for a nosy
  // bystander trying to see if the user is browsing forbidden websites.
  // The following helper function is adapted from:
  // <https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_Unicode_Problem>
  function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
  }

  let encPwd = b64EncodeUnicode(aPswd);
  await browser.storage.local.set({
    restoreSessPswdEnabled: true,
    restoreSessPswd: encPwd,
  });
}


function getRestoreSessPasswd()
{
  // The following helper function is adapted from:
  // <https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_Unicode_Problem>
  function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  let rv = "";
  let encPwd = gPrefs.restoreSessPswd;
  rv = b64DecodeUnicode(encPwd);

  return rv;
}


async function removeRestoreSessPasswd()
{
  let pswdPrefs = {
    restoreSessPswdEnabled: false,
    restoreSessPswd: null,
  };
  
  await browser.storage.local.set(pswdPrefs);
}


function isDirectSetKeyboardShortcut()
{
  return (versionCompare(gHostAppVer, "66.0") >= 0);
}


function getOS()
{
  return gOS;
}


function getPrefs()
{
  return gPrefs;
}


function versionCompare(aVer1, aVer2)
{
  if (typeof aVer1 != "string" || typeof aVer2 != "string") {
    return false;
  }

  let v1 = aVer1.split(".");
  let v2 = aVer2.split(".");
  const k = Math.min(v1.length, v2.length);
  
  for (let i = 0; i < k; ++ i) {
    v1[i] = parseInt(v1[i], 10);
    v2[i] = parseInt(v2[i], 10);
    
    if (v1[i] > v2[i]) {
      return 1;
    }
    if (v1[i] < v2[i]) {
      return -1;
    }
  }
  
  return (v1.length == v2.length ? 0: (v1.length < v2.length ? -1 : 1));
}


//
// Error reporting and debugging output
//

function onError(aError)
{
  console.error("Panic Button/wx: " + aError);
}


function log(aMessage)
{
  if (aeConst.DEBUG) { console.log(aMessage); }
}


function info(aMessage)
{
  if (aeConst.DEBUG) { console.info(aMessage); }
}


function warn(aMessage)
{
  if (aeConst.DEBUG) { console.warn(aMessage); }
}
