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
 * Portions created by the Initial Developer are Copyright (C) 2008-2016
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

Components.utils.import("resource://gre/modules/Services.jsm");


const EXPORTED_SYMBOLS = ["aeUtils"];

const DEBUG = false;
const LOG_TO_CLIPBOARD = false;
const EXTENSION_ID = "{24cea704-946d-11da-a72b-0800200c9a66}";
const WNDTYPE_FX_BROWSER    = "navigator:browser";
const PREFNAME_PREFIX = "extensions.aecreations.";


const Cc = Components.classes;
const Ci = Components.interfaces;


var aeUtils = {

 alertEx : function (aTitle, aMessage)
 {
   Services.prompt.alert(null, aTitle, aMessage);
 },


 confirmEx: function (aTitle, aMessage)
 {
   var rv;
   rv = Services.prompt.confirm(null, aTitle, aMessage);
   return rv;
 },


 confirmYesNo: function (aTitle, aMessage, aIsDefaultButtonNo)
 {
   var rv;
   var prmpt = Services.prompt;
   
   var btnFlags = prmpt.STD_YES_NO_BUTTONS;
   btnFlags += (aIsDefaultButtonNo ? prmpt.BUTTON_POS_1_DEFAULT : prmpt.BUTTON_POS_0_DEFAULT);

   // Return values of nsIPromptService.confirmEx(): 0 = Yes; 1 = No
   var btnIdx = prmpt.confirmEx(null, aTitle, aMessage, btnFlags, "", "", "", "", {});

   // Invert the return value (which is the index of the pressed button) so
   // that the return value of this method is like aeUtils.confirmEx()
   rv = Math.abs(btnIdx - 1);

   return rv;
 },

 promptPassword: function (aTitle, aMessage, aPswdInput)
 {
   var rv;

   rv = Services.prompt.promptPassword(null, aTitle, aMessage, aPswdInput, null, {});

   return rv;
 },

 
 getExtensionID: function ()
 {
   return EXTENSION_ID;
 },


 getUserProfileDir: function ()
 {
   // Throws an exception if profile directory retrieval failed.
   var dirProp = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
   var rv = dirProp.get("ProfD", Ci.nsIFile);
   if (! rv) {
     throw "Failed to retrieve user profile directory path";
   }

   return rv;
 },


 getHostAppID: function ()
 {
   var xulAppInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);

   return xulAppInfo.ID;
 },


 getHostAppName: function ()
 {
   var xulAppInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);

   return xulAppInfo.name;
 },


 getHostAppVersion: function ()
 {
   var xulAppInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);

   return xulAppInfo.version;
 },


 getOS: function ()
 {
   var rv;
   var xulRuntime = Cc["@mozilla.org/xre/app-info;1"].createInstance(Ci.nsIXULRuntime);
   rv = xulRuntime.OS;

   return rv;
 },


 getPref: function (aPrefKey, aDefaultValue)
 {
   let prefName = PREFNAME_PREFIX + aPrefKey;
   let prefs = Services.prefs;
   let prefType = prefs.getPrefType(prefName);
   let rv = undefined;

   if (prefType == prefs.PREF_STRING) {
     rv = prefs.getCharPref(prefName);
   }
   else if (prefType == prefs.PREF_INT) {
     rv = prefs.getIntPref(prefName);
   }
   else if (prefType == prefs.PREF_BOOL) {
     rv = prefs.getBoolPref(prefName);
   }
   else {
     // Pref doesn't exist if prefType == prefs.PREF_INVALID.
     rv = aDefaultValue;
   }

   return rv;
 },


 setPref: function (aPrefKey, aPrefValue)
 {
   let prefName = PREFNAME_PREFIX + aPrefKey;
   let prefs = Services.prefs;
   let prefType = prefs.getPrefType(prefName);

   if (prefType == prefs.PREF_INT) {
     prefs.setIntPref(prefName, aPrefValue);
   }
   else if (prefType == prefs.PREF_BOOL) {
     prefs.setBoolPref(prefName, aPrefValue);
   }
   else if (prefType == prefs.PREF_STRING) {
     prefs.setCharPref(prefName, aPrefValue);
   }
 },


 hasPref: function (aPrefKey)
 {
   let prefName = PREFNAME_PREFIX + aPrefKey;
   let prefs = Services.prefs;

   return (prefs.getPrefType(prefName) != prefs.PREF_INVALID);
 },


 getRecentHostAppWindow: function ()
 {
   var rv;
   var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

   rv = wm.getMostRecentWindow(WNDTYPE_FX_BROWSER);

   return rv;
 },


 logToClipboard: function (aString)
 {
   if (DEBUG && LOG_TO_CLIPBOARD) {
     var cb = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);
     cb.copyString(aString);
     this.beep();
   }
 },


 beep: function () 
 {
   var sound = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
   sound.beep();
 },


 log: function (aMessage)
 {
   if (DEBUG) {
     Services.console.logStringMessage(aMessage);
   }
 },

 
 getStringBundle: function (aStringBundleURL)
 {
   let rv = new aeStringBundle(aStringBundleURL);
   return rv;
 }
};


//
// String bundle wrapper object
//

function aeStringBundle(aStrBundleURL)
{
  this._strBundle = Services.strings.createBundle(aStrBundleURL);
}

aeStringBundle.prototype.getString = function (aKey)
{
  return this._strBundle.GetStringFromName(aKey);
};



