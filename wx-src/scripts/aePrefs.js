/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


let aePrefs = {
  _defaultPrefs: {
    action: aeConst.PANICBUTTON_ACTION_REPLACE,
    toolbarBtnIcon: 0,
    toolbarBtnLabel: browser.i18n.getMessage("defaultBtnLabel"),
    toolbarBtnRevContrastIco: false,
    toolbarBtnData: "",
    shortcutKey: true,
    replacementWebPgURL: aeConst.REPLACE_WEB_PAGE_DEFAULT_URL,
    restoreSessPswdEnabled: false,
    restoreSessPswd: null,
    showCamouflageWebPg: false,
    camouflageWebPgURL: aeConst.REPLACE_WEB_PAGE_DEFAULT_URL,
    minimizeCurrOpt: aeConst.MINIMIZE_CURR_OPT_RESTORE_MINZED_WND,
    restoreSessInactvTabsZzz: true,
    autoAdjustWndPos: null,

    // DEPRECATED - Default keyboard shortcuts are now set in the
    // extension manifest.
    panicButtonKey: "F9",
    panicButtonKeyMod: "",
  },
  
  getDefaultPrefs()
  {
    return this._defaultPrefs;
  },
  
  getPrefKeys()
  {
    return Object.keys(this._defaultPrefs);
  },

  async getPref(aPrefName)
  {
    let pref = await browser.storage.local.get(aPrefName);
    let rv = pref[aPrefName];
    
    return rv;
  },

  async getAllPrefs()
  {
    let rv = await browser.storage.local.get(this.getPrefKeys());
    return rv;
  },

  async setPrefs(aPrefMap)
  {
    await browser.storage.local.set(aPrefMap);
  },


  //
  // Version upgrade handling
  //

  hasSantaCruzPrefs(aPrefs)
  {
    // Version 4.1
    return aPrefs.hasOwnProperty("restoreSessPswdEnabled");
  },

  async setSantaCruzPrefs(aPrefs)
  {
    let newPrefs = {
      panicButtonKey: "F9",  // Old default keyboard shortcut until version 4.3
      panicButtonKeyMod: "",
      restoreSessPswdEnabled: false,
      restoreSessPswd: null,
    };

    await this._addPrefs(aPrefs, newPrefs);
  },

  hasSantaRosaPrefs(aPrefs)
  {
    // Version 4.2
    return aPrefs.hasOwnProperty("showCamouflageWebPg");
  },

  async setSantaRosaPrefs(aPrefs)
  {
    let newPrefs = {
      showCamouflageWebPg: false,
      camouflageWebPgURL: aeConst.REPLACE_WEB_PAGE_DEFAULT_URL,
    };

    await this._addPrefs(aPrefs, newPrefs);
  },

  hasSantaCatalinaPrefs(aPrefs)
  {
    // Version 4.3
    return aPrefs.hasOwnProperty("minimizeCurrOpt");
  },

  async setSantaCatalinaPrefs(aPrefs)
  {
    let newPrefs = {
      minimizeCurrOpt: aeConst.MINIMIZE_CURR_OPT_RESTORE_MINZED_WND,
    };

    await this._addPrefs(aPrefs, newPrefs);
  },

  hasSanNicolasPrefs(aPrefs)
  {
    // Version 4.4
    return aPrefs.hasOwnProperty("restoreSessInactvTabsZzz");
  },

  async setSanNicolasPrefs(aPrefs)
  {
    let newPrefs = {
      restoreSessInactvTabsZzz: true,
      autoAdjustWndPos: null,
    };

    await this._addPrefs(aPrefs, newPrefs);
  },

  
  //
  // Helper methods
  //

  async _addPrefs(aCurrPrefs, aNewPrefs)
  {
    for (let pref in aNewPrefs) {
      aCurrPrefs[pref] = aNewPrefs[pref];
    }

    await this.setPrefs(aNewPrefs);
  }
};
