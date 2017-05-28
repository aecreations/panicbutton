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


function $(aID) {
  return document.getElementById(aID);
}


function initOptions(aEvent)
{
  let getPrefs = browser.storage.local.get();
  getPrefs.then(aResult => {
    console.log("Panic Button/wx: Extension preferences:");
    console.log(aResult);
    $("panicbutton-action").selectedIndex = aResult.action;
    $("shortcut-key").checked = aResult.shortcutKey;
    $("webpg-url").value = aResult.replacementWebPgURL;

    if (aResult.action == PANICBUTTON_ACTION_REPLACE) {
      $("panicbutton-action-options-hide-and-replace").style.display = "block";
    }
  }, onError);
}


function saveOptions(aEvent)
{
  aEvent.preventDefault();

  let actionSelect = $("panicbutton-action");
  let aePanicButtonPrefs = {
    action: actionSelect.options[actionSelect.selectedIndex].value,
    shortcutKey: $("shortcut-key").checked,
    replacementWebPgURL: $("webpg-url").value
  };
    
  let setPrefs = browser.storage.local.set(aePanicButtonPrefs);
  setPrefs.then(() => {
    console.log("Panic Button/wx: Preferences saved.");
  }, onError);
}


function updatePanicButtonActionDesc(aEvent)
{
  let selectElt = aEvent.target;
  let panicButtonAction = selectElt.options[selectElt.selectedIndex].value;
  
  if (panicButtonAction == PANICBUTTON_ACTION_REPLACE) {
    $("panicbutton-action-options-hide-and-replace").style.display = "block";
  }
  else {
    $("panicbutton-action-options-hide-and-replace").style.display = "none";
  }
}


function resetWebPageURL()
{
  $("webpg-url").value = REPLACE_WEB_PAGE_DEFAULT_URL;
}


function onError(aError)
{
  console.log("!! Panic Button/wx: " + aError);
}


document.addEventListener("DOMContentLoaded", initOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.querySelector("#panicbutton-action").addEventListener("change", updatePanicButtonActionDesc);

