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

const DEFAULT_TOOLBAR_BTN_LABEL = "Panic Button";
const REPLACE_WEB_PAGE_DEFAULT_URL = "http://aecreations.sourceforge.net/";


var gActionDescs = [
  "Replaces the browser session with a single window displaying a web page at the location below.  Click the Panic Button again to restore your browser session.",
  "Minimizes all browser windows.",
  "Closes all browser windows."
];


function $(aID)
{
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

    let actionDescTextNode = document.createTextNode(gActionDescs[aResult.action]);
    $("panicbutton-action-desc").appendChild(actionDescTextNode);

    if (aResult.action == PANICBUTTON_ACTION_REPLACE) {
      $("panicbutton-action-options-hide-and-replace").style.display = "block";
    }

    $("toolbar-button-caption").value = aResult.toolbarBtnLabel;

      let toolbarBtnIcons = ["default", "exclamation-in-ball", "quit", "exit-door", "window-minimize", "window-with-exclamation", "window-with-exclamation-ball", "window-with-cross", "window-with-check", "plain-window", "dotted-window", "window-with-globe", "web-page", "web-page-with-globe", "web-document", "smiley", "picture", "desktop", "computer", "letter-a"];

      let toolbarBtnIconID = toolbarBtnIcons[aResult.toolbarBtnIcon];
      $(toolbarBtnIconID).checked = true;
  }, onError);
}


function saveOptions(aEvent)
{
  let actionSelect = $("panicbutton-action");
  let aePanicButtonPrefs = {
    action: actionSelect.options[actionSelect.selectedIndex].value,
    shortcutKey: $("shortcut-key").checked,
    replacementWebPgURL: $("webpg-url").value,
    toolbarBtnIcon: document.querySelector("input[name='toolbar-button-icon']:checked").value,
    toolbarBtnLabel: $("toolbar-button-caption").value
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
  let actionDescElt = $("panicbutton-action-desc");

  actionDescElt.removeChild(actionDescElt.firstChild);
  let actionDescTextNode = document.createTextNode(gActionDescs[panicButtonAction]);
  actionDescElt.appendChild(actionDescTextNode);
  
  if (panicButtonAction == PANICBUTTON_ACTION_REPLACE) {
    $("panicbutton-action-options-hide-and-replace").style.display = "block";
  }
  else {
    $("panicbutton-action-options-hide-and-replace").style.display = "none";
  }
}


function resetWebPageURL(aEvent)
{
  $("webpg-url").value = REPLACE_WEB_PAGE_DEFAULT_URL;
}


function resetCustomizations(aEvent)
{
  $("toolbar-button-caption").value = DEFAULT_TOOLBAR_BTN_LABEL;
  $("default").checked = true;
}


function onError(aError)
{
  console.error("Panic Button/wx: " + aError);
}


document.addEventListener("DOMContentLoaded", initOptions, false);
document.querySelector("#reset-url").addEventListener("click", resetWebPageURL, false);
document.querySelector("#save-prefs").addEventListener("click", saveOptions, false);
document.querySelector("#reset-customizations").addEventListener("click", resetCustomizations, false);
document.querySelector("#panicbutton-action").addEventListener("change", updatePanicButtonActionDesc, false);

