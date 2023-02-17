/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let gOS;
let gHostAppVer;
let gIsFirstRun = false;
let gIsMajorVerUpdate = false;

// TO DO: Save and load from storage, not in global var.
let gChangeIconWndID = null;

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

    let {showCamouflageWebPg, camouflageWebPgURL} = await aePrefs.getAllPrefs();
    if (showCamouflageWebPg) {
      this._openCamouflageWnd(camouflageWebPgURL);
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

  unsaveMinimizedWnd()
  {
    this._minzWndID = null;
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
  CHANGE_ICON_EXT_PG_URL: browser.runtime.getURL("pages/changeIcon.html"),
  
  _replaceSession: false,
  _replacemtWndID: null,
  _savedWnds: [],
  _readerModeTabIDs: new Set(),

  async saveAndClose(aReplacementURL)
  {
    let wnds = await browser.windows.getAll({ populate: true });

    if (aReplacementURL) {
      let replcWnd = await browser.windows.create({ url: aReplacementURL });
      this._replacemtWndID = replcWnd.id;
      this._replaceSession = true;
    }

    for (let wnd of wnds) {
      if (wnd.id == this._replacemtWndID) {
	continue;
      }

      // Don't save the Change Icon popup window.
      if (wnd.tabs[0].url == this.CHANGE_ICON_EXT_PG_URL) {
        browser.windows.remove(wnd.id);
        continue;
      }

      // Also discard other WebExtension popup windows.
      if (wnd.tabs[0].url.startsWith("moz-extension://")) {
        log(`Discarding WebExtension popup window - URL: ${wnd.tabs[0].url}`);
        browser.windows.remove(wnd.id);
        continue;
      }

      log("Panic Button/wx: gBrowserSession.saveAndClose(): Saving browser window:");
      log(wnd);

      let activeTabIdx = wnd.tabs.findIndex(aTab => aTab.active);
      let numPinnedTabs = 0;
      for (let i = 0; i < wnd.tabs.length; i++) {
        if (wnd.tabs[i].pinned) {
	  numPinnedTabs++;
        }
        else {
	  break;
        }
      };

      let savedWnd = new aeSavedWindow(activeTabIdx, numPinnedTabs, wnd);
      this._savedWnds.push(savedWnd);

      browser.windows.remove(wnd.id);
    }

    this._readerModeTabIDs.clear();
  },

  async restore()
  {
    let focusedWndID = null;
    let restoreSessInactvTabsZzz = await aePrefs.getPref("restoreSessInactvTabsZzz");
    
    while (this._savedWnds.length > 0) {
      let closedWnd = this._savedWnds.shift();
      let wndPpty = {
        type: closedWnd.info.type,
        incognito: closedWnd.info.incognito,
        state: closedWnd.info.state,
      };

      if (closedWnd.info.state == "normal") {
        wndPpty.top = closedWnd.info.top;
        wndPpty.left = closedWnd.info.left;
        wndPpty.width = closedWnd.info.width;
        wndPpty.height = closedWnd.info.height;
      }

      let savedTabs = [];
      
      if (closedWnd.info.tabs.length == 1) {
        let savedTab = closedWnd.info.tabs[0];
        let brwsTabURL = savedTab.url;

        // Default to home page if URL is restricted.
        brwsTabURL = this._isNonRestrictedURL(brwsTabURL) ? brwsTabURL : null;

        if (savedTab.isInReaderMode) {
          wndPpty.url = this._sanitizeReaderModeURL(brwsTabURL);
          this._readerModeTabIDs.add(savedTab.id);
        }
        else {
          wndPpty.url = brwsTabURL;
        }
      }
      else {
        wndPpty.url = "about:blank";
        savedTabs = closedWnd.info.tabs.filter(aTab => this._isNonRestrictedURL(aTab.url));

        if (savedTabs.length == 0) {
          wndPpty.url = null;
        }
      }

      let createdWnd = await browser.windows.create(wndPpty);
      let wndID = createdWnd.id;

      savedTabs.forEach(async (aTab, aIndex, aArray) => {
        let isReaderMode = false;
        let tabPpty = {
          windowId: wndID,
          discarded: restoreSessInactvTabsZzz,
          cookieStoreId: aTab.cookieStoreId,
        };
        if (aTab.isInReaderMode) {
          tabPpty.url = this._sanitizeReaderModeURL(aTab.url);
          isReaderMode = true;
        }
        else {
          tabPpty.url = aTab.url;
        }

        let tab = await browser.tabs.create(tabPpty);
        if (isReaderMode) {
          this._readerModeTabIDs.add(tab.id);
        }
      });

      if (savedTabs.length > 0) {
        // Get rid of dummy browser tab.
        let brwsTabs = await browser.tabs.query({
          windowId: wndID,
          index: 0,
        });
        await browser.tabs.remove(brwsTabs[0].id);
      }
      
      let activeTabIdx = closedWnd.activeTabIdx;
      let activeTabID = 0;

      let wnd = await browser.windows.get(createdWnd.id, { populate: true });

      log("Panic Button/wx: gBrowserSession.restore(): Restored browser window:");
      log(wnd);

      if (activeTabIdx >= wnd.tabs.length) {
        // Some tabs may not be restored (e.g. "about:" pages), which would
        // mess up the saved index of the active tab.
        activeTabIdx = wnd.tabs.length - 1;
        activeTabID = wnd.tabs[activeTabIdx].id;
      }
      else {
        activeTabID = wnd.tabs[activeTabIdx].id;
      }

      log("Index of active browser tab: " + activeTabIdx + "; active browser tab ID: " + activeTabID);
      await browser.tabs.update(activeTabID, {active: true});

      let numPinnedTabs = closedWnd.numPinnedTabs;
      for (let i = 0; i < numPinnedTabs; i++) {
        browser.tabs.update(wnd.tabs[i].id, {pinned: true});
      }

      if (closedWnd.info.focused) {
        focusedWndID = wnd.id;
      }
    }
    // END while

    let replacemtWnd = await browser.windows.get(this._replacemtWndID);
    await browser.windows.remove(replacemtWnd.id);
    this._replacemtWndID = null;
    this._replaceSession = false;

    if (focusedWndID) {
      await browser.windows.update(focusedWndID, {focused: true});
    }
  },

  isStashed()
  {
    return this._replaceSession;
  },

  isReaderModeTab(aTabID)
  {
    return this._readerModeTabIDs.has(aTabID);
  },

  async restoreReaderModeTab(aTabID)
  {
    let brwsTab = await browser.tabs.get(aTabID);
    if (! brwsTab.isInReaderMode) {
      try {
        await browser.tabs.toggleReaderMode(aTabID);
      }
      catch (e) {
        warn(`Panic Button/wx: gBrowserSession.restoreReaderModeTab(): Unable to turn on Reader Mode for tab ${aTabID}: ${e}`);
        return;
      }
    }
    this._readerModeTabIDs.delete(aTabID);
  },
  

  //
  // Private helper methods
  //

  _isNonRestrictedURL(aURL)
  {
    // The restricted URLs for browser.tabs.create() are described here:
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/create
    let rv = true;

    if (aURL.startsWith("about:reader")) {
      rv = true;
    }
    else {
      rv = !(aURL.startsWith("chrome:")
	     || aURL.startsWith("file:")
	     || aURL.startsWith("javascript:")
	     || aURL.startsWith("data:")
	     || aURL.startsWith("about:"));
    }
    return rv;
  },

  _sanitizeReaderModeURL(aURL)
  {
    // Reader Mode tabs have a special URL format: "about:reader?url=<Encoded URL>"
    let rv = "";
    let encURL = aURL.substr(17);

    rv = decodeURIComponent(encURL);

    return rv;
  }
};


browser.runtime.onInstalled.addListener(async (aInstall) => {
  if (aInstall.reason == "install") {
    log("Panic Button/wx: Extension installed");
  }
  else if (aInstall.reason == "update") {
    let oldVer = aInstall.previousVersion;
    let currVer = browser.runtime.getManifest().version;   
    log(`Panic Button/wx: Upgrading from version ${oldVer} to ${currVer}`);
  }
});


//
// Initializing integration with host application
//

void async function ()
{
  log("Panic Button/wx: Extension startup initiated.");

  let prefs = await aePrefs.getAllPrefs();
  
  if (! aePrefs.hasUserPrefs(prefs)) {
    log("Initializing Panic Button user preferences.");
    gIsFirstRun = true;
    await aePrefs.setUserPrefs(prefs);
  }

  if (! aePrefs.hasSantaCruzPrefs(prefs)) {
    log("Initializing 4.1 user preferences");
    await aePrefs.setSantaCruzPrefs(prefs);
  }

  if (! aePrefs.hasSantaRosaPrefs(prefs)) {
    log("Initializing 4.2 user preferences.");
    await aePrefs.setSantaRosaPrefs(prefs);
  }

  if (! aePrefs.hasSantaCatalinaPrefs(prefs)) {
    log("Initializing 4.3 user preferences.");
    await aePrefs.setSantaCatalinaPrefs(prefs);
  }

  if (! aePrefs.hasSanNicolasPrefs(prefs)) {
    // This should be set when updating to the latest release.
    gIsMajorVerUpdate = true;

    log("Initializing 4.4 user preferences.");
    await aePrefs.setSanNicolasPrefs(prefs);
  }
  
  init(prefs);
}();


async function init(aPrefs)
{
  let [brws, platform] = await Promise.all([
    browser.runtime.getBrowserInfo(),
    browser.runtime.getPlatformInfo(),
  ]);

  gHostAppVer = brws.version;
  log(`Panic Button/wx: Host app: ${brws.name} (version ${gHostAppVer})`);

  gOS = platform.os;
  log("Panic Button/wx: OS: " + gOS);

  if (aPrefs.autoAdjustWndPos === null) {
    let autoAdjustWndPos = gOS == "win";
    await aePrefs.setPrefs({autoAdjustWndPos});
  }

  await setPanicButtonCustomizations(aPrefs);
  
  browser.menus.create({
    id: "ae-panicbutton-change-icon",
    title: browser.i18n.getMessage("chgIconMenu"),
    contexts: ["browser_action"],
  });
  browser.menus.create({
    id: "ae-panicbutton-prefs",
    title: browser.i18n.getMessage("prefsPgMenu"),
    contexts: ["browser_action"],
  });

  if (gIsMajorVerUpdate && !gIsFirstRun) {
    browser.tabs.create({ url: "pages/whatsnew.html" });
  }

  log("Panic Button/wx: Initialization complete.");
}


async function setPanicButtonCustomizations(aPrefs)
{
  await setToolbarButtonIcon(aPrefs.toolbarBtnIcon, aPrefs.toolbarBtnRevContrastIco);
  browser.browserAction.setTitle({title: aPrefs.toolbarBtnLabel});
}


async function setToolbarButtonIcon(aIconIndex, isReverseContrast)
{
  if (aIconIndex == aeConst.CUSTOM_ICON_IDX) {
    await setCustomToolbarButtonIcon();
    return;
  }

  let toolbarBtnIcons = getToolbarButtonIconsMap();
  let toolbarBtnIconName = toolbarBtnIcons[aIconIndex];
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
  let iconDataURL = await aePrefs.getPref("toolbarBtnData");

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
  let rv = [
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

  return rv;
}


//
// Event handlers
//

browser.browserAction.onClicked.addListener(async (aTab) => {
  await panic();
});

browser.commands.onCommand.addListener(async (aCmd) => {
  let shortcutKey = await aePrefs.getPref("shortcutKey");
  if (aCmd == "ae-panicbutton" && shortcutKey) {
    await panic();
  }
});

browser.menus.onClicked.addListener((aInfo, aTab) => {
  if (aInfo.menuItemId == "ae-panicbutton-change-icon") {
    openChangeIconDlg();
  }
  else if (aInfo.menuItemId == "ae-panicbutton-prefs") {
    browser.runtime.openOptionsPage();
  }
});


browser.storage.onChanged.addListener(async (aChanges, aAreaName) => {
  let prefs = await aePrefs.getAllPrefs();
  await setPanicButtonCustomizations(prefs);
});


browser.runtime.onMessage.addListener(async (aRequest) => {
  log(`Panic Button/wx: Received message "${aRequest.msgID}"`);
    
  let resp = null;

  switch (aRequest.msgID) {
  case "get-system-info":
    resp = {os: getOS()};
    break;

  case "get-toolbar-btn-icons-map":
    resp = {toolbarBtnIconsMap: getToolbarButtonIconsMap()};
    break;

  case "restore-brws-sess":
    gBrowserSession.restore();
    break;

  case "get-restore-sess-passwd":
    let restoreSessPwd = await getRestoreSessPasswd();
    resp = {restoreSessPwd};
    break;

  case "set-restore-sess-passwd":
    await setRestoreSessPasswd(aRequest.passwd);
    resp = {};
    break;

  case "rm-restore-sess-passwd":
    await removeRestoreSessPasswd();
    resp = {};
    break;

  case "close-change-icon-dlg":
    gChangeIconWndID = null;
    break;

  case "ping-change-icon-dlg":
    resp = {isChangeIconDlgOpen: !!gChangeIconWndID};
    break;

  case "unsave-minimized-wnd":
    gBrowserWindows.unsaveMinimizedWnd();
    break;

  default:
    break;
  }

  if (resp) {
    return Promise.resolve(resp);
  }
});


browser.tabs.onUpdated.addListener((aTabID, aChangeInfo, aTab) => {
  if (aChangeInfo.status == "complete") {
    if (gBrowserSession.isStashed()) {
      // Don't do anything for the temporary replacement browser window that was
      // opened when Hide And Replace was invoked.
      return;
    }

    if (gBrowserSession.isReaderModeTab(aTabID)) {
      log(`Attempting to restore Reader Mode on tab ${aTabID}\nstatus: ${aTab.status}\nURL: ${aTab.url}\ndiscarded: ${aTab.discarded}\nisArticle: ${aTab.isArticle}\nisInReaderMode: ${aTab.isInReaderMode}`);
      gBrowserSession.restoreReaderModeTab(aTabID);
    }
  }
}, { properties: ["status"] });


//
// Browser action
//

async function panic()
{
  let prefs = await aePrefs.getAllPrefs();
  
  if (gBrowserSession.isStashed()) {
    if (prefs.restoreSessPswdEnabled) {
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
           && prefs.minimizeCurrOpt == aeConst.MINIMIZE_CURR_OPT_RESTORE_MINZED_WND) {
    if (! await gBrowserWindows.restoreMinimized()) {
      await gBrowserWindows.minimizeCurrent();
    }
  }
  else {
    if (prefs.action == aeConst.PANICBUTTON_ACTION_REPLACE) {
      let replacemtURL = prefs.replacementWebPgURL;
      await gBrowserSession.saveAndClose(replacemtURL);
    }
    else if (prefs.action == aeConst.PANICBUTTON_ACTION_MINIMIZE) {
      await gBrowserWindows.minimizeAll();
    }
    else if (prefs.action == aeConst.PANICBUTTON_ACTION_QUIT) {
      await gBrowserWindows.closeAll();
    }
    else if (prefs.action == aeConst.PANICBUTTON_ACTION_MINIMIZE_CURR) {
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
  await aePrefs.setPrefs({
    restoreSessPswdEnabled: true,
    restoreSessPswd: encPwd,
  });
}


async function getRestoreSessPasswd()
{
  // The following helper function is adapted from:
  // <https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_Unicode_Problem>
  function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  let rv = "";
  let encPwd = await aePrefs.getPref("restoreSessPswd");
  rv = b64DecodeUnicode(encPwd);

  return rv;
}


async function removeRestoreSessPasswd()
{
  let pswdPrefs = {
    restoreSessPswdEnabled: false,
    restoreSessPswd: null,
  };
  
  await aePrefs.setPrefs(pswdPrefs);
}


async function openChangeIconDlg()
{
  let url = browser.runtime.getURL("pages/changeIcon.html");

  async function getBrwsWndGeometry()
  {
    let rv = null;
    let wnd = await browser.windows.getCurrent();
    
    if (wnd) {
      rv = {
        width: wnd.width,
        height: wnd.height,
        left: wnd.left,
        top: wnd.top,
      };
    }

    return rv;
  }

  async function openChgIconDlgHelper()
  {
    // Don't open the Change Icon dialog if the extension preferences page is
    // already open.
    let resp = null;
    try {
      resp = await browser.runtime.sendMessage({msgID: "ping-ext-prefs-pg"});
    }
    catch {}
    if (resp) {
      browser.runtime.sendMessage({msgID: "ext-prefs-customize"});
      return;
    }
    
    let {autoAdjustWndPos} = await aePrefs.getAllPrefs();
    let width = 404;
    let height = 272;
    let left, top, wndGeom;

    if (autoAdjustWndPos) {
      wndGeom = await getBrwsWndGeometry();

      log(`Panic Button/wx: openChangeIconDlg() > openChgIconDlgHelper(): Retrieved window geometry data from currently focused window:`);
      log(wndGeom);
      
      let topOffset = (gOS == "mac" ? 96 : 128);

      if (wndGeom === null) {
        // Reached here if unable to calculate window geometry.
        // Fall back on default values.
        left = null;
        top = null;
      }
      else {
        if (wndGeom.width < width) {
          left = null;
        }
        else {
          left = Math.ceil((wndGeom.width - width) / 2) + wndGeom.left;
        }

        if ((wndGeom.height + topOffset) < height) {
          top = null;
        }
        else {
          top = wndGeom.top + topOffset;
        }
      }
    }
    else {
      left = 128;
      top = 96;
    }

    let wnd = await browser.windows.create({
      url, type: "detached_panel",
      width, height,
      left, top
    });

    gChangeIconWndID = wnd.id;

    // TO DO: This might not be needed anymore?
    browser.history.deleteUrl({ url });
  }
  // END nested functions

  if (gChangeIconWndID) {
    try {
      let wnd = await browser.windows.get(gChangeIconWndID);
      browser.windows.update(gChangeIconWndID, {focused: true});
    }
    catch (e) {
      // Handle dangling ref
      gChangeIconWndID = null;
      openChgIconDlgHelper();
    }
  }
  else {
    openChgIconDlgHelper();
  }
}


function getOS()
{
  return gOS;
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
