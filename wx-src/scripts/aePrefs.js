/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


let aePrefs = {
  _defaultPrefs: {
    // Background script state persistence
    _minzWndID: null,
    _camoWndID: null,
    _minzWndStates: [],
    _replaceSession: false,
    _replacemtWndID: null,
    _savedWnds: [],
    _readerModeTabIDs: [],
    _changeIconWndID: null,

    // User preferences and customizations
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
    defDlgBtnFollowsFocus: false,
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

  hasUserPrefs(aPrefs)
  {
    return ("action" in aPrefs);
  },

  async setUserPrefs(aPrefs) {
    let prefs = {
      action: aeConst.PANICBUTTON_ACTION_REPLACE,
      toolbarBtnIcon: 0,
      toolbarBtnLabel: browser.i18n.getMessage("defaultBtnLabel"),
      toolbarBtnRevContrastIco: false,
      toolbarBtnData: "",
      shortcutKey: true,
      replacementWebPgURL: aeConst.REPLACE_WEB_PAGE_DEFAULT_URL,
    };
    
    await this._addPrefs(aPrefs, prefs);
  },

  hasSantaCruzPrefs(aPrefs)
  {
    // Version 4.1
    return ("restoreSessPswdEnabled" in aPrefs);
  },

  async setSantaCruzPrefs(aPrefs)
  {
    let newPrefs = {
      restoreSessPswdEnabled: false,
      restoreSessPswd: null,
    };

    await this._addPrefs(aPrefs, newPrefs);
  },

  hasSantaRosaPrefs(aPrefs)
  {
    // Version 4.2
    return ("showCamouflageWebPg" in aPrefs);
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
    return ("minimizeCurrOpt" in aPrefs);
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
    return ("restoreSessInactvTabsZzz" in aPrefs);
  },

  async setSanNicolasPrefs(aPrefs)
  {
    let newPrefs = {
      restoreSessInactvTabsZzz: true,
      autoAdjustWndPos: null,
    };

    await this._addPrefs(aPrefs, newPrefs);
  },

  hasFarallonPrefs(aPrefs)
  {
    // Version 5.0
    return ("_replaceSession" in aPrefs);
  },

  async setFarallonPrefs(aPrefs)
  {
    let newPrefs = {
      _minzWndID: null,
      _camoWndID: null,
      _minzWndStates: [],
      _replaceSession: false,
      _replacemtWndID: null,
      _savedWnds: [],
      _readerModeTabIDs: [],
      _changeIconWndID: null,
    };

    await this._addPrefs(aPrefs, newPrefs);
  },

  hasMaintopPrefs(aPrefs)
  {
    // Version 5.0.1
    return ("defDlgBtnFollowsFocus" in aPrefs);
  },

  async setMaintopPrefs(aPrefs)
  {
    let newPrefs = {
      defDlgBtnFollowsFocus: false,
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
  },
};
