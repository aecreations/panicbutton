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
 * Portions created by the Initial Developer are Copyright (C) 2008-2014
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

Components.utils.import("resource://panicbutton/modules/aeMozApplication.js");


const EXPORTED_SYMBOLS = ["aeUtils"];

const DEBUG = true;
const EXTENSION_ID = "{24cea704-946d-11da-a72b-0800200c9a66}";
const PREFNAME_PREFIX = "extensions.aecreations.";


const Cc = Components.classes;
const Ci = Components.interfaces;

var Application = aeGetMozApplicationObj();


var aeUtils = {

 alertEx : function (aTitle, aMessage)
 {
   var prmpt = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
   prmpt.alert(null, aTitle, aMessage);
 },


 confirmEx: function (aTitle, aMessage)
 {
   var rv;
   var prmpt = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
   rv = prmpt.confirm(null, aTitle, aMessage);
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


 getOS: function ()
 {
   var rv;
   var xulRuntime = Cc["@mozilla.org/xre/app-info;1"].createInstance(Ci.nsIXULRuntime);
   rv = xulRuntime.OS;

   return rv;
 },


 getPref: function (aPrefKey, aDefaultValue)
 {
   // aPrefKey is the pref name, but without the "extensions.aecreations."
   // prefix.
   return Application.prefs.getValue(PREFNAME_PREFIX + aPrefKey, aDefaultValue);
 },


 setPref: function (aPrefKey, aPrefValue)
 {
   Application.prefs.setValue(PREFNAME_PREFIX + aPrefKey, aPrefValue);
 },


 debugLogToClipboard: function (aString)
 {
   if (DEBUG) {
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


 log: function (aMessage) {
    if (DEBUG) {
      var consoleSvc = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
      consoleSvc.logStringMessage(aMessage);
    }
  }
};




