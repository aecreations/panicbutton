/* -*- mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
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
 * Portions created by the Initial Developer are Copyright (C) 2016
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://panicbutton/modules/aeUtils.js");
Components.utils.import("resource://panicbutton/modules/aePasswdMgr.js");


var gDlgArgs = window.arguments[0];
var gStrBundle;
var gLoginMgrKey;


function $(aID)
{
  return document.getElementById(aID);
}


function init()
{
  gStrBundle = aeUtils.getStringBundle("chrome://panicbutton/locale/panicbutton.properties");
  gLoginMgrKey = gStrBundle.getString("loginMgrKey");

  if (aePasswdMgr.loginExists(gLoginMgrKey)) {
    $("old-password-vbox").hidden = false;
  }
}


function removePassword()
{
  if (! aePasswdMgr.loginExists(gLoginMgrKey)) {
    aeUtils.beep();
    return;
  }
  
  aePasswdMgr.deleteLogin(gLoginMgrKey);
  gDlgArgs.userCancel = false;
  gDlgArgs.removedPswd = true;
  window.close();
}


function accept()
{
  let passwd = $("enter-password").value;
  let confirmPasswd = $("confirm-password").value;

  if (passwd != confirmPasswd) {
    aeUtils.alertEx(window.title, gStrBundle.getString("pswdMismatch"));
    return false;
  }

  // TO DO: What happens if both password fields are empty?

  if (aePasswdMgr.loginExists(gLoginMgrKey)) {
    let oldPswd = $("old-password").value;
    aePasswdMgr.updateLogin(gLoginMgrKey, oldPswd, passwd);
    gDlgArgs.changedPswd = true;
  }
  else {
    aePasswdMgr.saveLogin(gLoginMgrKey, passwd);
    gDlgArgs.newPswd = true;
  }

  gDlgArgs.userCancel = false;
  return true;
}


function cancel()
{
  gDlgArgs.userCancel = true;
  window.close();
}
