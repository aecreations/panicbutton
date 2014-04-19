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

const Cc = Components.classes;
const Ci = Components.interfaces;

var gStrBundle;
var gIsDlgInitialized;


function $(aID) 
{
  return document.getElementById(aID);
}


function initDlg()
{
  // Initialization of the entire pref dialog. Initialization of the individual
  // pref panes should go into their respective event handlers for the
  // `onpaneload' event.
  // NOTE: The pref dialog's `onload' event is called *after* the `onpaneload'
  // events in each pref pane!
  if (! gIsDlgInitialized) {
    gStrBundle = $("ae-panicbutton-strings");

    var titleKey;
    if (aeUtils.getOS() == "WINNT") {
      titleKey = "panicbuttonOptions";
    }
    else {
      titleKey = "panicbuttonPreferences";
    }
    $("ae-panicbutton-preferences").setAttribute("title", gStrBundle.getString(titleKey));

    gIsDlgInitialized = true;
  }
}


function prefwindow_keydown(aEvent)
{
  if (aEvent.target.nodeName == "radiogroup"
      && aEvent.target.id == "toolbar-button-icon") {
    if (typeof(iconPickerKeyboardNav) == "function") {
      // Function defined in chrome://panicbutton/content/options/customize.xul
      iconPickerKeyboardNav(aEvent);
    }
  }
}


function applyPrefChanges()
{
  if (typeof(applyGeneralPrefChanges) == "function") {
    // This function is only defined if its originating pref pane was loaded.
    applyGeneralPrefChanges();
  }

  if (typeof(applyCustomizePrefChanges) == "function") {
    applyCustomizePrefChanges();
  }

  var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
  var wndEnum = wm.getEnumerator("navigator:browser");
  while (wndEnum.hasMoreElements()) {
    var wnd = wndEnum.getNext();
    wnd.aecreations.panicbutton.applyUserPrefs();
  }
}


function unloadDlg()
{
  var instantApplyPrefs = $("ae-panicbutton-preferences").instantApply;

  if (instantApplyPrefs) {
    applyPrefChanges();
  }
}
