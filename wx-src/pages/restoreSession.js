/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


function $(aID)
{
  return document.getElementById(aID);
}


async function init(aEvent)
{
  let {os} = await browser.runtime.getPlatformInfo();
  aeInterxn.init(os);
  
  $("btn-accept").addEventListener("click", async (aEvent) => {
    let resp = await browser.runtime.sendMessage({
      msgID: "get-restore-sess-passwd",
    });

    let usrPswd = resp.restoreSessPwd;
    let passwd = $("restore-sess-pswd");
    
    if (passwd.value != usrPswd) {
      $("err-msg").innerText = browser.i18n.getMessage("pswdWrong");
      passwd.select();
      passwd.focus();
      return;
    }

    await browser.runtime.sendMessage({ msgID: "restore-brws-sess" });
  });

  $("btn-cancel").addEventListener("click", aEvent => {
    window.history.back();
  });

  $("restore-sess-pswd").focus();

  let defDlgBtnFollowsFocus = await aePrefs.getPref("defDlgBtnFollowsFocus");
  if (defDlgBtnFollowsFocus) {
    aeInterxn.initDialogButtonFocusHandlers();
  }
}


document.addEventListener("DOMContentLoaded", async (aEvent) => { init() });

document.addEventListener("contextmenu", aEvent => {
  if (aEvent.target.tagName != "INPUT" && aEvent.target.getAttribute("type") != "text") {
    aEvent.preventDefault();
  }
});


window.addEventListener("keydown", aEvent => {
  if (aEvent.key == "Enter") {
    if (aeDialog.isOpen()) {
      aeDialog.acceptDlgs();
    }
    else {
      $("btn-accept").click();
    }
  }
  else if (aEvent.key == "Escape") {
    if (aeDialog.isOpen()) {
      aeDialog.cancelDlgs();
    }
    else {
      $("btn-cancel").click();
    }
  }
  else if (aEvent.key == "F1") {
    let helpDlg = new aeDialog("#hlp-dlg");
    helpDlg.showModal();
  }
  else {
    aeInterxn.suppressBrowserShortcuts(aEvent);
  }
});
