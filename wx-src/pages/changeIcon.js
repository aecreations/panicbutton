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
  browser.history.deleteUrl({ url: window.location.href });

  let prefs = await aePrefs.getAllPrefs();
  
  if (prefs.toolbarBtnRevContrastIco) {
    $("toolbar-button-icon").setAttribute("colorscheme", "dark");
  }

  let resp = await browser.runtime.sendMessage({
    msgID: "get-toolbar-btn-icons-map"
  });
  let toolbarBtnIcons = resp.toolbarBtnIconsMap;
  let toolbarBtnIconID = toolbarBtnIcons[prefs.toolbarBtnIcon];

  if (prefs.toolbarBtnIcon == aeConst.CUSTOM_ICON_IDX) {
    let customIconRadio = $("custom-icon");
    customIconRadio.style.visibility = "visible";
    customIconRadio.checked = true;
    $("custom-icon-label").style.visibility = "visible";

    let canvas = $("custom-icon-img");
    let canvasCtx = canvas.getContext("2d");
    let img = new Image();

    img.onload = function () {
      canvasCtx.drawImage(this, 0, 0, 36, 36);
    };
    img.src = prefs.toolbarBtnData;
    
    revContrastChbox.disabled = true;
  }
  else {
    $(toolbarBtnIconID).checked = true;
  }

  $("more-customzns").addEventListener("click", async (aEvent) => {
    await browser.runtime.openOptionsPage();
  });
  $("btn-accept").addEventListener("click", aEvent => { closeDlg() });
}


async function closeDlg()
{
  await browser.runtime.sendMessage({ msgID: "close-change-icon-dlg" });
  browser.windows.remove(browser.windows.WINDOW_ID_CURRENT);
}


function log(aMessage)
{
  if (aeConst.DEBUG) { console.log(aMessage); }
}


//
// Event handlers
//

document.addEventListener("click", aEvent => {
  if (aEvent.target.tagName == "INPUT"
      && aEvent.target.getAttribute("type") == "radio"
      && aEvent.target.getAttribute("name") == "toolbar-button-icon") {
    aePrefs.setPrefs({ toolbarBtnIcon: aEvent.target.value });
  }
});


document.addEventListener("DOMContentLoaded", async (aEvent) => { init() });

document.addEventListener("contextmenu", aEvent => {
  if (aEvent.target.tagName != "INPUT" && aEvent.target.getAttribute("type") != "text") {
    aEvent.preventDefault();
  }
});

window.addEventListener("beforeunload", async (aEvent) => {
  await aePrefs.setPrefs({
    changeIconDlgPos: {
      x: window.screenX,
      y: window.screenY,
    }
  });
});


browser.runtime.onMessage.addListener(aRequest => {
  log(`Panic Button/wx::changeIcon.js: Received message "${aRequest.msgID}"`);
    
  if (aRequest.msgID == "auto-close-change-icon-dlg") {
    closeDlg();
  }
});
