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
  if (! fadeInEffect.value) {
    window.sizeToContent();
    let vboxes = document.getElementsByClassName("has-description");

    for (let i = 0; i < vboxes.length; i++) {
      let vbox = vboxes[i];
      vbox.height = vbox.boxObject.height;
      window.sizeToContent();      
    }
  }

  updatePanicButtonActionDesc(true);

  $("panicbutton-action-options").selectedIndex = aeUtils.getPref("panicbutton.action");

  var shortcutKey = aeUtils.getPref("panicbutton.key", PANICBUTTON_SHORTCUT_KEY);
  $("enable-function-key").checked = Boolean(shortcutKey);
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

  var shortcutKey = $("enable-function-key").checked ? PANICBUTTON_SHORTCUT_KEY : "";
  aeUtils.setPref("panicbutton.key", shortcutKey);
}
