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
 * Portions created by the Initial Developer are Copyright (C) 2013-2015
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

//
// Extension Preferences Migrator Module
//  - Migrates existing, user-set extension prefs from the root branch to the
//    "extensions.aecreations" branch.
//

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://panicbutton/modules/aeUtils.js");


const EXPORTED_SYMBOLS = ["aePrefMigrator"];

const PREFNAME_PREFIX = "extensions.aecreations.";


var aePrefMigrator = {

  migratePrefs: function () 
  {
    this._migratePref("panicbutton.action", 0);
    this._migratePref("panicbutton.action.replace.web_pg_url", "http://www.mozilla.com/firefox/central/");
    this._migratePref("panicbutton.toolbarbutton.label", "");
    this._migratePref("panicbutton.toolbarbutton.icon", 0);
    this._migratePref("panicbutton.toolbarbutton.custom_icon_url", "");
    this._migratePref("panicbutton.restorebar.layout", 0);
    this._migratePref("panicbutton.restorebar.show_tooltips", true);
    this._migratePref("panicbutton.restorebar.position", "64,256");
    this._migratePref("panicbutton.enable_function_key", true);
    this._migratePref("panicbutton.first_run", true);
  },


  _migratePref: function (aPrefName, aDefaultValue)
  {
    let prefs = Services.prefs;

    if (! prefs.prefHasUserValue(aPrefName)) {
      return;
    }

    // Migrate pref over to "extensions." branch
    let prefValue = this._getPref(aPrefName, aDefaultValue);
    let newPrefName = PREFNAME_PREFIX + aPrefName;
    this._setPref(newPrefName, prefValue, prefs.getPrefType(aPrefName));

    aeUtils.log('aePrefMigrator: Migrated pref: "' + aPrefName + '"');

    try {
      prefs.clearUserPref(aPrefName);
    }
    catch (e) {
      aeUtils.log("aePrefMigrator: " + e);
    }
  },


  _getPref: function (aPrefName, aDefaultValue)
  {
    let prefs = Services.prefs;
    let prefType = prefs.getPrefType(aPrefName);
    let rv = undefined;

    if (prefType == prefs.PREF_STRING) {
      rv = prefs.getCharPref(aPrefName);
    }
    else if (prefType == prefs.PREF_INT) {
      rv = prefs.getIntPref(aPrefName);
    }
    else if (prefType == prefs.PREF_BOOL) {
      rv = prefs.getBoolPref(aPrefName);
    }
    else {
      // Pref doesn't exist if prefType == prefs.PREF_INVALID.
      rv = aDefaultValue;
    }

    return rv;
  },


  _setPref: function (aPrefName, aPrefValue, aPrefType)
  {
    let prefs = Services.prefs;

    if (aPrefType == prefs.PREF_INT) {
      prefs.setIntPref(aPrefName, aPrefValue);
    }
    else if (aPrefType == prefs.PREF_BOOL) {
      prefs.setBoolPref(aPrefName, aPrefValue);
    }
    else if (aPrefType == prefs.PREF_STRING) {
      prefs.setCharPref(aPrefName, aPrefValue);
    }
  }
};
