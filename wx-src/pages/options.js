/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


let gPanicButton;
let gActionDescs = [];
let gShctKeyModSelected = false;
let gDialogs = {};
let gExtInfo = null;


function $(aID)
{
  return document.getElementById(aID);
}


function init(aEvent)
{
  gActionDescs = [
    browser.i18n.getMessage("actDescHideAndReplace"),
    browser.i18n.getMessage("actDescMinimizeAll"),
    browser.i18n.getMessage("actDescCloseAll")
  ];
  
  browser.runtime.getBackgroundPage().then(aBkgrdPgWnd => {
    gPanicButton = aBkgrdPgWnd;
    return browser.history.deleteUrl({ url: window.location.href });

  }).then(() => {
    initDialogs();

    let os = gPanicButton.getOS();
    let keyModAccelShift, keyModAltShift;

    if (os == "mac") {
      keyModAccelShift = "keyModAccelShiftMac";
      keyModAltShift = "keyModAltShiftMac";
      $("panicbutton-key-del").innerText = chrome.i18n.getMessage("keyMacDel");
    }
    else {
      keyModAccelShift = "keyModAccelShift";
      keyModAltShift = "keyModAltShift";
    }

    $("key-modifiers-accelshift").innerText = chrome.i18n.getMessage(keyModAccelShift);
    $("key-modifiers-altshift").innerText = chrome.i18n.getMessage(keyModAltShift);

    let locale = browser.i18n.getUILanguage();
    let buttons = document.querySelectorAll("button");
    buttons.forEach(aBtn => { aBtn.setAttribute("locale", locale) });
    $("webpg-url").setAttribute("locale", locale);
    $("custom-icon-upload-btn").setAttribute("locale", locale);
    $("set-password-dlg").setAttribute("locale", locale);
    
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

    $("panicbutton-key").addEventListener("change", aEvent => {
      let keyModSelectElt = $("panicbutton-key-modifiers");
      let keyModNoneOptElt = $("key-modifiers-none");
      let selectedIdx = aEvent.target.selectedIndex;
      
      if (selectedIdx < 12) {  // F1 - F12 keys.
        keyModNoneOptElt.style.display = "block";
      }
      else {
        if (! gShctKeyModSelected) {
          keyModSelectElt.selectedIndex = 1;
          gShctKeyModSelected = true;
        }
        
        keyModNoneOptElt.style.display = "none";
      }

      if (gShctKeyModSelected) {
        browser.storage.local.set({ panicButtonKeyMod: keyModSelectElt.value }).then(() => {
          browser.storage.local.set({ panicButtonKey: aEvent.target.value });
        });
      }
      else {
        browser.storage.local.set({ panicButtonKey: aEvent.target.value });
      }
    });

    $("panicbutton-key-modifiers").addEventListener("change", aEvent => {
      gShctKeyModSelected = aEvent.target.value != "";
      setPref({ panicButtonKeyMod: aEvent.target.value })
    });

    $("toolbar-button-caption").addEventListener("blur", aEvent => {
      setPref({ toolbarBtnLabel: aEvent.target.value });
    });

    $("rev-contrast-icon").addEventListener("click", aEvent => {
      setPref({ toolbarBtnRevContrastIco: aEvent.target.checked });
    });

    $("about-btn").addEventListener("click", aEvent => {
      gDialogs.about.showModal();
    });

    $("aboutHomePgLink").addEventListener("click", aEvent => {
      aEvent.preventDefault();
      gotoURL(aEvent.target.href);
    });

    $("aboutLicLink").addEventListener("click", aEvent => {
      aEvent.preventDefault();
      gotoURL(aEvent.target.href);
    });

    // Catch-all click event listener
    document.addEventListener("click", aEvent => {
      if (aEvent.target.tagName == "INPUT"
          && aEvent.target.getAttribute("type") == "radio"
          && aEvent.target.getAttribute("name") == "toolbar-button-icon") {
        setPref({ toolbarBtnIcon: aEvent.target.value });

        let revContrastChbox = $("rev-contrast-icon");
        
        if (aEvent.target.id == "custom-icon") {
          revContrastChbox.setAttribute("disabled", "true");
        }
        else {
          revContrastChbox.removeAttribute("disabled");
        }
      }
    }, false);

    // Handle key events when a dialog is open.
    window.addEventListener("keydown", aEvent => {
      if (aEvent.key == "Enter" && aeDialog.isOpen()) {
        aeDialog.acceptDlgs();
      }
      else if (aEvent.key == "Escape" && aeDialog.isOpen()) {
        aeDialog.cancelDlgs();
      }
    });

    return browser.storage.local.get();

  }).then(aPrefs => {
    $("panicbutton-action").selectedIndex = aPrefs.action;
    $("shortcut-key").checked = aPrefs.shortcutKey;
    $("webpg-url").value = aPrefs.replacementWebPgURL;

    let actionDescTextNode = document.createTextNode(gActionDescs[aPrefs.action]);
    $("panicbutton-action-desc").appendChild(actionDescTextNode);

    if (aPrefs.action == aeConst.PANICBUTTON_ACTION_REPLACE) {
      $("panicbutton-action-options-hide-and-replace").style.display = "block";
      $("private-browsing-warning").innerText = browser.i18n.getMessage("notPrivBrws");
      $("private-browsing-warning-icon").style.display = "inline-block";
    }

    let setPswd = $("hide-and-replc-set-pswd");
    let rmPswd = $("hide-and-replc-rm-pswd");   
    if (aPrefs.restoreSessPswd) {
      setPswd.innerText = browser.i18n.getMessage("chgPswd");
      rmPswd.style.visibility = "visible";
    }
    else {
      setPswd.innerText = browser.i18n.getMessage("setPswd");
      rmPswd.style.visibility = "hidden";
    }

    setPswd.addEventListener("click", aEvent => {
      let prefs = gPanicButton.getPrefs();
      if (prefs.restoreSessPswdEnabled) {
        gDialogs.changeRestoreSessPswd.showModal();
      }
      else {
        gDialogs.setRestoreSessPswd.showModal();
      }
    });

    rmPswd.addEventListener("click", aEvent => {
      gDialogs.removeRestoreSessPswd.showModal();
    });

    let keySelectElt = $("panicbutton-key");
    let keyModSelectElt = $("panicbutton-key-modifiers");
    let keyModNoneOptElt = $("key-modifiers-none");
    let allKeys = keySelectElt.options;
    let allModifiers = keyModSelectElt.options;

    for (let i = 0; i < allKeys.length; i++) {
      if (allKeys[i].value == aPrefs.panicButtonKey) {
        keySelectElt.selectedIndex = i;
        break;
      }
    }

    for (let i = 0; i < allModifiers.length; i++) {
      if (allModifiers[i].value == aPrefs.panicButtonKeyMod) {
        keyModSelectElt.selectedIndex = i;
        break;
      }
    }

    if (aPrefs.panicButtonKeyMod) {
      gShctKeyModSelected = true;
    }

    if (keySelectElt.selectedIndex >= 12) {
      // Don't allow selection of a non-function key without a modifier.
      keyModNoneOptElt.style.display = "none";
    }

    $("toolbar-button-caption").value = aPrefs.toolbarBtnLabel;

    let toolbarBtnIcons = gPanicButton.getToolbarButtonIconLookup();
    let toolbarBtnIconID = toolbarBtnIcons[aPrefs.toolbarBtnIcon];
    let revContrastChbox = $("rev-contrast-icon");
    
    if (aPrefs.toolbarBtnIcon == aeConst.CUSTOM_ICON_IDX) {
      let customIconRadio = $("custom-icon");
      customIconRadio.style.visibility = "visible";
      customIconRadio.checked = true;
      $("custom-icon-label").style.visibility = "visible";
      $("custom-icon-img").src = aPrefs.toolbarBtnData;
      revContrastChbox.setAttribute("disabled", "true");
    }
    else {
      $(toolbarBtnIconID).checked = true;
    }

    revContrastChbox.checked = aPrefs.toolbarBtnRevContrastIco;

  }, onError);
}


function initDialogs()
{
  function resetPasswdPrefs()
  {
    $("hide-and-replc-set-pswd").innerText = browser.i18n.getMessage("setPswd");
    $("hide-and-replc-rm-pswd").style.visibility = "hidden";
  }

  gDialogs.setRestoreSessPswd = new aeDialog("#set-password-dlg");
  gDialogs.setRestoreSessPswd.onInit = () => {
    $("set-pswd-error").innerText = "";
    $("enter-password").value = "";
    $("confirm-password").value = "";
  };
  gDialogs.setRestoreSessPswd.onShow = () => {
    $("enter-password").focus();
  };
  gDialogs.setRestoreSessPswd.onAccept = () => {
    let that = gDialogs.setRestoreSessPswd;
    
    let passwd = $("enter-password").value;
    let confirmPasswd = $("confirm-password").value;

    if (passwd != confirmPasswd) {
      $("set-pswd-error").innerText = browser.i18n.getMessage("pswdMismatch");
      return;
    }

    if (passwd == "" && confirmPasswd == "") {
      $("enter-password").focus();
      return;
    }

    gPanicButton.setRestoreSessPasswd(passwd).then(() => {
      // Add a short delay so that user can see resulting prefs UI changes.
      window.setTimeout(() => {
        $("hide-and-replc-set-pswd").innerText = browser.i18n.getMessage("chgPswd");
        $("hide-and-replc-rm-pswd").style.visibility = "visible";
      }, 500);
      
      that.close();
    });
  };

  gDialogs.changeRestoreSessPswd = new aeDialog("#change-password-dlg");
  gDialogs.changeRestoreSessPswd.onInit = () => {
    $("chg-pswd-error").innerText = "";
    $("old-pswd").value = "";
    $("new-pswd").value = "";
    $("confirm-new-pswd").value = "";
  };
  gDialogs.changeRestoreSessPswd.onShow = () => {
    $("old-pswd").focus();
  };
  gDialogs.changeRestoreSessPswd.onAccept = () => {
    let that = gDialogs.changeRestoreSessPswd;

    let oldPswdElt = $("old-pswd");
    let newPswdElt =  $("new-pswd");
    let passwd = $("new-pswd").value;
    let confirmPasswd = $("confirm-new-pswd").value;

    if (passwd != confirmPasswd) {
      $("chg-pswd-error").innerText = browser.i18n.getMessage("pswdMismatch");
      newPswdElt.select();
      newPswdElt.focus();
      return;
    }

    let enteredOldPswd = oldPswdElt.value;
    let currentPswd = gPanicButton.getRestoreSessPasswd();
    
    if (enteredOldPswd != currentPswd) {
      $("chg-pswd-error").innerText = browser.i18n.getMessage("pswdWrong");
      oldPswdElt.select();
      oldPswdElt.focus();
      return;
    }

    if (passwd == "" && confirmPasswd == "") {
      // If both password fields are empty, clear the password as if the user
      // had clicked "Remove Password"
      gPanicButton.removeRestoreSessPasswd().then(() => {
        resetPasswdPrefs();
        that.close();
      });
      return;
    }

    gPanicButton.setRestoreSessPasswd(passwd).then(() => {
      that.close();
    });
  };

  gDialogs.removeRestoreSessPswd = new aeDialog("#remove-password-dlg");
  gDialogs.removeRestoreSessPswd.onInit = () => {
    $("pswd-for-removal").value = "";
    $("rm-pswd-error").innerText = "";
  }
  gDialogs.removeRestoreSessPswd.onShow = () => {
    $("pswd-for-removal").focus();
  };
  gDialogs.removeRestoreSessPswd.onAccept = () => {
    let that = gDialogs.removeRestoreSessPswd;

    let enteredPswdElt = $("pswd-for-removal");
    let enteredPswd = enteredPswdElt.value;
    let currPswd = gPanicButton.getRestoreSessPasswd();

    if (enteredPswd != currPswd) {
      $("rm-pswd-error").innerText = browser.i18n.getMessage("pswdWrong");
      enteredPswdElt.select();
      enteredPswdElt.focus();
      return;
    }
    
    gPanicButton.removeRestoreSessPasswd().then(() => {
      resetPasswdPrefs();
      that.close();
    });
  };
  
  gDialogs.about = new aeDialog("#about-dlg");
  gDialogs.about.onInit = () => {
    if (! gExtInfo) {
      let extManifest = chrome.runtime.getManifest();
      gExtInfo = {
        name: extManifest.name,
        version: extManifest.version,
        description: extManifest.description,
      };
    }

    document.getElementById("ext-name").innerText = gExtInfo.name;
    document.getElementById("ext-ver").innerText = chrome.i18n.getMessage("aboutExtVer", gExtInfo.version);
    document.getElementById("ext-desc").innerText = gExtInfo.description;
  };  
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

    let revContrastChbox = $("rev-contrast-icon");
    revContrastChbox.setAttribute("disabled", "true");
    revContrastChbox.checked = false;

    setPref({
      toolbarBtnIcon: aeConst.CUSTOM_ICON_IDX,
      toolbarBtnData: imgData,
      toolbarBtnRevContrastIco: false,
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
  $("toolbar-button-caption").value = browser.i18n.getMessage("defaultBtnLabel");
  $("default").checked = true;
  $("rev-contrast-icon").checked = false;

  setPref({
    toolbarBtnLabel: browser.i18n.getMessage("defaultBtnLabel"),
    toolbarBtnIcon: 0,
    toolbarBtnRevContrastIco: false,
  });
}


function gotoURL(aURL)
{
  browser.tabs.create({ url: aURL });
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
