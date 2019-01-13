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
      // TEMPORARY - PoC
      if ($("restore-sess-pswd").value != "asdf") {
        window.alert("Incorrect password.");
        return;
      }
      // END TEMPORARY
      gPanicButton.restoreBrowserSession();
    });

    $("btn-cancel").addEventListener("click", aEvent => {
      window.history.back();
    });
  });
}


document.addEventListener("DOMContentLoaded", init, false);
