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
 * Portions created by the Initial Developer are Copyright (C) 2008-2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

// Supported in Firefox 2 and greater
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm"); 


function nsBrowserSession() {}

nsBrowserSession.prototype = {
  _data:         "",
  _replaceSess:  false,

  get data()      { return this._data;  },
  set data(aData) { return this._data = aData; },

  get replaceSession()      { return this._replaceSess; },
  set replaceSession(aFlag) { return this._replaceSess = aFlag; },

  // Component registration
  classDescription: "Browser Session Save API",
  classID:          Components.ID("{ecb163c0-d7f5-11dc-95ff-0800200c9a66}"),
  contractID:       "aecreations@mozdev.org/panicbutton/browser-session;1",
  QueryInterface:    XPCOMUtils.generateQI([Components.interfaces.nsIBrowserSession])
};



//
// Component registration
//

/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
 * XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
 */
if (XPCOMUtils.generateNSGetFactory) {
  const NSGetFactory = XPCOMUtils.generateNSGetFactory([nsBrowserSession]);
}
else {
  const NSGetModule = XPCOMUtils.generateNSGetModule([nsBrowserSession]);
}
