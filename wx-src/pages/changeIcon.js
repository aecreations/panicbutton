/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


function $(aID)
{
  return document.getElementById(aID);
}


async function init()
{
  browser.history.deleteUrl({url: window.location.href});

  let prefs = await aePrefs.getAllPrefs();
  
  if (prefs.toolbarBtnRevContrastIco) {
    $("toolbar-button-icon").setAttribute("colorscheme", "dark");
  }

  let resp = await browser.runtime.sendMessage({
    msgID: "get-toolbar-btn-icons-map"
  });
  let toolbarBtnIcons = resp.toolbarBtnIconsMap;

  aeToolbarIconPicker.init(
    "toolbar-button-icon",
    toolbarBtnIcons,
    $("btn-accept"),
    $("more-customzns")
  );

  if (prefs.toolbarBtnIcon == aeToolbarIconPicker.CUSTOM_ICON_IDX) {
    let customIconRadio = $("custom-icon");
    customIconRadio.style.visibility = "visible";
    $("custom-icon-label").style.visibility = "visible";

    let canvas = $("custom-icon-img");
    let canvasCtx = canvas.getContext("2d");
    let img = new Image();

    img.onload = function () {
      canvasCtx.drawImage(this, 0, 0, 36, 36);
    };
    img.src = prefs.toolbarBtnData;
    aeToolbarIconPicker.hasCustomIcon = true;
  }
  aeToolbarIconPicker.selectedIndex = prefs.toolbarBtnIcon;

  $("more-customzns").addEventListener("click", async (aEvent) => {
    await browser.runtime.openOptionsPage();
  });
  $("btn-accept").addEventListener("click", aEvent => { closeDlg() });

  aeInterxn.initDialogButtonFocusHandlers();

  // Fix for Fx57 bug where bundled page loaded using
  // browser.windows.create won't show contents unless resized.
  // See <https://bugzilla.mozilla.org/show_bug.cgi?id=1402110>
  let wnd = await browser.windows.getCurrent();
  browser.windows.update(wnd.id, {
    width: wnd.width + 1,
    focused: true,
  });
}


async function closeDlg()
{
  await browser.runtime.sendMessage({msgID: "close-change-icon-dlg"});
  browser.windows.remove(browser.windows.WINDOW_ID_CURRENT);
}


function log(aMessage)
{
  if (aeConst.DEBUG) { console.log(aMessage); }
}


//
// Event handlers
//

document.addEventListener("DOMContentLoaded", async (aEvent) => { init() });

document.addEventListener("click", aEvent => {
  if (aEvent.target.tagName == "INPUT"
      && aEvent.target.getAttribute("type") == "radio"
      && aEvent.target.getAttribute("name") == "toolbar-button-icon") {
    aePrefs.setPrefs({ toolbarBtnIcon: aEvent.target.value });
  }
});


window.addEventListener("keydown", aEvent => {
  if (aEvent.key == "Enter") {
    // There should only be 1 default button.
    let defaultBtn = document.querySelector(".default");
    defaultBtn.click();
  }
  else if (aEvent.key == "Escape") {
    closeDlg();
  }
  else {
    aeInterxn.suppressBrowserShortcuts(aEvent);
  }
});


document.addEventListener("contextmenu", aEvent => {
  if (aEvent.target.tagName != "INPUT" && aEvent.target.getAttribute("type") != "text") {
    aEvent.preventDefault();
  }
});


browser.runtime.onMessage.addListener(aRequest => {
  log(`Panic Button/wx::changeIcon.js: Received message "${aRequest.msgID}"`);
    
  if (aRequest.msgID == "auto-close-change-icon-dlg") {
    closeDlg();
  }
});
