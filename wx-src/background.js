/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


let gIsInitialized = false;
let gOS;
let gHostAppVer;
let gPrefs;
let gRestoreSessionWndID = null;
let gReplaceSession = false;
let gReplacemtWndID = null;
let gShowCamouflageWnd = false;
let gCamouflageWndID = null;
let gMinimizedWndStates = [];

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
      if (! hasSanMiguelPrefs()) {
        browser.tabs.create("pages/update-4.3.html");

        log("Initializing 4.3 user preferences.");
        return setSanMiguelPrefs();
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


function hasSanMiguelPrefs()
{
  // Version 4.3
  return gPrefs.hasOwnProperty("migratedKeybShct");
}


async function setSanMiguelPrefs()
{
  let newPrefs = {
    migratedKeybShct: false,
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
    migratedKeybShct: false,
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

    browser.windows.onCreated.addListener(aWnd => {
      log(`Panic Button/wx: Opening window... gRestoreSessionWndID = ${gRestoreSessionWndID}`);
    });

    browser.windows.onRemoved.addListener(aWndID => {
      log(`Panic Button/wx: Closing window... gRestoreSessionWndID = ${gRestoreSessionWndID}`);
      log("Closing window ID: " + aWndID);
    });

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
      if (! gPrefs.migratedKeybShct) {
        migratePanicButtonKeys().then(() => {
          gIsInitialized = true;
          log("Panic Button/wx: Migrated keyboard shortcut for Panic Button action (default key now ALT+F9).\nInitialization complete.");
        });
      }
      else {
        gIsInitialized = true;
        log("Panic Button/wx: Initialization complete.");
      }
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


async function migratePanicButtonKeys()
{
  let cmds = await browser.commands.getAll();

  if (cmds[0].shortcut == "F9") {  // Command name "ae-panicbutton"
    await browser.commands.update({
      name: aeConst.CMD_PANIC_BUTTON_ACTION,
      shortcut: aeConst.KEY_PANIC_BUTTON_ACTION,
    });
  }
  await browser.storage.local.set({ migratedKeybShct: true});
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
  browser.sessions.getRecentlyClosed().then(aSessions => {
    if (aSessions.length == 0) {
      warn("Panic Button/wx: restoreBrowserSession(): No sessions found");
      return;
    }

    log(`Panic Button/wx: restoreBrowserSession(): Number of sessions available: ${aSessions.length}`);
    log("Session data:");
    log(aSessions);
    log("Restoring browser session...");

    let restoredSessions = [];

    for (let i = 0; i < aSessions.length; i++) {
      let sess = aSessions[i];
      
      if (! sess) {
        log("The 'sess' object is not defined, continuing loop...");
        continue;
      }
        
      let sessID = null;
      if (sess.tab) {
        log("Restoring session tab");
        sessID = sess.tab.sessionId;
      }
      else {
        log("Restoring session window");
        sessID = sess.window.sessionId;
      }
      log("Panic Button/wx: restoreBrowserSession(): Restoring session ID: " + sessID);

      restoredSessions.push(browser.sessions.restore(sessID));
    }

    Promise.all(restoredSessions).then(aResults => {
      // !! BUG !!
      // This doesn't get executed if there are more than 1 browser windows to restore.
      log("Panic Button/wx: Finished restoring browser sessions. Result:");
      log(aResults);

      if (gReplaceSession) {
        log(`Panic Button/wx: Closing replacement browser window (window ID: ${gReplacemtWndID})`);
        let replacemtWnd = browser.windows.get(gReplacemtWndID);
        replacemtWnd.then(aWnd => {
          return browser.windows.remove(aWnd.id);

        }).then(() => {
          gReplacemtWndID = null;
          gReplaceSession = false;

          browser.sessions.getRecentlyClosed().then(aSessions => {
            log("Panic Button/wx: Forgetting session for the now-closed replacement window.");
            let closedSess = aSessions[0];
            browser.sessions.forgetClosedWindow(closedSess.window.sessionId);
          });
        });
      }
    }).catch(aErr => {
      console.error("Panic Button/wx: Error restoring session " + sessID + ":\n" + aErr);
    });            
  });
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

  if (aSaveSession && aReplacementURL) {
    gReplaceSession = true;

    log("Panic Button/wx: Opening replacement window first, before closing all browser windows.");
    browser.windows.create({ url: aReplacementURL }).then(aWnd => {
      gReplacemtWndID = aWnd.id;
      info("Window ID of temporary replacement window: " + gReplacemtWndID);

      closeAllHelper();
    });
  }
  else {
    closeAllHelper();
  }
}


function closeAllHelper()
{
  browser.windows.getAll().then(aWnds => {
    log("Panic Button/wx: Total number of windows currently open: " + aWnds.length);

    for (let wnd of aWnds) {
      if (gReplaceSession && wnd.id == gReplacemtWndID) {
        log(`Skipping temporary replacement window (ID = ${gReplacemtWndID}).`);
        continue;
      }

      log("Panic Button/wx::closeAllHelper(): Closing window " + wnd.id);
      browser.windows.remove(wnd.id);
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
