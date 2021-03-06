/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


let gPanicButton;
let gActionDescs = [];
let gRadioPanels = [];
let gShctKeyModSelected = false;
let gDialogs = {};


function $(aID)
{
  return document.getElementById(aID);
}


async function init(aEvent)
{
  function toggleRestoreMinimizedWndNote(aSelectedOpt)
  {
    let restoreMinzedWndNote = $("restore-minzed-wnd-note");
    if (aSelectedOpt == aeConst.MINIMIZE_CURR_OPT_RESTORE_MINZED_WND) {
      restoreMinzedWndNote.style.display = "block";
    }
    else {
      restoreMinzedWndNote.style.display = "none";
    }
  }
  
  gActionDescs = [
    browser.i18n.getMessage("actDescHideAndReplace"),
    browser.i18n.getMessage("actDescMinimizeAll"),
    browser.i18n.getMessage("actDescCloseAll")
  ];

  $("preftab-options-btn").addEventListener("click", switchPrefsPanel);
  $("preftab-customize-btn").addEventListener("click", switchPrefsPanel);
  
  gPanicButton = await browser.runtime.getBackgroundPage();

  if (! gPanicButton) {
    window.alert(browser.i18n.getMessage("errPrefPgFailed"));
    closePage();
    return;
  }
  
  browser.history.deleteUrl({ url: window.location.href });

  gRadioPanels = [
    {
      radioBtnID: "panic-action-hide-and-replace",
      radioPanelID: "panic-action-hide-and-replace-radio-panel",
      actionOptLocator: "#panic-action-hide-and-replace ~ .panic-action-options"
    },
    {
      radioBtnID: "panic-action-minimize-all",
      radioPanelID: "panic-action-minimize-all-radio-panel",
      actionOptLocator: "#panic-action-minimize-all ~ .panic-action-options"
    },
    {
      radioBtnID: "panic-action-close-all",
      radioPanelID: "panic-action-close-all-radio-panel",
      actionOptLocator: null
    },
    {
      radioBtnID: "panic-action-minimize-current",
      radioPanelID: "panic-action-minimize-current-radio-panel",
      actionOptLocator: "#panic-action-minimize-current ~ .panic-action-options"
    }
  ];

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
  [
    "webpg-url",
    "minz-all-camouflage-webpg-url",
    "custom-icon-upload-btn",
    "set-password-dlg",
    "usr-contrib-cta",
  ].forEach(aID => { $(aID).setAttribute("locale", locale) });

  $("reset-url").addEventListener("click", resetReplacemtWebPageURL, false);
  $("minz-all-camouflage-reset-url").addEventListener("click", resetMinzAllCamouflageWebPageURL, false);
  $("reset-customizations").addEventListener("click", resetCustomizations, false);
  $("custom-icon-upload").addEventListener("change", setCustomTBIcon, false);

  $("panic-action-hide-and-replace").addEventListener("click", selectPanicAction);

  $("webpg-url").addEventListener("blur", aEvent => {
    let url = aEvent.target.value;
    if (url == "") {
      resetReplacemtWebPageURL(aEvent);
      return;
    }
    validateURLTextbox(aEvent.target);
    setPref({ replacementWebPgURL: aEvent.target.value });
  });
  
  $("panic-action-minimize-all").addEventListener("click", selectPanicAction);

  $("minz-all-camouflage").addEventListener("click", aEvent => {
    let isMinzAllCamo = aEvent.target.checked;
    if (isMinzAllCamo) {
      $("minz-all-camouflage-webpg-url").removeAttribute("disabled");
      $("minz-all-camouflage-webpg-url-label").removeAttribute("disabled");
      $("minz-all-camouflage-reset-url").removeAttribute("disabled");
    }
    else {
      $("minz-all-camouflage-webpg-url").setAttribute("disabled", "true");
      $("minz-all-camouflage-webpg-url-label").setAttribute("disabled", "true");
      $("minz-all-camouflage-reset-url").setAttribute("disabled", "true");
    }
    $("minz-all-restore-from-camo-instr").style.display = isMinzAllCamo ? "block" : "none";

    setPref({ showCamouflageWebPg: isMinzAllCamo });
  });

  $("minz-all-camouflage-webpg-url").addEventListener("blur", aEvent => {
    let url = aEvent.target.value;
    if (url == "") {
      resetMinzAllCamouflageWebPageURL(aEvent);
      return;
    }
    validateURLTextbox(aEvent.target);
    setPref({ camouflageWebPgURL: aEvent.target.value });
  });

  $("panic-action-minimize-current").addEventListener("click", selectPanicAction);
  $("minz-curr-action-opt").addEventListener("change", aEvent => {
    let selectedOpt = aEvent.target.value;
    setPref({ minimizeCurrOpt: selectedOpt });
    toggleRestoreMinimizedWndNote(selectedOpt);
  });
  
  $("panic-action-close-all").addEventListener("click", selectPanicAction);

  $("shortcut-key").addEventListener("click", aEvent => {
    let isKeybShct = aEvent.target.checked;
    setPref({ shortcutKey: isKeybShct });

    $("panicbutton-key").disabled = !isKeybShct;
    $("panicbutton-key-modifiers").disabled = !isKeybShct;
    $("reset-shortcut").disabled = !isKeybShct;

    if (isKeybShct) {
      $("shct-note").classList.remove("disabled");
    }
    else {
      $("shct-note").classList.add("disabled");
    }
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

    let key = aEvent.target.value;
    let modifiers = keyModSelectElt.value;

    if (gShctKeyModSelected) {
      let keybShct = `${modifiers}+${key}`;
      log("Panic Button/wx::options.js: Keyboard shortcut changed. Updating command with new keyboard shortcut: " + keybShct);

      browser.commands.update({
        name: aeConst.CMD_PANIC_BUTTON_ACTION,
        shortcut: keybShct
      });
    }
    else {
      log("Panic Button/wx::options.js: Keyboard shortcut changed. Updating command with new keyboard shortcut (no modifier keys): " + key);
      browser.commands.update({
        name: aeConst.CMD_PANIC_BUTTON_ACTION,
        shortcut: key
      });
    }
  });

  $("panicbutton-key-modifiers").addEventListener("change", aEvent => {
    let modifiers = aEvent.target.value;
    gShctKeyModSelected = modifiers != "";

    let key = $("panicbutton-key").value;
    let keybShct = modifiers ? `${modifiers}+${key}` : key;
    
    log("Panic Button/wx::options.js: Keyboard shortcut modifiers changed. Updating command with new keyboard shortcut: " + keybShct);

    browser.commands.update({
      name: aeConst.CMD_PANIC_BUTTON_ACTION,
      shortcut: keybShct
    });
  });

  $("reset-shortcut").addEventListener("click", aEvent => {
    browser.commands.reset(aeConst.CMD_PANIC_BUTTON_ACTION);

    $("panicbutton-key").selectedIndex = 7;
    $("panicbutton-key-modifiers").selectedIndex = 0;
  });

  $("toolbar-button-caption").addEventListener("blur", aEvent => {
    setPref({ toolbarBtnLabel: aEvent.target.value });
  });

  $("rev-contrast-icon").addEventListener("click", aEvent => {
    let isRevContrast = aEvent.target.checked;   
    setPref({ toolbarBtnRevContrastIco: isRevContrast });

    let toolbarIconPicker = $("toolbar-button-icon");
    if (isRevContrast) {
      toolbarIconPicker.setAttribute("colorscheme", "dark");
    }
    else {
      toolbarIconPicker.removeAttribute("colorscheme");
    }
  });

  $("about-btn").addEventListener("click", aEvent => {
    gDialogs.about.showModal();
  });

  let usrContribCTA = $("usr-contrib-cta");
  usrContribCTA.appendChild(aeDOM.createEltWithID("label", "usr-contrib-cta-hdg", "aboutContribHdg"));
  usrContribCTA.appendChild(aeDOM.createTextNodeWithSpc());
  usrContribCTA.appendChild(aeDOM.createHyperlink("aboutDonate", aeConst.DONATE_URL));
  usrContribCTA.appendChild(aeDOM.createTextNodeWithSpc());
  usrContribCTA.appendChild(aeDOM.createEltWithID("label", "usr-contrib-cta-conj", "aboutContribConj"))
  usrContribCTA.appendChild(aeDOM.createHyperlink("aboutL10n", aeConst.L10N_URL));

  let hyperlinks = document.querySelectorAll("a.hyperlink");
  hyperlinks.forEach(aElt => {
    aElt.addEventListener("click", aEvent => {
      aEvent.preventDefault();
      gotoURL(aEvent.target.href);
    });
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

  let prefs = await browser.storage.local.get();
  let panicActions = Array.from(document.getElementsByName("panic-action"));
  let panicActionRadio = panicActions.find(aRadioOpt => aRadioOpt.value == prefs.action);
  panicActionRadio.checked = true;
  switchSelectedActionRadioPanel(prefs.action);

  $("webpg-url").value = prefs.replacementWebPgURL;

  let setPswd = $("hide-and-replc-set-pswd");
  let rmPswd = $("hide-and-replc-rm-pswd");   
  if (prefs.restoreSessPswd) {
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

  $("minz-all-camouflage").checked = prefs.showCamouflageWebPg;
  $("minz-all-camouflage-webpg-url").value = prefs.camouflageWebPgURL;

  if (prefs.showCamouflageWebPg) {
    $("minz-all-restore-from-camo-instr").style.display = "block";
  }
  else {
    $("minz-all-camouflage-webpg-url").setAttribute("disabled", "true");
    $("minz-all-camouflage-webpg-url-label").setAttribute("disabled", "true");
    $("minz-all-camouflage-reset-url").setAttribute("disabled", "true");
    $("minz-all-restore-from-camo-instr").style.display = "none";
  }

  $("minz-curr-action-opt").selectedIndex = prefs.minimizeCurrOpt;
  toggleRestoreMinimizedWndNote(prefs.minimizeCurrOpt);

  $("toolbar-button-caption").value = prefs.toolbarBtnLabel;

  let toolbarBtnIcons = gPanicButton.getToolbarButtonIconLookup();
  let toolbarBtnIconID = toolbarBtnIcons[prefs.toolbarBtnIcon];
  let revContrastChbox = $("rev-contrast-icon");
  
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

  if (prefs.toolbarBtnRevContrastIco) {
    revContrastChbox.checked = true;
    $("toolbar-button-icon").setAttribute("colorscheme", "dark");
  }

  let keybShctChbox = $("shortcut-key");
  let keySelectElt = $("panicbutton-key");
  let keyModSelectElt = $("panicbutton-key-modifiers");
  let isKeybShct = prefs.shortcutKey;

  if (isKeybShct) {
    keybShctChbox.checked = true;
  }
  else {
    keySelectElt.disabled = true;
    keyModSelectElt.disabled = true;
    $("shct-note").classList.add("disabled");
    $("reset-shortcut").disabled = true;
  }

  let cmds = await browser.commands.getAll();
  let keyModNoneOptElt = $("key-modifiers-none");
  let allKeys = keySelectElt.options;
  let allModifiers = keyModSelectElt.options;
  let panicButtonKey, panicButtonKeyMod = "";
  let keybShct = cmds[0].shortcut;
  let shctArr = keybShct.split("+");
  let isSupportedKey = false;
  let isSupportedKeyMod = false;

  if (shctArr.length > 1) {
    panicButtonKeyMod = keybShct.substring(0, keybShct.lastIndexOf("+"));
    // On macOS, the CTRL key is "MacCtrl".
    if (gPanicButton.getOS() == "mac") {
      panicButtonKeyMod = panicButtonKeyMod.replace(/Command/, "Ctrl");
    }
  }
  panicButtonKey = shctArr[shctArr.length - 1];

  for (let i = 0; i < allKeys.length; i++) {
    if (allKeys[i].value == panicButtonKey) {
      keySelectElt.selectedIndex = i;
      isSupportedKey = true;
      break;
    }
  }

  for (let i = 0; i < allModifiers.length; i++) {
    if (allModifiers[i].value == panicButtonKeyMod) {
      keyModSelectElt.selectedIndex = i;
      isSupportedKeyMod = true;
      break;
    }
  }

  if (!isSupportedKey || !isSupportedKeyMod) {
    // When the keyboard shortcut or modifier are not any of the combinations
    // available in the drop-down menu, it may have been set in the Manage
    // Extension Shortcuts page in Add-ons Manager (Firefox 66+).
    let externKeybShct = $("extern-keyb-shct");
    externKeybShct.style.display = "inline";
    externKeybShct.innerText = getLocalizedKeybShct(panicButtonKeyMod, panicButtonKey);
    $("shct-note").innerText = browser.i18n.getMessage("prefsOutsideShct");
  }
  else {
    $("panicbutton-key").style.display = "inline-block";
    $("panicbutton-key-modifiers").style.display = "inline-block";
    $("shct-note").innerText = browser.i18n.getMessage("prefsShortcutKeyNote");
  }
  
  if (panicButtonKeyMod) {
    gShctKeyModSelected = true;
  }

  if (keySelectElt.selectedIndex >= 12) {
    // Don't allow selection of a non-function key without a modifier.
    keyModNoneOptElt.style.display = "none";
  }
}


function switchPrefsPanel(aEvent)
{
  let id = aEvent.target.id;

  if (id == "preftab-options-btn") {
    $("preftab-customize-btn").classList.remove("active-tab");
    $("prefpane-customize").classList.remove("active-tab-panel");
    $("prefpane-options").classList.add("active-tab-panel");
  }
  else if (id == "preftab-customize-btn") {
    $("preftab-options-btn").classList.remove("active-tab");
    $("prefpane-options").classList.remove("active-tab-panel");
    $("prefpane-customize").classList.add("active-tab-panel");
  }
  aEvent.target.classList.add("active-tab");
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
  gDialogs.about.extInfo = null;
  gDialogs.about.onInit = () => {
    let that = gDialogs.about;
    
    if (! that.extInfo) {
      let extManifest = chrome.runtime.getManifest();
      that.extInfo = {
        name: extManifest.name,
        version: extManifest.version,
        description: extManifest.description,
        homePgURL: extManifest.homepage_url,
      };
    }

    document.getElementById("ext-name").innerText = that.extInfo.name;
    document.getElementById("ext-ver").innerText = chrome.i18n.getMessage("aboutExtVer", that.extInfo.version);
    document.getElementById("ext-desc").innerText = that.extInfo.description;
    document.getElementById("ext-home-pg-link").href = that.extInfo.homePgURL;
  };  
}


function selectPanicAction(aEvent)
{
  let selectedActionID = aEvent.target.value;
  switchSelectedActionRadioPanel(selectedActionID);
  setPref({ action: selectedActionID });
}


function switchSelectedActionRadioPanel(aSelectedActionID)
{
  gRadioPanels.forEach((aPanel, aIndex) => {
    if (aIndex == aSelectedActionID) {
      $(aPanel.radioPanelID).classList.add("active-radio-panel");
      if (aPanel.actionOptLocator) {
        document.querySelector(aPanel.actionOptLocator).style.display = "block";
      }
    }
    else {
      $(aPanel.radioPanelID).classList.remove("active-radio-panel");
      if (aPanel.actionOptLocator) {
        document.querySelector(aPanel.actionOptLocator).style.display = "none";
      }
    }
  });
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
    let encImgData = aEvent.target.result;
    let canvas = $("custom-icon-img");
    let canvasCtx = canvas.getContext("2d");
    let img = new Image();
    
    img.onload = function () {
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.drawImage(this, 0, 0, 36, 36);

      let scaledImgData = canvas.toDataURL("image/png");
      setPref({
        toolbarBtnIcon: aeConst.CUSTOM_ICON_IDX,
        toolbarBtnData: scaledImgData,
        toolbarBtnRevContrastIco: false,
      });
    };
    
    img.src = encImgData;   

    $("custom-icon-label").style.visibility = "visible";
    let customIconRadio = $("custom-icon");
    customIconRadio.style.visibility = "visible";
    customIconRadio.checked = true;

    let revContrastChbox = $("rev-contrast-icon");
    revContrastChbox.setAttribute("disabled", "true");
    revContrastChbox.checked = false;
  });

  fileReader.readAsDataURL(imgFile);
}


function getLocalizedKeybShct(aShortcutKeyModifiers, aShortcutKey)
{
  let rv = "";
  let isMacOS = gPanicButton.getOS() == "mac";
  let keys = [
    "Home", "End", "PageUp", "PageDown", "Space", "Insert", "Delete",
    "Up", "Down", "Left", "Right"
  ];
  let localizedKey = "";

  if (keys.includes(aShortcutKey)) {
    if (aShortcutKey == "Delete" && isMacOS) {
      localizedKey = browser.i18n.getMessage("keyMacDel");
    }
    else {
      localizedKey = browser.i18n.getMessage(`key${aShortcutKey}`);
    }
  }
  else {
    if (aShortcutKey == "Period") {
      localizedKey = ".";
    }
    else if (aShortcutKey == "Comma") {
      localizedKey = ",";
    }
    else {
      localizedKey = aShortcutKey;
    }
  }

  let modifiers = aShortcutKeyModifiers.split("+");

  // On macOS, always put the primary modifier key (e.g. Command) at the end.
  if (isMacOS && modifiers.length > 1 && modifiers[1] == "Shift") {
    let modPrimary = modifiers.shift();
    modifiers.push(modPrimary);
  }

  let localizedMods = "";

  for (let i = 0; i < modifiers.length; i++) {
    let modifier = modifiers[i];
    let localzMod;
    
    if (isMacOS) {
      if (modifier == "Alt") {
        localzMod = browser.i18n.getMessage("keyOption");
      }
      else if (modifier == "Ctrl") {
        localzMod = browser.i18n.getMessage("keyCommand");
      }
      else if (modifier == "Shift") {
        localzMod = browser.i18n.getMessage("keyMacShift");
      }
      else {
        localzMod = browser.i18n.getMessage(`key${modifier}`);
      }
    }
    else {
      localzMod = browser.i18n.getMessage(`key${modifier}`);
      localzMod += "+";
    }
    localizedMods += localzMod;
  }

  rv = `${localizedMods}${localizedKey}`;
  return rv;
}


function setPref(aPref)
{
  browser.storage.local.set(aPref);
}


function resetReplacemtWebPageURL(aEvent)
{
  $("webpg-url").value = aeConst.REPLACE_WEB_PAGE_DEFAULT_URL;
  setPref({ replacementWebPgURL: aeConst.REPLACE_WEB_PAGE_DEFAULT_URL });  
}


function resetMinzAllCamouflageWebPageURL(aEvent)
{
  $("minz-all-camouflage-webpg-url").value = aeConst.REPLACE_WEB_PAGE_DEFAULT_URL;
  setPref({ camouflageWebPgURL: aeConst.REPLACE_WEB_PAGE_DEFAULT_URL });
}


function validateURLTextbox(aTextbox)
{
  let url = aTextbox.value;
  if (url.search(/^http/) == -1) {
    aTextbox.value = "http://" + url;
    aTextbox.select();
    aTextbox.focus();
  }
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


function closePage()
{
  browser.tabs.getCurrent().then(aTab => {
    return browser.tabs.remove(aTab.id);
  }).catch(aErr => {
    console.error("Clippings/wx: options.js: " + aErr);
  });
}


function onError(aError)
{
  console.error("Panic Button/wx: %s", aError);
}


function log(aMessage)
{
  if (aeConst.DEBUG) { console.log(aMessage); }
}


document.addEventListener("DOMContentLoaded", async (aEvent) => { init() });

document.addEventListener("contextmenu", aEvent => {
  if (aEvent.target.tagName != "INPUT" && aEvent.target.getAttribute("type") != "text") {
    aEvent.preventDefault();
  }
}, false);
