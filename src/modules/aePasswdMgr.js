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

const EXPORTED_SYMBOLS = ["aePasswdMgr"];


//
// Private constants and variables
//

const DEBUG = false;

const HOSTNAME    = "chrome://panicbutton/";
const HTTP_REALM  = "Panic Button";

var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");

var _pswdMgr = Components.classes["@mozilla.org/login-manager;1"]
                         .getService(Components.interfaces.nsILoginManager);


var aePasswdMgr = {

 /**
  * Saves user login info containing the given username and password.
  *
  * @param aUsername  The username
  * @param aPassword  The password
  *
  * @return Boolean value set to true if save was successful, or false if
  *         the save failed.
  */
 saveLogin: function (aUsername, aPassword)
 {
   var loginInfo = new nsLoginInfo(HOSTNAME, null, HTTP_REALM, aUsername, aPassword, "", "");

   this._log("saveLogin(): Saving login info for username `" + aUsername + "'");

   try {
     _pswdMgr.addLogin(loginInfo);
   }
   catch (e) {
     this._log("saveLogin(): Error saving login: " + e);
     return false;
   }
  
   return true;
 },


 /**
  * Updates the password that was saved for the user with the given username.
  *
  * @param aUsername     The username
  * @param aOldPassword  The old password
  * @param aNewPassword  The new password
  *
  * @return Boolean value set to true if update was successful, or false
  *         if it was not.
  */
 updateLogin: function (aUsername, aOldPassword, aNewPassword)
 {
   var logins = _pswdMgr.findLogins({}, HOSTNAME, null, HTTP_REALM);
   var oldLoginInfo;

   for (let i = 0; i < logins.length; i++) {
     if (logins[i].username == aUsername && logins[i].password == aOldPassword) {
       oldLoginInfo = logins[i];
       this._log("updateLogin(): Found login info for username `" + aUsername + "'");
       break;
     }
   }

   if (! oldLoginInfo) {
     this._log("updateLogin(): Can't find login info for username `" + aUsername + "', nothing to update");
     return false;
   }

   var newLoginInfo = new nsLoginInfo(HOSTNAME, null, HTTP_REALM, aUsername, aNewPassword, "", "");

   try {
     _pswdMgr.modifyLogin(oldLoginInfo, newLoginInfo);
   }
   catch (e) {
     this._log("updateLogin(): Password update failed: " + e);
     return false;
   }

   this._log("updateLogin(): Password updated successfully for username `" + aUsername + "'");

   return true;
 },


 /**
  * Removes the login info associated with the given username.
  *
  * @param aUsername  The username
  *
  * @return Boolean value set to true if removal was successful, false if
  *         removal failed.
  */
 deleteLogin: function (aUsername)
 {
   // Find the user for this extension, then remove the login info.  This allows
   // for removing the stored password without knowing what the password is.
   var logins = _pswdMgr.findLogins({}, HOSTNAME, null, HTTP_REALM);

   for (let i = 0; i < logins.length; i++) {
     if (logins[i].username == aUsername) {
       this._log("deleteLogin(): Removing login info for username `" + aUsername + "'");
       try {
	 _pswdMgr.removeLogin(logins[i]);
       }
       catch (e) {
	 this._log("deleteLogin(): Login deletion failed: " + e);
	 return false;
       }

       return true;
     }
   }

   return false;
 },


 /**
  * Returns the password associated with the given username.
  * 
  * @param aUsername  The username
  *
  * @return String containing the password.  If login info not found for the
  *         given username, then the return value is undefined.
  */
 getPassword: function (aUsername)
 {
   var logins = _pswdMgr.findLogins({}, HOSTNAME, null, HTTP_REALM);
   var rv;

   for (let i = 0; i < logins.length; i++) {
     if (logins[i].username == aUsername) {
       this._log("getPassword(): Found login info for username `" + aUsername + "'; retrieving password");

       rv = logins[i].password;
       break;
     }
   }

   if (rv === undefined) {
     this._log("getPassword(): Can't find login info for username `" + aUsername + "'");
   }

   return rv;
 },


 /**
  * Returns true if the login info for the given username exists, false
  * otherwise.
  *
  * @param aUsername  The username
  *
  * @return Boolean value set to true if login exists, or false if it does not.
  */
 loginExists: function (aUsername)
 {
   var logins = _pswdMgr.findLogins({}, HOSTNAME, null, HTTP_REALM);
   var rv = false;

   for (let i = 0; i < logins.length; i++) {
     if (logins[i].username == aUsername) {
       rv = true;
       break;
     }
   }

   this._log("loginExists(): It is " + rv + " that the login exists for username `" + aUsername + "'");

   return rv;
 },


 //
 // Private functions
 //

 _log: function (aMessage)
 {
   if (DEBUG) {
     var consoleSvc = Components.classes["@mozilla.org/consoleservice;1"]
                                .getService(Components.interfaces
		                                      .nsIConsoleService);
     consoleSvc.logStringMessage("aePasswdMgr::" + aMessage);
   }
 }
};
