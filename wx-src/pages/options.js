/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


let gOS;
let gActionDescs = [];
let gRadioPanels = [];
let gShctKeyModSelected = false;
let gDialogs = {};
let gToolbarBtnIcons;


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

  let tabOptions = $("preftab-options-btn");
  tabOptions.addEventListener("click", switchPrefsPanel);
  tabOptions.setAttribute("aria-selected", "true");
  
  let tabCustomize = $("preftab-customize-btn");
  tabCustomize.addEventListener("click", switchPrefsPanel);
  tabCustomize.setAttribute("aria-selected", "false");
  
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

  let platform = await browser.runtime.getPlatformInfo();
  gOS = platform.os;
  document.body.dataset.os = gOS;
  aeInterxn.init(gOS);
  
  let keyModAccelShift, keyModAltShift;

  if (gOS == "mac") {
    keyModAccelShift = "keyModAccelShiftMac";
    keyModAltShift = "keyModAltShiftMac";
    $("panicbutton-key-del").innerText = browser.i18n.getMessage("keyMacDel");
  }
  else {
    keyModAccelShift = "keyModAccelShift";
    keyModAltShift = "keyModAltShift";
  }

  $("key-modifiers-accelshift").innerText = browser.i18n.getMessage(keyModAccelShift);
  $("key-modifiers-altshift").innerText = browser.i18n.getMessage(keyModAltShift);

  let locale = browser.i18n.getUILanguage();
  let buttons = document.querySelectorAll("button");
  buttons.forEach(aBtn => { aBtn.dataset["locale"] = locale });
  [
    "webpg-url",
    "minz-all-camouflage-label",
    "minz-all-camouflage-webpg-url",
    "custom-icon-upload-btn",
    "set-password-dlg",
    "translations-ack",
    "usr-contrib-cta",
  ].forEach(aID => { $(aID).dataset["locale"] = locale });

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
    aePrefs.setPrefs({replacementWebPgURL: aEvent.target.value});
  });
  
  $("restore-sess-snooze-tabs").addEventListener("click", aEvent => {
    aePrefs.setPrefs({restoreSessInactvTabsZzz: aEvent.target.checked});
  });

  $("restore-sess-shrink-tabgrps").addEventListener("click", aEvent => {
    aePrefs.setPrefs({shrinkRestoredTabGrps: aEvent.target.checked});
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

    aePrefs.setPrefs({showCamouflageWebPg: isMinzAllCamo});
  });

  $("minz-all-camouflage-webpg-url").addEventListener("blur", aEvent => {
    let url = aEvent.target.value;
    if (url == "") {
      resetMinzAllCamouflageWebPageURL(aEvent);
      return;
    }
    validateURLTextbox(aEvent.target);
    aePrefs.setPrefs({camouflageWebPgURL: aEvent.target.value});
  });

  $("panic-action-minimize-current").addEventListener("click", selectPanicAction);
  $("minz-curr-action-opt").addEventListener("change", aEvent => {
    let selectedOpt = aEvent.target.value;
    aePrefs.setPrefs({minimizeCurrOpt: selectedOpt});
    toggleRestoreMinimizedWndNote(selectedOpt);
  });
  
  $("panic-action-close-all").addEventListener("click", selectPanicAction);

  $("shortcut-key").addEventListener("click", aEvent => {
    let isKeybShct = aEvent.target.checked;
    aePrefs.setPrefs({shortcutKey: isKeybShct});

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

    // Unhide the two drop-down menus for the keyboard shortcut if they
    // were hidden because the older shortcut was set from Add-ons Manager.
    let keySelectElt = $("panicbutton-key");
    let keyModSelectElt = $("panicbutton-key-modifiers");

    keySelectElt.style.display = "inline-block";
    keySelectElt.selectedIndex = 7;
    keyModSelectElt.style.display = "inline-block";
    keyModSelectElt.selectedIndex = 0;

    let externKeybShct = $("extern-keyb-shct");
    externKeybShct.style.display = "none";
    externKeybShct.innerText = "";

    $("shct-note").innerText = browser.i18n.getMessage("prefsShortcutKeyNote");
  });

  $("toolbar-button-caption").addEventListener("blur", aEvent => {
    aePrefs.setPrefs({toolbarBtnLabel: aEvent.target.value});
  });

  $("rev-contrast-icon").addEventListener("click", aEvent => {
    let isRevContrast = aEvent.target.checked;   
    aePrefs.setPrefs({toolbarBtnRevContrastIco: isRevContrast});

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

  $("about-dlg").dataset["locale"] = locale;

  let usrContribCTA = $("usr-contrib-cta");
  usrContribCTA.appendChild(aeDOM.createEltWithID("label", "usr-contrib-cta-hdg", "aboutContribHdg"));
  usrContribCTA.appendChild(aeDOM.createTextNodeWithSpc());
  usrContribCTA.appendChild(aeDOM.createHyperlink("aboutDonate", aeConst.URL_DONATE));
  usrContribCTA.appendChild(aeDOM.createTextNodeWithSpc());
  usrContribCTA.appendChild(aeDOM.createEltWithID("label", "usr-contrib-cta-conj", "aboutContribConj"))
  usrContribCTA.appendChild(aeDOM.createHyperlink("aboutL10n", aeConst.URL_L10N));

  let hyperlinks = document.querySelectorAll("a.hyperlink");
  hyperlinks.forEach(aElt => {
    aElt.addEventListener("click", aEvent => {
      aEvent.preventDefault();
      gotoURL(aEvent.target.href);
    });
  });

  let prefs = await aePrefs.getAllPrefs();
  let panicActions = Array.from(document.getElementsByName("panic-action"));
  let panicActionRadio = panicActions.find(aRadioOpt => aRadioOpt.value == prefs.action);
  panicActionRadio.checked = true;
  switchSelectedActionRadioPanel(prefs.action);

  let panicActionRadioBtns = document.querySelectorAll("input[name='panic-action']");
  panicActionRadioBtns.forEach(aElt => {
    aElt.addEventListener("click", aEvent => {
      browser.runtime.sendMessage({msgID: "unsave-minimized-wnd"});
    });
  });

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

  setPswd.addEventListener("click", async (aEvent) => {
    let restoreSessPswdEnabled = await aePrefs.getPref("restoreSessPswdEnabled");
    if (restoreSessPswdEnabled) {
      gDialogs.changeRestoreSessPswd.showModal();
    }
    else {
      gDialogs.setRestoreSessPswd.showModal();
    }
  });

  rmPswd.addEventListener("click", aEvent => {
    gDialogs.removeRestoreSessPswd.showModal();
  });

  $("restore-sess-snooze-tabs").checked = prefs.restoreSessInactvTabsZzz;
  $("restore-sess-shrink-tabgrps").checked = prefs.shrinkRestoredTabGrps;

  if (!prefs.restoreTabGroups) {
    let restoreSessOptsElt = $("restore-sess-options");
    let opts = restoreSessOptsElt.querySelectorAll(".restore-tabgrps-opt");
    opts.forEach(aElt => {
      aElt.style.display = "none";
    });
  }

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

  let resp = await browser.runtime.sendMessage({
    msgID: "get-toolbar-btn-icons-map"
  });
  gToolbarBtnIcons = resp.toolbarBtnIconsMap;

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
    if (gOS == "mac") {
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
    keySelectElt.style.display = "inline-block";
    keyModSelectElt.style.display = "inline-block";
    $("shct-note").innerText = browser.i18n.getMessage("prefsShortcutKeyNote");
  }
  
  if (panicButtonKeyMod) {
    gShctKeyModSelected = true;
  }

  if (keySelectElt.selectedIndex >= 12) {
    // Don't allow selection of a non-function key without a modifier.
    keyModNoneOptElt.style.display = "none";
  }

  // Close the Change Icon dialog if it is open.
  resp = await browser.runtime.sendMessage({msgID: "ping-change-icon-dlg"});
  if (resp.isChangeIconDlgOpen) {
    tabCustomize.click();
    browser.runtime.sendMessage({msgID: "auto-close-change-icon-dlg"}); 
  }

  if (prefs.defDlgBtnFollowsFocus) {
    aeInterxn.initDialogButtonFocusHandlers();
  }

  aeVisual.preloadMsgBoxIcons();
  aeVisual.cacheIcons(
    "pref-general.svg",
    "pref-customize.svg",
    "pref-general-checked.svg",
    "pref-customize-checked.svg",
    "pref-general-dk.svg",
    "pref-customize-dk.svg",
    "pref-general-checked-dk.svg",
    "pref-customize-checked-dk.svg"
  );
}


async function switchPrefsPanel(aEvent)
{
  let id = aEvent.target.id;
  let tabOptions = $("preftab-options-btn");
  let tabCustomize = $("preftab-customize-btn");

  if (id == "preftab-options-btn") {
    tabCustomize.classList.remove("active-tab");
    tabCustomize.setAttribute("aria-selected", "false");
    $("prefpane-customize").classList.remove("active-tab-panel");
    $("prefpane-options").classList.add("active-tab-panel");
  }
  else if (id == "preftab-customize-btn") {
    tabOptions.classList.remove("active-tab");
    tabOptions.setAttribute("aria-selected", "false");
    $("prefpane-options").classList.remove("active-tab-panel");
    $("prefpane-customize").classList.add("active-tab-panel");

    if (! aeToolbarIconPicker.isInitialized()) {
      aeToolbarIconPicker.init(
        "toolbar-button-icon",
        gToolbarBtnIcons,
        $("toolbar-button-caption"),
        $("custom-icon-upload-btn")
      );

      let prefs = await aePrefs.getAllPrefs();
      let revContrastChbox = $("rev-contrast-icon");
  
      if (prefs.toolbarBtnRevContrastIco) {
        revContrastChbox.checked = true;
        $("toolbar-button-icon").setAttribute("colorscheme", "dark");
      }

      if (prefs.toolbarBtnIcon == aeToolbarIconPicker.CUSTOM_ICON_IDX) {
        let customIconRadio = $("custom-icon");
        customIconRadio.style.visibility = "visible";
        $("custom-icon-label").style.visibility = "visible";

        let canvas = $("custom-icon-img");
        let canvasCtx = canvas.getContext("2d");
        let img = new Image();

        img.onload = function () {
          canvasCtx.drawImage(this, 0, 0, 36, 36);
        };
        img.src = prefs.toolbarBtnData;
        
        aeToolbarIconPicker.hasCustomIcon = true;
        revContrastChbox.disabled = true;
      }
      aeToolbarIconPicker.selectedIndex = prefs.toolbarBtnIcon;
    }
  }
  aEvent.target.classList.add("active-tab");
  aEvent.target.setAttribute("aria-selected", "true");
}


function initDialogs()
{
  function resetPasswdPrefs()
  {
    $("hide-and-replc-set-pswd").innerText = browser.i18n.getMessage("setPswd");
    $("hide-and-replc-rm-pswd").style.visibility = "hidden";
  }

  gDialogs.setRestoreSessPswd = new aeDialog("#set-password-dlg");
  gDialogs.setRestoreSessPswd.onInit = function ()
  {
    $("set-pswd-error").innerText = "";
    $("enter-password").value = "";
    $("confirm-password").value = "";
  };

  gDialogs.setRestoreSessPswd.onShow = function ()
  {
    $("enter-password").focus();
  };

  gDialogs.setRestoreSessPswd.onAccept = async function ()
  {
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

    let resp = await browser.runtime.sendMessage({
      msgID: "set-restore-sess-passwd",
      passwd,
    });

    // Add a short delay so that user can see resulting prefs UI changes.
    window.setTimeout(() => {
      $("hide-and-replc-set-pswd").innerText = browser.i18n.getMessage("chgPswd");
      $("hide-and-replc-rm-pswd").style.visibility = "visible";
    }, 500);
    
    this.close();
  };

  gDialogs.changeRestoreSessPswd = new aeDialog("#change-password-dlg");
  gDialogs.changeRestoreSessPswd.onInit = function ()
  {
    $("chg-pswd-error").innerText = "";
    $("old-pswd").value = "";
    $("new-pswd").value = "";
    $("confirm-new-pswd").value = "";
  };

  gDialogs.changeRestoreSessPswd.onShow = function ()
  {
    $("old-pswd").focus();
  };

  gDialogs.changeRestoreSessPswd.onAccept = async function ()
  {
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

    let resp = await browser.runtime.sendMessage({
      msgID: "get-restore-sess-passwd"
    });
    let currentPswd = resp.restoreSessPwd;
    let enteredOldPswd = oldPswdElt.value;
    
    if (enteredOldPswd != currentPswd) {
      $("chg-pswd-error").innerText = browser.i18n.getMessage("pswdWrong");
      oldPswdElt.select();
      oldPswdElt.focus();
      return;
    }

    if (passwd == "" && confirmPasswd == "") {
      // If both password fields are empty, clear the password as if the user
      // had clicked "Remove Password"
      await browser.runtime.sendMessage({msgID: "rm-restore-sess-passwd"});

      resetPasswdPrefs();
      this.close();
      return;
    }

    await browser.runtime.sendMessage({
      msgID: "set-restore-sess-passwd",
      passwd
    });

    this.close();
  };

  gDialogs.removeRestoreSessPswd = new aeDialog("#remove-password-dlg");
  gDialogs.removeRestoreSessPswd.onInit = function ()
  {
    $("pswd-for-removal").value = "";
    $("rm-pswd-error").innerText = "";
  };
  gDialogs.removeRestoreSessPswd.onShow = function ()
  {
    $("pswd-for-removal").focus();
  };
  gDialogs.removeRestoreSessPswd.onAccept = async function ()
  {
    let enteredPswdElt = $("pswd-for-removal");
    let enteredPswd = enteredPswdElt.value;
    let resp = await browser.runtime.sendMessage({
      msgID: "get-restore-sess-passwd"
    });
    let currPswd = resp.restoreSessPwd;

    if (enteredPswd != currPswd) {
      $("rm-pswd-error").innerText = browser.i18n.getMessage("pswdWrong");
      enteredPswdElt.select();
      enteredPswdElt.focus();
      return;
    }
    
    await browser.runtime.sendMessage({msgID: "rm-restore-sess-passwd"});
    resetPasswdPrefs();
    this.close();
  };
  
  gDialogs.about = new aeDialog("#about-dlg");
  gDialogs.about.extInfo = null;
  gDialogs.about.onInit = function ()
  {
    if (! this.extInfo) {
      let extManifest = browser.runtime.getManifest();
      this.extInfo = {
        name: extManifest.name,
        version: aeMozVersion.getExtendedVersion(extManifest.version),
        description: extManifest.description,
        homePgURL: extManifest.homepage_url,
      };
    }

    document.getElementById("ext-name").innerText = this.extInfo.name;
    document.getElementById("ext-ver").innerText = browser.i18n.getMessage("aboutExtVer", this.extInfo.version);
    document.getElementById("ext-desc").innerText = this.extInfo.description;
    document.getElementById("ext-home-pg-link").href = this.extInfo.homePgURL;
  };  
}


function selectPanicAction(aEvent)
{
  let selectedActionID = aEvent.target.value;
  switchSelectedActionRadioPanel(selectedActionID);
  aePrefs.setPrefs({action: selectedActionID});
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
      aePrefs.setPrefs({
        toolbarBtnIcon: aeToolbarIconPicker.CUSTOM_ICON_IDX,
        toolbarBtnData: scaledImgData,
        toolbarBtnRevContrastIco: false,
      });

      aeToolbarIconPicker.hasCustomIcon = true;
      aeToolbarIconPicker.selectedIndex = aeToolbarIconPicker.CUSTOM_ICON_IDX;
    };
    
    img.src = encImgData;   

    $("custom-icon-label").style.visibility = "visible";
    let customIconRadio = $("custom-icon");
    customIconRadio.style.visibility = "visible";

    let revContrastChbox = $("rev-contrast-icon");
    revContrastChbox.setAttribute("disabled", "true");
    revContrastChbox.checked = false;
  });

  fileReader.readAsDataURL(imgFile);
}


function getLocalizedKeybShct(aShortcutKeyModifiers, aShortcutKey)
{
  let rv = "";
  let isMacOS = gOS == "mac";
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


function resetReplacemtWebPageURL(aEvent)
{
  $("webpg-url").value = aeConst.REPLACE_WEB_PAGE_DEFAULT_URL;
  aePrefs.setPrefs({replacementWebPgURL: aeConst.REPLACE_WEB_PAGE_DEFAULT_URL});  
}


function resetMinzAllCamouflageWebPageURL(aEvent)
{
  $("minz-all-camouflage-webpg-url").value = aeConst.REPLACE_WEB_PAGE_DEFAULT_URL;
  aePrefs.setPrefs({camouflageWebPgURL: aeConst.REPLACE_WEB_PAGE_DEFAULT_URL});
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

  aePrefs.setPrefs({
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


//
// Event handlers
//

document.addEventListener("DOMContentLoaded", async (aEvent) => {
  init();
});


document.addEventListener("contextmenu", aEvent => {
  if (aEvent.target.tagName != "INPUT" && aEvent.target.getAttribute("type") != "text") {
    aEvent.preventDefault();
  }
}, false);


document.addEventListener("click", aEvent => {
  if (aEvent.target.tagName == "INPUT"
      && aEvent.target.getAttribute("type") == "radio"
      && aEvent.target.getAttribute("name") == "toolbar-button-icon") {
    aePrefs.setPrefs({toolbarBtnIcon: aEvent.target.value});

    let revContrastChbox = $("rev-contrast-icon");
    
    if (aEvent.target.id == "custom-icon") {
      revContrastChbox.setAttribute("disabled", "true");
    }
    else {
      revContrastChbox.removeAttribute("disabled");
    }
  }
});


window.addEventListener("keydown", aEvent => {
  if (aEvent.key == "Enter") {
    if (aeDialog.isOpen()) {
      aeDialog.acceptDlgs();
    }
    else {
      if (aEvent.target.tagName == "BUTTON") {
        aEvent.target.click();
      }
    }
    aEvent.preventDefault();
  }
  else if (aEvent.key == "Escape" && aeDialog.isOpen()) {
    aeDialog.cancelDlgs();
  }
  else if (aEvent.key == " ") {
    if (aEvent.target.tagName == "A") {
      aEvent.target.click();
    }
  }
  else {
    aeInterxn.suppressBrowserShortcuts(aEvent, aeConst.DEBUG);
  }
});


$("custom-icon-upload-btn").addEventListener("click", aEvent => {
  $("custom-icon-upload").showPicker();
});


browser.runtime.onMessage.addListener(async (aRequest) => {
  log(`Panic Button/wx::options.js: Received message "${aRequest.msgID}"`);

  if (aRequest.msgID == "ext-prefs-customize") {
    $("preftab-customize-btn").click();

    let prefsPgTab = await browser.tabs.getCurrent();
    browser.windows.update(prefsPgTab.windowId, {focused: true});
    browser.tabs.update(prefsPgTab.id, {active: true});
  }
  else if (aRequest.msgID == "ping-ext-prefs-pg") {
    let resp = {isExtPrefsPgOpen: true};
    return Promise.resolve(resp);
  }
});


//
// Utilities
//

function $(aID)
{
  return document.getElementById(aID);
}


function onError(aError)
{
  console.error("Panic Button/wx: %s", aError);
}


function log(aMessage)
{
  if (aeConst.DEBUG) { console.log(aMessage); }
}
