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
 * Portions created by the Initial Developer are Copyright (C) 2014
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

const EXPORTED_SYMBOLS = ["aeKeyConflictDetector"];

const Cc = Components.classes;
const Ci = Components.interfaces;


var aeKeyConflictDetector = {

  // Hash table with its keys being a string constructed by concatenating the
  // key modifier(s) and the key.
  // E.g., CTRL+SHIFT+F8 would be "accel+shift+VK_F8"
  // The value of each key is the command ID that the shortcut key is bound to.
 _keyBindings: {},


 init: function (aHostAppWnd)
 {
   let keysets = aHostAppWnd.document.getElementsByTagName("keyset");
   
   for (let i = 0; i < keysets.length; i++) {
     let keys = keysets[i].childNodes;

     for (let j = 0; j < keys.length; j++) {
       let keyModifiers = keys[j].getAttribute("modifiers") || "";
       let key = "";

       if (keys[j].hasAttribute("key")) {
	 key = keys[j].getAttribute("key");
       }
       else if (keys[j].hasAttribute("keycode")) {
	 key = keys[j].getAttribute("keycode");
       }
       else {
	 // Not a valid <key> element
	 continue;
       }

       let commandID = "";
       if (keys[j].hasAttribute("command")) {
	 commandID = keys[j].getAttribute("command");
       }
       else {
	 commandID = "???";
       }

       let idx = this._getKeyString(key, keyModifiers);
       this._keyBindings[idx] = commandID;
     }
   }
 },


 dump: function ()
 {
   let rv = "---\naeKeyConflictDetector.js: All keys in hash table:\n\n";

   for (let key in this._keyBindings) {
     rv += key + " => " + this._keyBindings[key] + "\n";
   }
   rv += "---";

   return rv;
 },


 lookupShortcutKey: function (aKey, aModifiers)
 {
   let rv = null;

   let keyStr = this._getKeyString(aKey, aModifiers);
   let cmd = this._keyBindings[keyStr];

   if (cmd) {
     rv = cmd;
   }

   return rv;
 },


 _getKeyString: function (aKey, aModifiers)
 {
   let rv = "";

   // Normalize the key modifiers string.
   let modifiers = aModifiers;
   modifiers = modifiers.replace(/,( )+/g, ",");
   modifiers = modifiers.replace(/ /g, ",");

   let modifiersArray = modifiers.split(",");
   modifiersArray.sort();
   modifiers = modifiersArray.join(",");

   modifiers = modifiers.replace(/,/g, "+");

   rv = (modifiers ? (modifiers + "+") : "") + aKey;
   
   return rv;
 }
};

