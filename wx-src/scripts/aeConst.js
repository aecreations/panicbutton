/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const aeConst = Object.freeze({
  DEBUG: false,
  DEV_BUILD: false,
  CURR_MAJOR_VER: "5.1",
  
  PANICBUTTON_ACTION_REPLACE: 0,
  PANICBUTTON_ACTION_MINIMIZE: 1,
  PANICBUTTON_ACTION_QUIT: 2,
  PANICBUTTON_ACTION_MINIMIZE_CURR: 3,

  MINIMIZE_CURR_OPT_MINZ_CURR_WND: 0,
  MINIMIZE_CURR_OPT_RESTORE_MINZED_WND: 1,

  CMD_PANIC_BUTTON_ACTION: "ae-panicbutton",

  DEFAULT_TOOLBAR_BTN_LABEL: "Panic Button",
  REPLACE_WEB_PAGE_DEFAULT_URL: "https://www.mozilla.org/firefox/",

  CUSTOM_ICON_IDX: 20,

  DEFAULT_KEYB_SHCT: "F8",

  URL_AMO: "https://addons.mozilla.org/firefox/addon/panic-button/",
  URL_BLOG: "https://aecreations.blogspot.com/",
  URL_FORUM: "https://aecreations.io/forums",
  URL_DONATE: "https://www.paypal.me/aecreations88/7.99cad",
  URL_L10N: "https://crowdin.com/project/aecreations-panic-button",
});
