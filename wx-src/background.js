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
    log("Panic Button/wx: Extension installed");

    setDefaultPrefs().then(() => {
      init();
    })
  }
  else if (aDetails.reason == "update") {
    log("Panic Button/wx: Upgrading from version " + aDetails.previousVersion);

    let oldVer = aDetails.previousVersion;

    browser.storage.local.get().then(aPrefs => {
      gPrefs = aPrefs;

      if (versionCompare(oldVer, "4.1") < 0) {
        let newPrefs = {
          panicButtonKey: "F9",
          panicButtonKeyMod: "",
          restoreSessPswdEnabled: false,
          restoreSessPswd: "",
        };

        for (let pref in newPrefs) {
          gPrefs[pref] = newPrefs[pref];
        }

        browser.storage.local.set(newPrefs).then(() => {
          init();
        });
      }
      else {
        init();
      }
    });
  }
});


//
// Initializing integration with host application
//

browser.runtime.onStartup.addListener(() => {
  log("Panic Button/wx: Initializing Panic Button during browser startup.");

  browser.storage.local.get().then(aPrefs => {
    if ("action" in aPrefs) {
      gPrefs = aPrefs;
      init();
    }
    else {
      log("Panic Button/wx: No user preferences were previously set.  Setting default user preferences.");
      setDefaultPrefs().then(() => {
        init();
      });
    }
  });
});


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
    restoreSessPswd: "",
  };

  gPrefs = aePanicButtonPrefs;
  await browser.storage.local.set(aePanicButtonPrefs);
}


function init()
{
  if (gIsInitialized) {
    return;
  }

  browser.runtime.getBrowserInfo().then(aBrws => {
    log(`Panic Button/wx: Host app: ${aBrws.name} ${aBrws.version}`);
  });

  browser.runtime.getPlatformInfo().then(aPlatform => {
    gOS = aPlatform.os;
    log("Panic Button/wx: OS: " + gOS);
  });
  
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
    setPanicButtonKeys();
  });

  setPanicButtonCustomizations();

  setPanicButtonKeys().then(() => {
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


async function setPanicButtonKeys()
{
  let shortcutKeyMod = gPrefs.panicButtonKeyMod;
  if (shortcutKeyMod) {
    shortcutKeyMod += "+";
  }

  let shortcut = `${shortcutKeyMod}${gPrefs.panicButtonKey}`;
  
  await browser.commands.update({
    name: "ae-panicbutton",
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
    return;
  }
  
  // TO DO: Get the setting directly from `gPrefs`. No need to do this.
  browser.storage.local.get().then(aResult => {
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
  browser.sessions.getRecentlyClosed().then(aSessions => {
    if (aSessions.length == 0) {
      warn("No sessions found");
      return;
    }

    log(`Number of sessions available: ${aSessions.length}`);
    log(`Number of windows to restore: ${gNumClosedWnds}`);
    log("Restoring browser session...");
      
    for (let i = 0; i < gNumClosedWnds; i++) {
      let sess = aSessions[i];
      
      if (! sess) {
        log("The 'sess' object is not defined, continuing loop...");
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
        log("Restored session: " + sessID);
      }, onError);
    }
            
    gNumClosedWnds = 0;
    
    if (gReplaceSession) {
      log("Panic Button/wx: Closing replacement browser window");
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
  log("Panic Button/wx: Invoked function minimizeAll()");

  let getAllWnd = browser.windows.getAll();
  getAllWnd.then(aWnds => {
    for (let wnd of aWnds) {
      let updateWnd = browser.windows.update(wnd.id, { state: "minimized" });
      updateWnd.then(() => {
        log("Minimized window: " + wnd.id);
      }, onError);
    }
  }, onError);
}


function closeAll(aSaveSession, aReplacementURL)
{
  log("Panic Button/wx: Invoked function closeAll()");
  log(`aSaveSession = ${aSaveSession}, aReplacementURL = ${aReplacementURL}`);

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
      
      log("Closing window " + wnd.id);
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


function getPrefs()
{
  return gPrefs;
}


// Adapted from <https://github.com/hirak/phpjs>
function versionCompare(v1, v2, operator) {
  var i = 0,
    x = 0,
    compare = 0,
    // vm maps textual PHP versions to negatives so they're less than 0.
    // PHP currently defines these as CASE-SENSITIVE. It is important to
    // leave these as negatives so that they can come before numerical versions
    // and as if no letters were there to begin with.
    // (1alpha is < 1 and < 1.1 but > 1dev1)
    // If a non-numerical value can't be mapped to this table, it receives
    // -7 as its value.
    vm = {
      'dev'   : -6,
      'alpha' : -5,
      'a'     : -5,
      'beta'  : -4,
      'b'     : -4,
      'RC'    : -3,
      'rc'    : -3,
      '#'     : -2,
      'p'     : 1,
      'pl'    : 1
    },
    // This function will be called to prepare each version argument.
    // It replaces every _, -, and + with a dot.
    // It surrounds any nonsequence of numbers/dots with dots.
    // It replaces sequences of dots with a single dot.
    //    version_compare('4..0', '4.0') == 0
    // Important: A string of 0 length needs to be converted into a value
    // even less than an unexisting value in vm (-7), hence [-8].
    // It's also important to not strip spaces because of this.
    //   version_compare('', ' ') == 1
    prepVersion = function(v) {
      v = ('' + v)
        .replace(/[_\-+]/g, '.');
      v = v.replace(/([^.\d]+)/g, '.$1.')
        .replace(/\.{2,}/g, '.');
      return (!v.length ? [-8] : v.split('.'));
    };
  // This converts a version component to a number.
  // Empty component becomes 0.
  // Non-numerical component becomes a negative number.
  // Numerical component becomes itself as an integer.
  numVersion = function(v) {
    return !v ? 0 : (isNaN(v) ? vm[v] || -7 : parseInt(v, 10));
  };
  v1 = prepVersion(v1);
  v2 = prepVersion(v2);
  x = Math.max(v1.length, v2.length);
  for (i = 0; i < x; i++) {
    if (v1[i] == v2[i]) {
      continue;
    }
    v1[i] = numVersion(v1[i]);
    v2[i] = numVersion(v2[i]);
    if (v1[i] < v2[i]) {
      compare = -1;
      break;
    } else if (v1[i] > v2[i]) {
      compare = 1;
      break;
    }
  }
  if (!operator) {
    return compare;
  }

  // Important: operator is CASE-SENSITIVE.
  // "No operator" seems to be treated as "<."
  // Any other values seem to make the function return null.
  switch (operator) {
  case '>':
  case 'gt':
    return (compare > 0);
  case '>=':
  case 'ge':
    return (compare >= 0);
  case '<=':
  case 'le':
    return (compare <= 0);
  case '==':
  case '=':
  case 'eq':
    return (compare === 0);
  case '<>':
  case '!=':
  case 'ne':
    return (compare !== 0);
  case '':
  case '<':
  case 'lt':
    return (compare < 0);
  default:
    return null;
  }
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
