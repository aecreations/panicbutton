/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


let gPanicButton;
let gActionDescs = [];


function $(aID)
{
  return document.getElementById(aID);
}


function init(aEvent)
{
  gActionDescs = [
    browser.i18n.getMessage("actionHideAndReplace"),
    browser.i18n.getMessage("actionMinimizeAll"),
    browser.i18n.getMessage("actionQuit")
  ];
  
  browser.runtime.getBackgroundPage().then(aBkgrdPgWnd => {
    gPanicButton = aBkgrdPgWnd;
    return browser.history.deleteUrl({ url: window.location.href });

  }).then(() => {
    $("reset-url").addEventListener("click", resetWebPageURL, false);
    $("reset-customizations").addEventListener("click", resetCustomizations, false);
    $("custom-icon-upload").addEventListener("change", setCustomTBIcon, false);

    $("panicbutton-action").addEventListener("change", aEvent => {
      updatePanicButtonActionDesc();
      setPref({ action: aEvent.target.value });
    });

    $("webpg-url").addEventListener("blur", aEvent => {
      let url = aEvent.target.value;
      if (url.search(/^http/) == -1 && url != "") {
        aEvent.target.value = "http://" + url;
        aEvent.target.select();
        aEvent.target.focus();
      }
      setPref({ replacementWebPgURL: aEvent.target.value });
    });
    
    $("shortcut-key").addEventListener("click", aEvent => {
      setPref({ shortcutKey: aEvent.target.checked});
    });

    $("toolbar-button-caption").addEventListener("blur", aEvent => {
      setPref({ toolbarBtnLabel: aEvent.target.value });
    });

    $("rev-contrast-icon").addEventListener("click", aEvent => {
      setPref({ toolbarBtnRevContrastIco: aEvent.target.checked });
    });

    // Catch-all click event listener
    document.addEventListener("click", aEvent => {
      if (aEvent.target.tagName == "INPUT"
          && aEvent.target.getAttribute("type") == "radio"
          && aEvent.target.getAttribute("name") == "toolbar-button-icon") {
        setPref({ toolbarBtnIcon: aEvent.target.value });
      }
    }, false);

    return browser.storage.local.get();

  }).then(aResult => {
    $("panicbutton-action").selectedIndex = aResult.action;
    $("shortcut-key").checked = aResult.shortcutKey;
    $("webpg-url").value = aResult.replacementWebPgURL;

    let actionDescTextNode = document.createTextNode(gActionDescs[aResult.action]);
    $("panicbutton-action-desc").appendChild(actionDescTextNode);

    if (aResult.action == aeConst.PANICBUTTON_ACTION_REPLACE) {
      $("panicbutton-action-options-hide-and-replace").style.display = "block";
      $("private-browsing-warning").innerText = browser.i18n.getMessage("notPrivBrws");
      $("private-browsing-warning-icon").style.display = "inline-block";
    }

    $("toolbar-button-caption").value = aResult.toolbarBtnLabel;

    let toolbarBtnIcons = gPanicButton.getToolbarButtonIconLookup();
    let toolbarBtnIconID = toolbarBtnIcons[aResult.toolbarBtnIcon];

    if (aResult.toolbarBtnIcon == aeConst.CUSTOM_ICON_IDX) {
      let customIconRadio = $("custom-icon");
      customIconRadio.style.visibility = "visible";
      customIconRadio.checked = true;
      $("custom-icon-label").style.visibility = "visible";
      $("custom-icon-img").src = aResult.toolbarBtnData;
    }
    else {
      $(toolbarBtnIconID).checked = true;
    }

    $("rev-contrast-icon").checked = aResult.toolbarBtnRevContrastIco;

    let prefsPgBtns = $("prefs-pg-btns");
    if (aResult.prefsPgSaveBtn) {
      prefsPgBtns.style.display = "block";
      prefsPgBtns.addEventListener("click", saveOptions, false);
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
    toolbarBtnLabel: $("toolbar-button-caption").value,
    toolbarBtnRevContrastIco: $("rev-contrast-icon").checked
  };

  if (toolbarIconIdx == aeConst.CUSTOM_ICON_IDX) {
    aePanicButtonPrefs.toolbarBtnData = $("custom-icon-img").src;
  }
  else {
    aePanicButtonPrefs.toolbarBtnData = "";
  }
  
  browser.storage.local.set(aePanicButtonPrefs).then(() => {
    $("save-prefs-confirm").style.visibility = "visible";

    window.setTimeout(() => {
      $("save-prefs-confirm").style.visibility = "hidden";
    }, 3000);
  }, onError);
}


function updatePanicButtonActionDesc()
{
  let selectElt = $("panicbutton-action");
  let panicButtonAction = selectElt.options[selectElt.selectedIndex].value;
  let actionDescElt = $("panicbutton-action-desc");

  actionDescElt.removeChild(actionDescElt.firstChild);
  let actionDescTextNode = document.createTextNode(gActionDescs[panicButtonAction]);
  actionDescElt.appendChild(actionDescTextNode);
  
  if (panicButtonAction == aeConst.PANICBUTTON_ACTION_REPLACE) {
    $("panicbutton-action-options-hide-and-replace").style.display = "block";
    $("private-browsing-warning").innerText = browser.i18n.getMessage("notPrivBrws");
    $("private-browsing-warning-icon").style.display = "inline-block";
  }
  else {
    $("panicbutton-action-options-hide-and-replace").style.display = "none";
    $("private-browsing-warning").innerText = "";
    $("private-browsing-warning-icon").style.display = "none";
  }
}


function setCustomTBIcon(aEvent)
{
  let fileList = aEvent.target.files;

  if (fileList.length == 0) {
    return;
  }

  let imgFile = fileList[0];

  let fileReader = new FileReader();
  fileReader.addEventListener("load", aEvent => {
    let imgData = aEvent.target.result;

    $("custom-icon-label").style.visibility = "visible";
    let customIconRadio = $("custom-icon");
    customIconRadio.style.visibility = "visible";
    customIconRadio.checked = true;
    $("custom-icon-img").setAttribute("src", imgData);

    setPref({
      toolbarBtnIcon: aeConst.CUSTOM_ICON_IDX,
      toolbarBtnData: imgData,
    });
  });

  fileReader.readAsDataURL(imgFile);
}


function setPref(aPref)
{
  browser.storage.local.set(aPref);
}


function resetWebPageURL(aEvent)
{
  $("webpg-url").value = aeConst.REPLACE_WEB_PAGE_DEFAULT_URL;
  setPref({ replacementWebPgURL: aeConst.REPLACE_WEB_PAGE_DEFAULT_URL });
}


function resetCustomizations(aEvent)
{
  $("toolbar-button-caption").value = aeConst.DEFAULT_TOOLBAR_BTN_LABEL;
  $("default").checked = true;
  $("rev-contrast-icon").checked = false;

  setPref({
    toolbarBtnLabel: aeConst.DEFAULT_TOOLBAR_BTN_LABEL,
    toolbarBtnIcon: 0,
    toolbarBtnRevContrastIco: false,
  });
}


function onError(aError)
{
  console.error("Panic Button/wx: %s", aError);
}


document.addEventListener("DOMContentLoaded", init, false);

document.addEventListener("contextmenu", aEvent => {
  if (aEvent.target.tagName != "INPUT" && aEvent.target.getAttribute("type") != "text") {
    aEvent.preventDefault();
  }
}, false);
