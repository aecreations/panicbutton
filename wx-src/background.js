/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let gIsInitialized = false;
let gOS;
let gHostAppVer;
let gPrefs;
let gReplaceSession = false;
let gReplacemtWndID = null;
let gNumClosedWnds = 0;
let gShowCamouflageWnd = false;
let gCamouflageWndID = null;
let gMinimizedWndID = null;
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

browser.runtime.onInstalled.addListener(async (aInstall) => {
  if (aInstall.reason == "install") {
    log("Panic Button/wx: Extension installed");

    await setDefaultPrefs();
    await init();
  }
  else if (aInstall.reason == "update") {
    let oldVer = aInstall.previousVersion;
    let currVer = browser.runtime.getManifest().version;
    
    log(`Panic Button/wx: Upgrading from version ${oldVer} to ${currVer}`);

    gPrefs = await browser.storage.local.get();

    if (! hasSantaCruzPrefs()) {
      log("Initializing 4.1 user preferences");
      await setSantaCruzPrefs();
    }

    if (! hasSantaRosaPrefs()) {
      log("Initializing 4.2 user preferences.");
      await setSantaRosaPrefs();
    }

    if (! hasSantaCatalinaPrefs()) {
      log("Initializing 4.3 user preferences.");
      await setSantaCatalinaPrefs();

      let cmds = await browser.commands.getAll();
      if (cmds[0].shortcut == aeConst.DEFAULT_KEYB_SHCT) {
        browser.tabs.create({ url: "pages/update-4.3.html" });
      }
    }

    await init();
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


function hasSantaCatalinaPrefs()
{
  // Version 4.3
  return gPrefs.hasOwnProperty("minimizeCurrOpt");
}


async function setSantaCatalinaPrefs()
{
  let newPrefs = {
    minimizeCurrOpt: aeConst.MINIMIZE_CURR_OPT_MINZ_CURR_WND,
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
    minimizeCurrOpt: aeConst.MINIMIZE_CURR_OPT_RESTORE_MINZED_WND,
  };

  gPrefs = aePanicButtonPrefs;
  await browser.storage.local.set(aePanicButtonPrefs);
}



//
// Initializing integration with host application
//

browser.runtime.onStartup.addListener(async () => {
  log("Panic Button/wx: Initializing Panic Button during browser startup.");

  gPrefs = await browser.storage.local.get();
  init();
});


async function init()
{
  if (gIsInitialized) {
    return;
  }

  let getBrwsInfo = browser.runtime.getBrowserInfo();
  let getPlatInfo = browser.runtime.getPlatformInfo();

  Promise.all([getBrwsInfo, getPlatInfo]).then(async (aResults) => {
    let brws = aResults[0];
    let platform = aResults[1];
    
    gHostAppVer = brws.version;
    log(`Panic Button/wx: Host app: ${brws.name} (version ${gHostAppVer})`);

    gOS = platform.os;
    log("Panic Button/wx: OS: " + gOS);

    browser.browserAction.onClicked.addListener(async (aTab) => {
      await panic();
    });

    browser.commands.onCommand.addListener(async (aCmd) => {
      if (aCmd == "ae-panicbutton" && gPrefs.shortcutKey) {
        await panic();
      }
    });

    browser.storage.onChanged.addListener(async (aChanges, aAreaName) => {
      let changedPrefs = Object.keys(aChanges);
      
      for (let pref of changedPrefs) {
        gPrefs[pref] = aChanges[pref].newValue;
      }

      setPanicButtonCustomizations();
    });

    setPanicButtonCustomizations();

    gIsInitialized = true;
    log("Panic Button/wx: Initialization complete.");
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


async function panic()
{
  if (gReplaceSession) {
    if (gPrefs.restoreSessPswdEnabled) {
      browser.tabs.update({ url: "pages/restoreSession.html" });
    }
    else {
      await restoreBrowserSession();
    }
  }
  else if (gShowCamouflageWnd) {
    await restoreBrowserWindowState();
    gShowCamouflageWnd = false;
  }
  else if (gMinimizedWndID && gPrefs.minimizeCurrOpt == aeConst.MINIMIZE_CURR_OPT_RESTORE_MINZED_WND) {
    if (await restoreMinimizedBrowserWindowState()) {
      gMinimizedWndID = null;
    }
    else {
      await minimizeCurrent();
    }
  }
  else {
    if (gPrefs.action == aeConst.PANICBUTTON_ACTION_REPLACE) {
      let replacementURL = gPrefs.replacementWebPgURL;
      await closeAll(true, replacementURL);
    }
    else if (gPrefs.action == aeConst.PANICBUTTON_ACTION_MINIMIZE) {
      await minimizeAll();
    }
    else if (gPrefs.action == aeConst.PANICBUTTON_ACTION_QUIT) {
      await closeAll(false);
    }
    else if (gPrefs.action == aeConst.PANICBUTTON_ACTION_MINIMIZE_CURR) {
      await minimizeCurrent();
    }
  }
}


async function restoreBrowserWindowState()
{
  if (gShowCamouflageWnd) {
    browser.windows.remove(gCamouflageWndID);
    gCamouflageWndID = null;
  }
  
  while (gMinimizedWndStates.length > 0) {
    let minzWnd = gMinimizedWndStates.pop();

    try {
      await browser.windows.get(minzWnd.id);

      // Confirm that the minimized window still exists.
      await browser.windows.update(minzWnd.id, { state:  minzWnd.wndState });
    }
    catch (e) {
      warn("Panic Button/wx: Window ID no longer valid (was it just closed?)");
    };
  }
}


async function restoreMinimizedBrowserWindowState()
{
  let rv = false;
  let wnd = null;

  try {
    wnd = await browser.windows.get(gMinimizedWndID);    
  }
  catch (e) {
    warn("Panic Button/wx: Window ID no longer valid (was it just closed?)");
  }

  if (wnd.state == "minimized") {
    // TO DO: Don't assume previous window state.
    await browser.windows.update(gMinimizedWndID, { state: "normal" });
    rv = true;
  }

  return rv;
}


async function restoreBrowserSession()
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
    let wnd = await browser.windows.get(gReplacemtWndID);
    await browser.windows.remove(wnd.id);

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

      let createdWnd = await browser.windows.create(wndPpty);
      let activeTabIdx = gClosedWndActiveTabIndexes.shift();
      let activeTabID = 0;

      if (activeTabIdx >= createdWnd.tabs.length) {
        // Some tabs may not be restored (e.g. "about:" pages), which would
        // mess up the saved index of the active tab.
        log(`Setting last tab for window (id = ${createdWnd.id}) to be active.`);
        activeTabIdx = createdWnd.tabs.length - 1;
        activeTabID = createdWnd.tabs[activeTabIdx].id;
      }
      else {
        log(`Setting tab[${activeTabIdx}] for window (id = ${createdWnd.id}) to be active.`);
        activeTabID = createdWnd.tabs[activeTabIdx].id;
      }
      await browser.tabs.update(activeTabID, {active: true});
      
      if (closedWnd.focused) {
        let updWnd = await browser.windows.update(createdWnd.id, {focused: true});
        log(`Finished restoring window (ID = ${createdWnd.id}) - giving this window the focus.`);
      }
      else {
        log(`Finished restoring window (ID = ${createdWnd.id})`);
      }
    };
  }
}


async function minimizeAll()
{
  log("Panic Button/wx: Invoked function minimizeAll()");

  let wnds = await browser.windows.getAll();
  for (let wnd of wnds) {
    gMinimizedWndStates.push({
      id: wnd.id,
      wndState: wnd.state,
    });
    await browser.windows.update(wnd.id, { state: "minimized" });
    log("Minimized window: " + wnd.id);
  }

  if (gPrefs.showCamouflageWebPg) {
    let camoWnd = await browser.windows.create({ url: gPrefs.camouflageWebPgURL });
    info("Panic Button/wx: Camouflage window: ID: " + camoWnd.id);
    gCamouflageWndID = camoWnd.id;
    gShowCamouflageWnd = true;
  }
}


async function minimizeCurrent()
{
  log("Panic Button/wx: Invoked function minimizeCurrent()");

  let wnd = await browser.windows.getCurrent();

  await browser.windows.update(wnd.id, { state: "minimized" });
  log("Minimized window: " + wnd.id);

  gMinimizedWndID = wnd.id;
}


async function closeAll(aSaveSession, aReplacementURL)
{
  log("Panic Button/wx: Invoked function closeAll()");
  log(`aSaveSession = ${aSaveSession}, aReplacementURL = ${aReplacementURL}`);

  let wnds = await browser.windows.getAll({populate: true});
  log("Panic Button/wx: Total number of windows currently open: " + wnds.length);

  if (aSaveSession) {
    gClosedWndStates = wnds;
  }
  
  let closeWnds = [];
  
  for (let wnd of wnds) {
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


function getPanicActionUIStringKey()
{
  let rv = "";
  
  switch (Number(gPrefs.action)) {
  case aeConst.PANICBUTTON_ACTION_REPLACE:
    rv = "actHideAndReplace";
    break;

  case aeConst.PANICBUTTON_ACTION_MINIMIZE:
    rv = "actMinimizeAll";
    break;

  case aeConst.PANICBUTTON_ACTION_QUIT:
    rv = "actCloseAll";
    break;

  case aeConst.PANICBUTTON_ACTION_MINIMIZE_CURR:
    rv = "actMinimizeCurr";
    break;

  default:
    break;
  }

  return rv;
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
