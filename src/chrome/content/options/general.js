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
 * Portions created by the Initial Developer are Copyright (C) 2014
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

Components.utils.import("resource://panicbutton/modules/aeUtils.js");
Components.utils.import("resource://panicbutton/modules/aeConstants.js");

const PANICBUTTON_SHORTCUT_KEY = "VK_F9";

var gPanicButtonActionDescKeys = ["Hide", "Minimize", "Quit", "Replace"];


function $(aID)
{
  return document.getElementById(aID);
}


function initPrefPaneGeneral()
{
  initDlg();

  // Workaround to height rendering issue on the <description> element of the
  // pref dialog.  Do not do this on platforms where pref dialogs dynamically
  // adjust their heights when switching between pref panes (e.g. Mac OS X), as
  // it will interfere with the dialog height.
  var fadeInEffect = Application.prefs.get("browser.preferences.animateFadeIn");
  aeUtils.log("fadeInEffect: " + fadeInEffect.value);

  if (! fadeInEffect.value) {
    aeUtils.log("Initializing workaround for prefpane height issue (this should NOT be executed if running on Mac OS X)");
    window.sizeToContent();
    let vboxes = document.getElementsByClassName("has-description");

    for (let i = 0; i < vboxes.length; i++) {
      let vbox = vboxes[i];
      vbox.height = vbox.boxObject.height;
      window.sizeToContent();      
    }
  }
  aeUtils.log("END prefpane height initialization");

  updatePanicButtonActionDesc(true);

  $("panicbutton-action-options").selectedIndex = aeUtils.getPref("panicbutton.action");

  // Set up the display of the modifier keys and the Delete key on Mac OS X.
  var keyModifiersAccelShift = "keyModifiersAccelShift";
  var keyModifiersAltShift = "keyModifiersAltShift";
  if (aeUtils.getOS() == "Darwin") {
    keyModifiersAccelShift += "Mac";
    keyModifiersAltShift += "Mac";
    $("key-del").label = gStrBundle.getString("keyDeleteMac");
  }

  $("key-modifiers-accelshift").label = gStrBundle.getString(keyModifiersAccelShift);
  $("key-modifiers-altshift").label = gStrBundle.getString(keyModifiersAltShift);

  

  // Select the shortcut key and its modifiers.
  var key = aeUtils.getPref("panicbutton.key", PANICBUTTON_SHORTCUT_KEY);
  var modifiers = aeUtils.getPref("panicbutton.key.modifiers", "");
  var allKeys = $("panicbutton-key").menupopup.childNodes;
  var allModifiers = $("panicbutton-key-modifiers").menupopup.childNodes;

  for (let i = 0; i < allKeys.length; i++) {
    if (allKeys[i].getAttribute("value") == key) {
      $("panicbutton-key").selectedIndex = i;
      break;
    }
  }

  for (let i = 0; i < allModifiers.length; i++) {
    if (allModifiers[i].getAttribute("value") == modifiers) {
      $("panicbutton-key-modifiers").selectedIndex = i
      break;
    }
  }
}


function updatePanicButtonActionDesc(aInitDlg)
{
  var panicButtonActionDesc = $("panicbutton-action-desc");
  var actionIndex = $("panicbutton-action").selectedIndex;
  var actionDescKey = "actionDesc" + gPanicButtonActionDescKeys[actionIndex];
  var actionDescTxtNode = document.createTextNode(gStrBundle.getString(actionDescKey));

  if (! aInitDlg) {
    panicButtonActionDesc.removeChild(panicButtonActionDesc.firstChild);
  }

  panicButtonActionDesc.appendChild(actionDescTxtNode);

  $("panicbutton-action-options").selectedIndex = actionIndex;
}


function resetWebPageURL()
{
  $("webpg-url").value = aeConstants.REPLACE_WEB_PAGE_DEFAULT_URL;

  // Also need to set the <preference> element's value, because it won't be set
  // automatically when the user clicked the "Reset" button.
  $("replace-url-pref").value = aeConstants.REPLACE_WEB_PAGE_DEFAULT_URL;
}


function applyGeneralPrefChanges()
{
  if ($("webpg-url").value.trim() == "") {
    aeUtils.setPref("panicbutton.action.replace.web_pg_url", "about:blank");
  }

  var key = $("panicbutton-key").selectedItem.value;
  var modifiers = $("panicbutton-key-modifiers").selectedItem.value;

  aeUtils.setPref("panicbutton.key", key);
  aeUtils.setPref("panicbutton.key.modifiers", modifiers);
}
