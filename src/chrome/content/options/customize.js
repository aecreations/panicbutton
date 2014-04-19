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


function initPrefPaneCustomize()
{
  initDlg();

  var toolbarBtnCaption = $("toolbar-button-caption");
  var toolbarBtnLabel = aeUtils.getPref("panicbutton.toolbarbutton.label", "");
  if (toolbarBtnLabel) {
    toolbarBtnCaption.value = toolbarBtnLabel;
  }
  else {
    toolbarBtnCaption.value = gStrBundle.getString("panicbutton.defaultLabel");
  }
}


function iconPickerKeyboardNav(aEvent)
{
  var toolbarButtonIcon = $("toolbar-button-icon");
  var currentIdx = toolbarButtonIcon.selectedIndex;
  var numCols = 6;
  var maxIcons = $("custom-image").hidden ? 20 : 21;
  var newIdx, dir;

  // Override the default handling of arrow keys when inside the <radiogroup>,
  // so that the up- and down-arrow keys can be correctly handled.
  switch (aEvent.keyCode) {
  case aEvent.DOM_VK_LEFT:
    newIdx = currentIdx - 1;
    break;

  case aEvent.DOM_VK_RIGHT:
    newIdx = currentIdx + 1;
    break;

  case aEvent.DOM_VK_UP:
    newIdx = currentIdx - numCols;
    break;

  case aEvent.DOM_VK_DOWN:
    newIdx = currentIdx + numCols;
    break;

  default:
    return;
  }

  if (newIdx < 0 || newIdx > maxIcons - 1) {
    newIdx = currentIdx;
  }

  toolbarButtonIcon.selectedIndex = newIdx;

  aEvent.preventDefault();
}


function setCustomTBIcon()
{
  alert("This action is not available right now.");
}


function resetCustomizations()
{
  alert("This action is not available right now.");
}
