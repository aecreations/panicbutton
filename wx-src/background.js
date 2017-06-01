/* -*- mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Panic Button.
 *
 * The Initial Developer of the Original Code is 
 * Alex Eng <ateng@users.sourceforge.net>.
 * Portions created by the Initial Developer are Copyright (C) 2008-2017
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

const PANICBUTTON_ACTION_REPLACE = 0;
const PANICBUTTON_ACTION_MINIMIZE = 1;
const PANICBUTTON_ACTION_QUIT = 2;

const REPLACE_WEB_PAGE_DEFAULT_URL = "http://aecreations.sourceforge.net/";


var gHideAll = false;
var gRestoreSessionWndID = null;
var gReplaceSession = false;
var gReplacemtWndID = null;
var gNumClosedWnds = 0;
var gResetPrefs = false;


function init()
{
  browser.runtime.onInstalled.addListener(aDetails => {
    if (aDetails.reason == "install") {
      console.log("Panic Button/wx: Extension installed - initializing prefs");
      setDefaultPrefs();
    }
  });

  browser.storage.onChanged.addListener((aChanges, aAreaName) => {
    console.log("Panic Button/wx: Detected change to local storage");

    let changedPrefs = Object.keys(aChanges);

    for (let pref of changedPrefs) {
      console.log("Setting pref [" + pref + " = " + aChanges[pref].newValue + "]");
      setPanicButtonCustomization(pref, aChanges[pref].newValue);
    }
  });
  
  browser.windows.onCreated.addListener(aWnd => {
    console.log(`Panic Button/wx: Opening window... gRestoreSessionWndID = ${gRestoreSessionWndID}`);
  });

  browser.windows.onRemoved.addListener(aWndID => {
    console.log(`Panic Button/wx: Closing window... gRestoreSessionWndID = ${gRestoreSessionWndID}`);
    console.log("Closing window ID: " + aWndID);
  });

  let brwsInfo = browser.runtime.getBrowserInfo();
  brwsInfo.then(aInfo => { console.log(`Panic Button/wx: Host app: ${aInfo.name}, version ${aInfo.version}`); });

  let sysInfo = browser.runtime.getPlatformInfo();
  sysInfo.then(aInfo => { console.log("Panic Button/wx: OS: " + aInfo.os); });

  browser.browserAction.onClicked.addListener(aTab => { panic() });

  let getPrefs = browser.storage.local.get();
  getPrefs.then(aResult => {
    console.log("Setting preferences for Panic Button/wx");

    // Handle the case where the prefs aren't initialized yet, because the
    // above onInstalled event handler has not yet finished.
    let toolbarBtnIconIdx = aResult.toolbarBtnIcon;
    if (aResult.toolbarBtnIcon !== undefined) {
      setToolbarButtonIcon(toolbarBtnIconIdx);
    }
    
    let toolbarButtonLabel = aResult.toolbarBtnLabel;
    if (aResult.toolbarBtnLabel !== undefined) {
      browser.browserAction.setTitle({ title: toolbarButtonLabel });
    }
  });

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
}


function setDefaultPrefs()
{
  let aePanicButtonPrefs = {
    action: PANICBUTTON_ACTION_REPLACE,
    toolbarBtnIcon: 0,
    toolbarBtnLabel: "Panic Button",
    shortcutKey: true,
    replacementWebPgURL: REPLACE_WEB_PAGE_DEFAULT_URL
  };
    
  let initPrefs = browser.storage.local.set(aePanicButtonPrefs);
  initPrefs.catch(onError);
}


function setPanicButtonCustomization(aPrefName, aPrefValue)
{
  switch (aPrefName) {
  case "toolbarBtnIcon":
    setToolbarButtonIcon(aPrefValue);
    break;

  case "toolbarBtnLabel":
    browser.browserAction.setTitle({ title: aPrefValue });
    break;

  default:
    break;
  }
}


function setToolbarButtonIcon(aIconIndex)
{
  let toolbarBtnIcons = ["default", "exclamation-in-ball", "quit", "exit-door", "smiley", "desktop", "computer", "letter-a"];

  let toolbarBtnIconName = toolbarBtnIcons[aIconIndex];
  browser.browserAction.setIcon({
    path: {
      16: "icons/" + toolbarBtnIconName + "16.png",
      32: "icons/" + toolbarBtnIconName + "32.png",
      64: "icons/" + toolbarBtnIconName + "64.png"
    }
  });
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
    
    if (action == PANICBUTTON_ACTION_REPLACE) {
      let replacementURL = aResult.replacementWebPgURL;
      closeAll(true, replacementURL);
    }
    else if (action == PANICBUTTON_ACTION_MINIMIZE) {
      minimizeAll();
    }
    else if (action == PANICBUTTON_ACTION_QUIT) {
      closeAll(false);
    }
  }, onError);
}


function restoreBrowserSession()
{
  // Requires Firefox 52 or newer.
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
  else if (aSaveSession && !aReplacementURL) {
    gHideAll = true;

    let openRestoreSessionWnd = browser.windows.create({
      url: "./restoreSession.html",
      type: "detached_panel",
      width: 208,
      height: 72
    });

    openRestoreSessionWnd.then(aWnd => {
      gRestoreSessionWndID = aWnd.id;
      console.log("Restore Session windoid ID: " + aWnd.id);
    }, onError);
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


function onError(aError)
{
  console.log("!! Panic Button/wx: " + aError);
}


init();

