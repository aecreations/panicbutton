/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let gPanicButton;


function $(aID)
{
  return document.getElementById(aID);
}


function init(aEvent)
{
  browser.runtime.getBackgroundPage().then(aBkgrdPgWnd => {
    gPanicButton = aBkgrdPgWnd;
    return browser.history.deleteUrl({ url: window.location.href });

  }).then(() => {
    $("btn-ok").addEventListener("click", aEvent => {
      let usrPswd = gPanicButton.getRestoreSessPasswd();
      let passwd = $("restore-sess-pswd");
      
      if (passwd.value != usrPswd) {
        $("err-msg").innerText = browser.i18n.getMessage("pswdWrong");
        passwd.select();
        passwd.focus();
        return;
      }
      gPanicButton.restoreBrowserSession();
    });

    $("btn-cancel").addEventListener("click", aEvent => {
      window.history.back();
    });

    let helpDlg = new aeDialog("#hlp-dlg");

    window.addEventListener("keydown", aEvent => {
      if (aEvent.key == "Enter") {
        if (aeDialog.isOpen()) {
          aeDialog.acceptDlgs();
        }
        else {
          $("btn-ok").click();
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
        helpDlg.showModal();
      }
    });

    $("restore-sess-pswd").focus();
  });
}


document.addEventListener("DOMContentLoaded", init, false);

document.addEventListener("contextmenu", aEvent => {
  if (aEvent.target.tagName != "INPUT" && aEvent.target.getAttribute("type") != "text") {
    aEvent.preventDefault();
  }
}, false);
