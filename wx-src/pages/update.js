/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


function $(aID)
{
  return document.getElementById(aID);
}


function init()
{
  browser.history.deleteUrl({ url: window.location.href });

  $("btn-close").addEventListener("click", aEvent => { closePage() });
  
  document.addEventListener("contextmenu", aEvent => {
    if (aEvent.target.tagName != "INPUT" && aEvent.target.getAttribute("type") != "text") {
      aEvent.preventDefault();
    }
  }, false);  
}


function closePage()
{
  browser.tabs.getCurrent().then(aTab => {
    return browser.tabs.remove(aTab.id);
  });
}

document.addEventListener("DOMContentLoaded", init, false);

