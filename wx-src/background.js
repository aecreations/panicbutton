/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let gOS;
let gHostAppVer;
let gPrefs;

let gBrowserWindows = {
  _minzWndID: null,
  _camoWndID: null,
  _minzWndStates: [],
  
  async minimizeCurrent()
  {
    log("Panic Button/wx: gBrowserWindows.minimizeCurrent()");

    let wnd = await browser.windows.getCurrent();

    await browser.windows.update(wnd.id, { state: "minimized" });
    log("Minimized window: " + wnd.id);

    this._minzWndID = wnd.id;
  },

  async minimizeAll()
  {
    log("Panic Button/wx: gBrowserWindows.minimizeAll()");

    let wnds = await browser.windows.getAll();
    for (let wnd of wnds) {
      this._minzWndStates.push({
        id: wnd.id,
        wndState: wnd.state,
      });
      await browser.windows.update(wnd.id, { state: "minimized" });
      log("Minimized window: " + wnd.id);
    }

    if (gPrefs.showCamouflageWebPg) {
      this._openCamouflageWnd(gPrefs.camouflageWebPgURL);
    }    
  },

  async restoreAll()
  {
    if (this.isCamouflageWindowOpen()) {
      this._closeCamouflageWnd();
    }
    
    while (this._minzWndStates.length > 0) {
      let minzWnd = this._minzWndStates.pop();

      try {
        await browser.windows.get(minzWnd.id);

        // Confirm that the minimized window still exists.
        await browser.windows.update(minzWnd.id, { state:  minzWnd.wndState });
      }
      catch (e) {
        warn("Panic Button/wx: Window ID no longer valid (was it just closed?)");
      };
    }
  },

  async restoreMinimized()
  {
    let rv = false;
    let wnd = null;

    try {
      wnd = await browser.windows.get(this._minzWndID);    
    }
    catch (e) {
      warn("Panic Button/wx: gBrowserWindows.restoreMinimized(): Window ID no longer valid (was it just closed?)");
    }

    if (wnd.state == "minimized") {
      // TO DO: Don't assume previous window state.
      await browser.windows.update(this._minzWndID, { state: "normal" });
      this._minzWndID = null;
      rv = true;
    }

    return rv;
  },
  
  async closeAll()
  {
    let wnds = await browser.windows.getAll({populate: true});

    for (let wnd of wnds) {
      browser.windows.remove(wnd.id);
    }
  },

  isCamouflageWindowOpen()
  {
    return (this._camoWndID != null);
  },

  isMinimized()
  {
    return (this._minzWndID != null);
  },


  //
  // Private helper methods
  //
  
  async _openCamouflageWnd(aCamouflageURL)
  {
    let wnd = await browser.windows.create({ url: aCamouflageURL });
    info("Panic Button/wx: gBrowserWindows.openCamouflageWnd(): Camouflage window ID: " + wnd.id);
    this._camoWndID = wnd.id;
    
    return this._camoWndID;
  },

  _closeCamouflageWnd()
  {
    if (this._camoWndID === null) {
      throw new Error("Panic Button/wx: gBrowserWindows.closeCamouflageWnd(): Camouflage window ID is null");
    }
    
    browser.windows.remove(this._camoWndID);
    this._camoWndID = null;
  }
};


let gBrowserSession = {
  _replaceSession: false,
  _replacemtWndID: null,
  _savedWndStates: [],
  _savedWndActiveTabIdxs: [],
  _savedWndNumPinnedTabs: [],
  
  async saveAndClose(aReplacementURL)
  {
    let wnds = await browser.windows.getAll({populate: true});
    this._savedWndStates = wnds;

    if (aReplacementURL) {
      let replcWnd = await browser.windows.create({ url: aReplacementURL });
      this._replacemtWndID = replcWnd.id;
      this._replaceSession = true;
    }

    for (let wnd of wnds) {
      if (wnd.id == this._replacemtWndID) {
	continue;
      }

      this._savedWndActiveTabIdxs.push(wnd.tabs.findIndex(aTab => aTab.active));

      let numPinnedTabs = 0;
      for (let i = 0; i < wnd.tabs.length; i++) {
        if (wnd.tabs[i].pinned) {
	  numPinnedTabs++;
        }
        else {
	  break;
        }
      };

      this._savedWndNumPinnedTabs.push(numPinnedTabs);
      browser.windows.remove(wnd.id);
    }
  },

  async restore()
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

    let focusedWndID = null;
    
    while (this._savedWndStates.length > 0) {   
      let closedWnd = this._savedWndStates.shift();
      let wndInfo = {
        type: "normal",
        incognito: closedWnd.incognito,
        state: closedWnd.state,
      };

      if (closedWnd.state == "normal") {
        wndInfo.top = closedWnd.top;
        wndInfo.left = closedWnd.left;
        wndInfo.width = closedWnd.width;
        wndInfo.height = closedWnd.height;
      }
      
      if (closedWnd.tabs.length == 1) {
        let brwsTabURL = closedWnd.tabs[0].url;

        // Default to home page if URL is restricted.
        wndInfo.url = isNonrestrictedURL(brwsTabURL) ? brwsTabURL : null;
      }
      else {
        let safeBrwsTabs = closedWnd.tabs.filter(aTab => isNonrestrictedURL(aTab.url));
        wndInfo.url = safeBrwsTabs.map(aTab => aTab.url);
      }

      let createdWnd = await browser.windows.create(wndInfo);
      let activeTabIdx = this._savedWndActiveTabIdxs.shift();
      let activeTabID = 0;

      if (activeTabIdx >= createdWnd.tabs.length) {
        // Some tabs may not be restored (e.g. "about:" pages), which would
        // mess up the saved index of the active tab.
        activeTabIdx = createdWnd.tabs.length - 1;
        activeTabID = createdWnd.tabs[activeTabIdx].id;
      }
      else {
        activeTabID = createdWnd.tabs[activeTabIdx].id;
      }
      await browser.tabs.update(activeTabID, {active: true});

      let numPinnedTabs = this._savedWndNumPinnedTabs.shift();
      for (let i = 0; i < numPinnedTabs; i++) {
        browser.tabs.update(createdWnd.tabs[i].id, {pinned: true});
      }
      
      if (closedWnd.focused) {
        focusedWndID = createdWnd.id;
      }
    }

    let replacemtWnd = await browser.windows.get(this._replacemtWndID);
    await browser.windows.remove(replacemtWnd.id);
    this._replacemtWndID = null;
    this._replaceSession = false;

    if (focusedWndID) {
      let updWnd = await browser.windows.update(focusedWndID, {focused: true});
    }
  },

  isStashed()
  {
    return this._replaceSession;
  }
};


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
        browser.tabs.create({ url: "pages/whatsnew.html" });
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
    minimizeCurrOpt: aeConst.MINIMIZE_CURR_OPT_RESTORE_MINZED_WND,
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
  let getBrwsInfo = browser.runtime.getBrowserInfo();
  let getPlatInfo = browser.runtime.getPlatformInfo();

  Promise.all([getBrwsInfo, getPlatInfo]).then(async (aResults) => {
    let brws = aResults[0];
    let platform = aResults[1];
    
    gHostAppVer = brws.version;
    log(`Panic Button/wx: Host app: ${brws.name} (version ${gHostAppVer})`);

    gOS = platform.os;
    log("Panic Button/wx: OS: " + gOS);

    await setPanicButtonCustomizations();

    log("Panic Button/wx: Initialization complete.");
  });
}


async function setPanicButtonCustomizations()
{
  await setToolbarButtonIcon(gPrefs.toolbarBtnIcon, gPrefs.toolbarBtnRevContrastIco);
  browser.browserAction.setTitle({ title: gPrefs.toolbarBtnLabel });
}


async function setToolbarButtonIcon(aIconIndex, isReverseContrast)
{
  if (aIconIndex == aeConst.CUSTOM_ICON_IDX) {
    await setCustomToolbarButtonIcon();
    return;
  }
  
  let toolbarBtnIconName = gToolbarBtnIcons[aIconIndex];
  let revCntrst = isReverseContrast ? "_reverse" : "";

  browser.browserAction.setIcon({
    path: {
      16: "img/" + toolbarBtnIconName + "16" + revCntrst + ".svg",
      32: "img/" + toolbarBtnIconName + "16" + revCntrst + ".svg",
    }
  });
}


async function setCustomToolbarButtonIcon()
{
  let prefs = await browser.storage.local.get();
  let iconDataURL = prefs.toolbarBtnData;

  browser.browserAction.setIcon({
    path: {
      16: iconDataURL,
      32: iconDataURL,
      64: iconDataURL
    }
  });
}


function getToolbarButtonIconsMap()
{
  return gToolbarBtnIcons;
}


//
// Event listeners
//

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

  await setPanicButtonCustomizations();
});


browser.runtime.onMessage.addListener(async (aRequest) => {
  log(`Panic Button/wx: Received message "${aRequest.msgID}"`);
    
  let resp = null;

  if (aRequest.msgID == "get-system-info") {
    resp = {
      os: getOS(),
    };
  }
  else if (aRequest.msgID == "get-prefs") {
    resp = { prefs: getPrefs() };
  }
  else if (aRequest.msgID == "get-toolbar-btn-icons-map") {
    resp = { toolbarBtnIconsMap: getToolbarButtonIconsMap() };
  }
  else if (aRequest.msgID == "restore-brws-sess") {
    gBrowserSession.restore();
  }
  else if (aRequest.msgID == "get-restore-sess-passwd") {
    resp = { restoreSessPwd: getRestoreSessPasswd() };
  }
  else if (aRequest.msgID == "set-restore-sess-passwd") {
    await setRestoreSessPasswd(aRequest.passwd);
    resp = { status: "ok" };
  }
  else if (aRequest.msgID == "rm-restore-sess-passwd") {
    await removeRestoreSessPasswd();
    resp = { status: "ok" };
  }

  if (resp) {
    return Promise.resolve(resp);
  }
});


//
// Browser action
//

async function panic()
{
  if (gBrowserSession.isStashed()) {
    if (gPrefs.restoreSessPswdEnabled) {
      browser.tabs.update({ url: "pages/restoreSession.html" });
    }
    else {
      await gBrowserSession.restore();
    }
  }
  else if (gBrowserWindows.isCamouflageWindowOpen()) {
    await gBrowserWindows.restoreAll();
  }
  else if (gBrowserWindows.isMinimized()
           && gPrefs.minimizeCurrOpt == aeConst.MINIMIZE_CURR_OPT_RESTORE_MINZED_WND) {
    if (! await gBrowserWindows.restoreMinimized()) {
      await gBrowserWindows.minimizeCurrent();
    }
  }
  else {
    if (gPrefs.action == aeConst.PANICBUTTON_ACTION_REPLACE) {
      let replacemtURL = gPrefs.replacementWebPgURL;
      await gBrowserSession.saveAndClose(replacemtURL);
    }
    else if (gPrefs.action == aeConst.PANICBUTTON_ACTION_MINIMIZE) {
      await gBrowserWindows.minimizeAll();
    }
    else if (gPrefs.action == aeConst.PANICBUTTON_ACTION_QUIT) {
      await gBrowserWindows.closeAll();
    }
    else if (gPrefs.action == aeConst.PANICBUTTON_ACTION_MINIMIZE_CURR) {
      await gBrowserWindows.minimizeCurrent();
    }
  }
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
