/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


let gIsInitialized = false;
let gOS;
let gPrefs;
let gHideAll = false;
let gRestoreSessionWndID = null;
let gReplaceSession = false;
let gReplacemtWndID = null;
let gNumClosedWnds = 0;

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
    console.log("Panic Button/wx: Extension installed");
  }
  else if (aDetails.reason == "upgrade") {
    console.log("Panic Button/wx: Upgrading from version " + aDetails.previousVersion);

    if (parseInt(aDetails.previousVersion) < 4) {
      console.log("Detected upgrade from legacy XUL version.");
    }
  }
});


//
// Initializing integration with host application
//

async function setDefaultPrefs()
{
  let aePanicButtonPrefs = {
    action: aeConst.PANICBUTTON_ACTION_REPLACE,
    toolbarBtnIcon: 0,
    toolbarBtnLabel: "Panic Button",
    toolbarBtnRevContrastIco: false,
    shortcutKey: true,
    replacementWebPgURL: aeConst.REPLACE_WEB_PAGE_DEFAULT_URL
  };

  gPrefs = aePanicButtonPrefs;
  await browser.storage.local.set(aePanicButtonPrefs);
}


function init()
{
  if (gIsInitialized) {
    return;
  }

  browser.runtime.getBrowserInfo().then(aInfo => { console.log(`Panic Button/wx: Host app: ${aInfo.name}, version ${aInfo.version}`); });

  browser.runtime.getPlatformInfo().then(aInfo => {
    gOS = aInfo.os;
    console.log("Panic Button/wx: OS: " + gOS);
  });

  browser.storage.local.get().then(aPrefs => {
    if (aPrefs.action === undefined) {
      console.log("Panic Button/wx: No user preferences were previously set.  Setting default user preferences.");
      setDefaultPrefs().then(() => {
        initHelper();
      });
    }
    else {
      gPrefs = aPrefs;
      initHelper();
    }
  });
}


function initHelper()
{
  console.log("Panic Button/wx: Initializing browser integration...");

  browser.windows.onCreated.addListener(aWnd => {
    console.log(`Panic Button/wx: Opening window... gRestoreSessionWndID = ${gRestoreSessionWndID}`);
  });

  browser.windows.onRemoved.addListener(aWndID => {
    console.log(`Panic Button/wx: Closing window... gRestoreSessionWndID = ${gRestoreSessionWndID}`);
    console.log("Closing window ID: " + aWndID);
  });

  browser.browserAction.onClicked.addListener(aTab => { panic() });

  browser.commands.onCommand.addListener(aCmd => {
    if (aCmd == "ae-panicbutton") {
      let getPrefs = browser.storage.local.get();
      getPrefs.then(aResult => {
        console.log("Panic Button/wx: Shortcut key enabled: " + aResult.shortcutKey);
        if (aResult.shortcutKey) {
          panic();
        }
      });
    }
  });

  browser.storage.onChanged.addListener((aChanges, aAreaName) => {
    console.log("Panic Button/wx: Detected change to local storage");

    let changedPrefs = Object.keys(aChanges);

    for (let pref of changedPrefs) {
      gPrefs[pref] = aChanges[pref].newValue;
    }

    setPanicButtonCustomizations();
  });
  
  gIsInitialized = true;
  console.log("Panic Button/wx: Initialization complete.");
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
      32: "img/" + toolbarBtnIconName + "32" + revCntrst + ".svg",
    }
  });      
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


function panic()
{
  
  if (gReplaceSession) {
    restoreBrowserSession();
    return;
  }
  
  let getPrefs = browser.storage.local.get();

  getPrefs.then(aResult => {
    let action = aResult.action;
    
    if (action == aeConst.PANICBUTTON_ACTION_REPLACE) {
      let replacementURL = aResult.replacementWebPgURL;
      closeAll(true, replacementURL);
    }
    else if (action == aeConst.PANICBUTTON_ACTION_MINIMIZE) {
      minimizeAll();
    }
    else if (action == aeConst.PANICBUTTON_ACTION_QUIT) {
      closeAll(false);
    }
  }, onError);
}


function restoreBrowserSession()
{
  let getSessions = browser.sessions.getRecentlyClosed();
  getSessions.then(aSessions => {
    if (aSessions.length == 0) {
      console.log("No sessions found");
      return;
    }

    console.log(`Number of sessions available: ${aSessions.length}`);
    console.log(`Number of windows to restore: ${gNumClosedWnds}`);
    console.log("Restoring browser session...");
      
    for (let i = 0; i < gNumClosedWnds; i++) {
      let sess = aSessions[i];
      
      if (! sess) {
        console.log("The 'sess' object is not defined, continuing loop...");
        continue;
      }
        
      let sessID = null;
      if (sess.tab) {
        sessID = sess.tab.sessionId;
      }
      else {
        sessID = sess.window.sessionId;
      }
      
      let restoreSession = browser.sessions.restore(sessID);
      restoreSession.then(aRestoredSession => {
        console.log("Restored session: " + sessID);
      }, onError);
    }
            
    gNumClosedWnds = 0;
    
    if (gReplaceSession) {
      console.log("Panic Button/wx: Closing replacement browser window");
      let replacemtWnd = browser.windows.get(gReplacemtWndID);
      replacemtWnd.then(aWnd => {
        browser.windows.remove(aWnd.id);
        gReplacemtWndID = null;
        gReplaceSession = false;
      }, onError);
    }
  }, onError);
}


function minimizeAll()
{
  console.log("Panic Button/wx: Invoked function minimizeAll()");

  let getAllWnd = browser.windows.getAll();
  getAllWnd.then(aWnds => {
    for (let wnd of aWnds) {
      let updateWnd = browser.windows.update(wnd.id, { state: "minimized" });
      updateWnd.then(() => {
        console.log("Minimized window: " + wnd.id);
      }, onError);
    }
  }, onError);
}


function closeAll(aSaveSession, aReplacementURL)
{
  console.log("Panic Button/wx: Invoked function closeAll()");
  console.log(`aSaveSession = ${aSaveSession}, aReplacementURL = ${aReplacementURL}`);

  if (aSaveSession && aReplacementURL) {
    gReplaceSession = true;

    let openWnd = browser.windows.create({
      url: aReplacementURL
    });
    openWnd.then(aWnd => { gReplacemtWndID = aWnd.id; }, onError);
  }
  
  let getAllWnd = browser.windows.getAll();
  getAllWnd.then(aWnds => {
    for (let wnd of aWnds) {
      if (gReplaceSession && wnd.id == gReplacemtWndID) {
        continue;
      }
      if (gHideAll && wnd.id == gRestoreSessionWndID) {
        continue;
      }
      
      console.log("Closing window " + wnd.id);
      browser.windows.remove(wnd.id);

      if (aSaveSession) {
        gNumClosedWnds++;
      }
    }
  }, onError);
}


function getOS()
{
  return gOS;
}

function onError(aError)
{
  console.log("!! Panic Button/wx: " + aError);
}


init();

