/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


const PANICBUTTON_ACTION_REPLACE = 0;
const PANICBUTTON_ACTION_MINIMIZE = 1;
const PANICBUTTON_ACTION_QUIT = 2;

const DEFAULT_TOOLBAR_BTN_LABEL = "Panic Button";
const REPLACE_WEB_PAGE_DEFAULT_URL = "http://aecreations.sourceforge.net/";

const CUSTOM_ICON_INDEX = 20;

let gActionDescs = [
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

    let toolbarBtnIcons = [
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

    let toolbarBtnIconID = toolbarBtnIcons[aResult.toolbarBtnIcon];

    if (aResult.toolbarBtnIcon == CUSTOM_ICON_INDEX) {
      let customIconRadio = $("custom-icon");
      customIconRadio.style.visibility = "visible";
      customIconRadio.checked = true;
      $("custom-icon-label").style.visibility = "visible";
      $("custom-icon-img").src = aResult.toolbarBtnData;
    }
    else {
      $(toolbarBtnIconID).checked = true;
    }
  }, onError);
}


function saveOptions(aEvent)
{
  let toolbarIconIdx = 0;
  toolbarIconIdx = document.querySelector("input[name='toolbar-button-icon']:checked").value;

  let actionSelect = $("panicbutton-action");
  let aePanicButtonPrefs = {
    action: actionSelect.options[actionSelect.selectedIndex].value,
    shortcutKey: $("shortcut-key").checked,
    replacementWebPgURL: $("webpg-url").value,
    toolbarBtnIcon: toolbarIconIdx,
    toolbarBtnLabel: $("toolbar-button-caption").value
  };

  if (toolbarIconIdx == CUSTOM_ICON_INDEX) {
    aePanicButtonPrefs.toolbarBtnData = $("custom-icon-img").src;
  }
  else {
    aePanicButtonPrefs.toolbarBtnData = "";
  }
  
  let setPrefs = browser.storage.local.set(aePanicButtonPrefs);
  setPrefs.then(() => {
    console.log("Panic Button/wx: Preferences saved.");
    $("save-prefs-confirm").style.visibility = "visible";

    window.setTimeout(() => {
      $("save-prefs-confirm").style.visibility = "hidden";
    }, 3000);
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


function setCustomTBIcon(aEvent)
{
  let fileList = aEvent.target.files;

  if (fileList.length == 0) {
    return;
  }

  let imgFile = fileList[0];
  console.log("Selected custom toolbar button icon file: %s (size: %s)", imgFile.name, imgFile.size);

  let fileReader = new FileReader();
  fileReader.addEventListener("load", aEvent => {
    let imgData = aEvent.target.result;

    $("custom-icon-label").style.visibility = "visible";
    let customIconRadio = $("custom-icon");
    customIconRadio.style.visibility = "visible";
    customIconRadio.checked = true;
    $("custom-icon-img").setAttribute("src", imgData);
  });

  fileReader.readAsDataURL(imgFile);
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
  console.error("Panic Button/wx: %s", aError);
}


document.addEventListener("DOMContentLoaded", initOptions, false);
$("reset-url").addEventListener("click", resetWebPageURL, false);
$("save-prefs").addEventListener("click", saveOptions, false);
$("reset-customizations").addEventListener("click", resetCustomizations, false);
$("panicbutton-action").addEventListener("change", updatePanicButtonActionDesc, false);
$("custom-icon-upload").addEventListener("change", setCustomTBIcon, false);
