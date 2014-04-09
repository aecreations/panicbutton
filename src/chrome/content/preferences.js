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
 * Portions created by the Initial Developer are Copyright (C) 2008-2014
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */


Components.utils.import("resource://panicbutton/modules/aeUtils.js");
Components.utils.import("resource://panicbutton/modules/aeConstants.js");


const CUSTOM_TB_ICON_INDEX = 20;

var gStrBundle;
var gToolbarIconListElt, gPanicButtonAction, gEnableFuncKey, gURLTextboxElt;
var gToolbarBtnCaption, gRestSessToolbarLayout, gPanicButtonActionDesc;
var gResetPrefs = false;
var gPanicButtonActionDescKeys = ["Hide", "Minimize", "Quit", "Replace"];



function $(aID) {
  return document.getElementById(aID);
}


function init()
{
  gStrBundle = $("ae-panicbutton-strings");
  gPanicButtonAction = $("panicbutton-action");
  gPanicButtonActionDesc = $("panicbutton-action-desc");
  gEnableFuncKey = $("enable-function-key");
  gToolbarBtnCaption = $("toolbar-button-caption");
  gRestSessToolbarLayout = $("restore-session-toolbar-layout");
  gURLTextboxElt = $("webpg-url");

  var toolbarBtnLabel = aeUtils.getPref("panicbutton.toolbarbutton.label", "");
  if (toolbarBtnLabel) {
    gToolbarBtnCaption.value = toolbarBtnLabel;
  }
  else {
    gToolbarBtnCaption.value = gStrBundle.getString("panicbutton.defaultLabel");
  }

  var actionIndex = aeUtils.getPref("panicbutton.action", 0);
  var actionDescKey = "actionDesc" + gPanicButtonActionDescKeys[actionIndex];
  var actionDescTxtNode = document.createTextNode(gStrBundle.getString(actionDescKey));
  var replaceSessOptsElt = $("replace-session-opts");

  gPanicButtonAction.selectedIndex = actionIndex;
  gPanicButtonActionDesc.appendChild(actionDescTxtNode);
  gRestSessToolbarLayout.selectedIndex = aeUtils.getPref("panicbutton.restorebar.layout", 0);
  gURLTextboxElt.value = aeUtils.getPref("panicbutton.action.replace.web_pg_url", aeConstants.REPLACE_WEB_PAGE_DEFAULT_URL);

  if (actionIndex == aeConstants.PANICBUTTON_ACTION_REPLACE) {
    replaceSessOptsElt.removeAttribute("hidden");
  }

  // On Mac OS X, Panic Button shortcut key is Command+F9 - the F9 key is a
  // system function key reserved for Expose
  if (aeUtils.getOS() == "Darwin") {
    gEnableFuncKey.label = gStrBundle.getString("macEnableShortcutKey");
  }

  gEnableFuncKey.checked = aeUtils.getPref("panicbutton.key", "VK_F9");

  gToolbarIconListElt = $("toolbar-button-icon");

  var imgURL = aeUtils.getPref("panicbutton.toolbarbutton.custom_icon_url", "");
  if (imgURL) {
    $("custom-listitem").setAttribute("collapsed", "false");
    $("custom-image").src = imgURL;
    gToolbarIconListElt.selectedIndex = gToolbarIconListElt.getRowCount() - 1;
    gToolbarIconListElt.ensureSelectedElementIsVisible();
  }
  else {
    gToolbarIconListElt.selectedIndex = aeUtils.getPref("panicbutton.toolbarbutton.icon", 0);
  }

  gToolbarIconListElt.ensureSelectedElementIsVisible();
}


function initCustomizeTab()
{
  // This function is invoked by the onselect event handler of the <tabs>
  // element, which is invoked before the onload event handler for the XUL
  // dialog!
  if (! gPanicButtonAction) {
    return;
  }

  var isPBActionHide = gPanicButtonAction.selectedIndex != aeConstants.PANICBUTTON_ACTION_HIDE;
  gRestSessToolbarLayout.setAttribute("disabled", isPBActionHide);
  $("toolbar-layout-label").setAttribute("disabled", isPBActionHide);
}


function updatePanicButtonActionDesc()
{
  var actionIndex = gPanicButtonAction.selectedIndex;
  var actionDescKey = "actionDesc" + gPanicButtonActionDescKeys[actionIndex];
  var actionDescTxtNode = document.createTextNode(gStrBundle.getString(actionDescKey));
  var replaceSessOptsElt = $("replace-session-opts");

  gPanicButtonActionDesc.removeChild(gPanicButtonActionDesc.firstChild);
  gPanicButtonActionDesc.appendChild(actionDescTxtNode);

  if (actionIndex == aeConstants.PANICBUTTON_ACTION_REPLACE) {
    replaceSessOptsElt.removeAttribute("hidden");
  }
  else {
    replaceSessOptsElt.setAttribute("hidden", "true");
  }
}


function showChangedPrefMsg()
{
  aeUtils.alertEx(document.title, gStrBundle.getString("prefChangeMsg"));
}


function setWebPageURLToBrowserHomePage()
{
  var homePgURL = Application.prefs.getValue("browser.startup.homepage", "");
  gURLTextboxElt.value = homePgURL;
}


function resetWebPageURL()
{
  gURLTextboxElt.value = aeConstants.REPLACE_WEB_PAGE_DEFAULT_URL;
}


function resetCustomizations()
{
  $("toolbar-button-caption").value = gStrBundle.getString("panicbutton.defaultLabel");
  $("restore-session-toolbar-layout").selectedIndex = 0;      
  var gToolbarIconListElt = $("toolbar-button-icon");
  gToolbarIconListElt.selectedIndex = 0;
  gToolbarIconListElt.ensureSelectedElementIsVisible();

  gResetPrefs = true;
}


function setCustomTBIcon()
{
  var fp = Components.classes['@mozilla.org/filepicker;1']
                     .createInstance(Components.interfaces.nsIFilePicker);
 
  fp.init(window, gStrBundle.getString("customIconDlgTitle"), fp.modeOpen);
  fp.appendFilters(fp.filterImages);

  var fpShownCallback = {
    done: function (aResult) {
      if (aResult != fp.returnOK) {
	return;
      }

      var imgURL = fp.fileURL.QueryInterface(Components.interfaces.nsIURI).spec;
      if (! imgURL) {
	aeUtils.alertEx(document.title, gStrBundle.getString("errorInvalidCustomIconURL"));
	return;
      }
  
      $("custom-listitem").setAttribute("collapsed", "false");
      $("custom-image").src = imgURL;
      gToolbarIconListElt.selectedIndex = gToolbarIconListElt.getRowCount() - 1;
      gToolbarIconListElt.focus();
    }
  };

  fp.open(fpShownCallback);
}


function doOK()
{
  aeUtils.setPref("panicbutton.action", gPanicButtonAction.selectedIndex);
  aeUtils.setPref("panicbutton.enable_function_key", gEnableFuncKey.checked);
  aeUtils.setPref("panicbutton.toolbarbutton.label", gToolbarBtnCaption.value);
  aeUtils.setPref("panicbutton.restorebar.layout", gRestSessToolbarLayout.selectedIndex);

  let (key = "") {
    if (gEnableFuncKey.checked) {
      key = "VK_F9";
    }
    aeUtils.setPref("panicbutton.key", key);
  };

  if (! gURLTextboxElt.value) {
    gURLTextboxElt.value = "about:blank";
  }
  aeUtils.setPref("panicbutton.action.replace.web_pg_url", gURLTextboxElt.value);

  if (gToolbarIconListElt.selectedIndex == CUSTOM_TB_ICON_INDEX) {
    var imgURL = $("custom-image").src;
    aeUtils.log("URL of custom Panic Button toolbar button image:\n" + imgURL);
    aeUtils.setPref("panicbutton.toolbarbutton.custom_icon_url", imgURL);
  }
  else {
    aeUtils.setPref("panicbutton.toolbarbutton.icon", 
		    gToolbarIconListElt.selectedIndex);
    aeUtils.setPref("panicbutton.toolbarbutton.custom_icon_url", "");
  }

  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                     .getService(Components.interfaces.nsIWindowMediator);
  var wndEnum = wm.getEnumerator("navigator:browser");
  while (wndEnum.hasMoreElements()) {
    var wnd = wndEnum.getNext();
    wnd.aecreations.panicbutton.applyUserPrefs();
  }

  return true;
}


function showNewPreferencesDlg()
{
  window.openDialog("chrome://panicbutton/content/options.xul", "dlg_panicbutton_prefsEx", "chrome,modal,titlebar,toolbar,centerscreen,dialog=yes", "pane-general");
}
