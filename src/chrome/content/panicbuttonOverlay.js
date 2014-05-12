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


if (! ('aecreations' in window)) {
  window.aecreations = {};
}

if (! ('panicbutton' in window.aecreations)) {
  window.aecreations.panicbutton = {};
}
else {
  throw new Error("panicbutton object already defined");
}


window.aecreations.panicbutton = {
  _strBundle:       null,
  _toolbarIconCls:  [],
  _osEnv:           null,

  _mutationObserver: null,

  _cssClass: {
    // The code for the _cssClass object is adapted from "JavaScript: The
    // Definitive Guide" 5/e by David Flanagan (O'Reilly, 2006, pp. 381-382)
    is: function (aElt, aCls) {
      if (typeof aElt == "string") aElt = document.getElementById(aElt);

      var classes = aElt.className;
      if (! classes) return false;
      if (classes == aCls) return true;

      return aElt.className.search("\\b" + aCls + "\\b") != -1;
    },

    add: function (aElt, aCls) {
      if (typeof aElt == "string") aElt = document.getElementById(aElt);
      if (this.is(aElt, aCls)) return;
      if (aElt.className) aCls = " " + aCls;
      aElt.className += aCls;
    },

    remove: function (aElt, aCls) {
      if (typeof aElt == "string") aElt = document.getElementById(aElt);
      aElt.className = aElt.className.replace(new RegExp("\\b" + aCls + "\\b\\s*", "g"), "");
      aElt.className = aElt.className.trim();
    }
  },


  handleEvent: function (aEvent)
  {
    let that = window.aecreations.panicbutton;

    if (aEvent.type == "load") {
      that.init();
    }
    else if (aEvent.type == "unload") {
      if (that.isAustralisUI()) {
        CustomizableUI.destroyWidget("ae-panicbutton-toolbarbutton");
      }
      
      window.removeEventListener("load",   that, false);
      window.removeEventListener("unload", that, false);

      if (that._mutationObserver) {
        that._mutationObserver.disconnect();
      }
    }
  },


  isAustralisUI: function ()
  {
    return document.getElementById("PanelUI-menu-button") != null;
  },


  init: function ()
  {
    this._initToolbarIconClasses();
    this._strBundle = document.getElementById("ae-panicbutton-strings");
    this._osEnv = this.aeUtils.getOS();
    this.aeUtils.log(this.aeString.format("Panic Button OS environment: %s\nHost app: %s (version %s); Australis UI: %b", this._osEnv, Application.name, Application.version, this.isAustralisUI()));

    let that = this;

    if (! this.isAustralisUI()) {
      // Set up observer that will apply customizations to the Panic Button
      // toolbar button when it is added to the toolbar.
      this._mutationObserver = new MutationObserver(function (aMutationRecs, aMutationObs) {
          aMutationRecs.forEach(function (aMutation) {
            if (aMutation.type == "childList") {
              for (let i = 0; i < aMutation.addedNodes.length; i++) {
                let addedNode = aMutation.addedNodes[i];
                if (addedNode.nodeName == "toolbarbutton" 
                    && addedNode.id == "ae-panicbutton-toolbarbutton") {
                  that.setPanicButtonCustomizations();
                }
              }
            }
          });
      });
      let mutationObsConfig = { 
        childList: true, 
        subtree: true 
      };

      let mutnObsTarget = document.getElementById("browser-panel");
      this._mutationObserver.observe(mutnObsTarget, mutationObsConfig);
    }

    // Migrate prefs from root to the "extensions." branch
    let prefsMigrated = this.aeUtils.getPref("panicbutton.migrated_prefs", false);
    if (! prefsMigrated) {
      this.aePrefMigrator.migratePrefs();
      this.aeUtils.setPref("panicbutton.migrated_prefs", true);
    }

    let firstRun = this.aeUtils.getPref("panicbutton.first_run", true);
    if (firstRun) {
      this.aeUtils.log("It appears that this is the first time you are running Panic Button.  Welcome!");

      // Set the default label for the toolbar button.
      this.aeUtils.setPref("panicbutton.toolbarbutton.label", this._strBundle.getString("panicbutton.defaultLabel"));

      this._addPanicButton();
      this.aeUtils.setPref("panicbutton.first_run", false);
    }

    this.applyUserPrefs();
  },


  _addPanicButton: function ()
  {
    // Add the Panic Button toolbar button to the browser's navigation toolbar,
    // if it was not added already.
    if (this.isAustralisUI()) {
      this.aeUtils.log("Panic Button: First-time execution - creating Panic Button widget");

      CustomizableUI.createWidget({
        id: "ae-panicbutton-toolbarbutton",
        type: "custom",
        defaultArea: CustomizableUI.AREA_NAVBAR,
        onBuild: function (aDocument) {
          let that = aDocument.defaultView.aecreations.panicbutton;
          let toolbarBtn = aDocument.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "toolbarbutton");
          toolbarBtn.id = "ae-panicbutton-toolbarbutton";
          toolbarBtn.className = "toolbarbutton-1 ae-panicbutton-exclamation-in-ball";
          toolbarBtn.setAttribute("label", that.aeUtils.getPref("panicbutton.toolbarbutton.label", "Panic Button"));
          toolbarBtn.addEventListener("command", function (aEvent) {
            let wnd = aEvent.target.ownerDocument.defaultView;
            wnd.aecreations.panicbutton.doPanicAction();
          }, false);

          return toolbarBtn;
        }
      });

      return;
    }

    let toolbarBtnElt = document.getElementById("ae-panicbutton-toolbarbutton");
    let browserNavBarElt = document.getElementById("nav-bar");
    if (browserNavBarElt && !toolbarBtnElt) {
      browserNavBarElt.insertItem("ae-panicbutton-toolbarbutton");
      browserNavBarElt.setAttribute("currentset", browserNavBarElt.currentSet);
      document.persist("nav-bar", "currentset");
    }
  },


  _initToolbarIconClasses: function ()
  {
    this._toolbarIconCls[0]  = "ae-panicbutton-default";
    this._toolbarIconCls[1]  = "ae-panicbutton-exclamation-in-ball";
    this._toolbarIconCls[2]  = "ae-panicbutton-quit";
    this._toolbarIconCls[3]  = "ae-panicbutton-exit-door";
    this._toolbarIconCls[4]  = "ae-panicbutton-window-minimize";
    this._toolbarIconCls[5]  = "ae-panicbutton-window-with-exclamation";
    this._toolbarIconCls[6]  = "ae-panicbutton-window-with-exclamation-ball";
    this._toolbarIconCls[7]  = "ae-panicbutton-window-with-cross";
    this._toolbarIconCls[8]  = "ae-panicbutton-window-with-check";
    this._toolbarIconCls[9]  = "ae-panicbutton-plain-window";
    this._toolbarIconCls[10] = "ae-panicbutton-dotted-window";
    this._toolbarIconCls[11] = "ae-panicbutton-window-with-globe";
    this._toolbarIconCls[12] = "ae-panicbutton-web-page";
    this._toolbarIconCls[13] = "ae-panicbutton-web-page-with-globe";
    this._toolbarIconCls[14] = "ae-panicbutton-web-document";
    this._toolbarIconCls[15] = "ae-panicbutton-smiley";
    this._toolbarIconCls[16] = "ae-panicbutton-picture";
    this._toolbarIconCls[17] = "ae-panicbutton-desktop";
    this._toolbarIconCls[18] = "ae-panicbutton-computer";
    this._toolbarIconCls[19] = "ae-panicbutton-letter-a";
  },


  applyUserPrefs: function (aFromPrefWnd)
  {
    var isKeyboardShortcutEnabled = this.aeUtils.getPref("panicbutton.key.enabled", true);
    if (isKeyboardShortcutEnabled) {
      this.setKeyboardShortcut();
    }
    else {
      let panicButtonKeyElt = document.getElementById("key_ae_panicbutton");
      if (panicButtonKeyElt) {
        panicButtonKeyElt.parentNode.removeChild(panicButtonKeyElt);
      }
    }

    this.setPanicButtonCustomizations(aFromPrefWnd);
  },


  setKeyboardShortcut: function ()
  {
    var keysetElt = document.getElementById("mainKeyset");
    var keycode = this.aeUtils.getPref("panicbutton.key", "");
    var keyModifiers = this.aeUtils.getPref("panicbutton.key.modifiers", "");
    var panicButtonKeyElt;

    for (let i = 0; i < keysetElt.childNodes.length; i++) {
      var child = keysetElt.childNodes[i];
      if (child.id == "key_ae_panicbutton") {
	panicButtonKeyElt = child;
      }
    }

    if (keycode) {
      this.aeUtils.log(this.aeString.format("Panic Button: Setting keyboard shortcut: keycode=%S; modifiers=%S", keycode, keyModifiers));
      if (! panicButtonKeyElt) {
        panicButtonKeyElt = document.createElement("key");
        panicButtonKeyElt.id = "key_ae_panicbutton";
        panicButtonKeyElt.setAttribute("command", "cmd_ae_panicbutton");
        panicButtonKeyElt.setAttribute("keycode", keycode);

        if (keyModifiers) {
          panicButtonKeyElt.setAttribute("modifiers", keyModifiers);
        }

        keysetElt.appendChild(panicButtonKeyElt);
      }
      else {
        panicButtonKeyElt.setAttribute("keycode", keycode);

        if (keyModifiers) {
          panicButtonKeyElt.setAttribute("modifiers", keyModifiers);
        }
        else {
          panicButtonKeyElt.removeAttribute("modifiers");
        }
      }
    }
    else {
      if (panicButtonKeyElt) {
	keysetElt.removeChild(panicButtonKeyElt);
      }
    }
  },


  setPanicButtonCustomizations: function (aFromPrefWnd)
  {
    if (this.isAustralisUI()) {
      if (aFromPrefWnd) {
        this.aeUtils.log("Panic Button: Destroying and recreating widget");
        // To update the Panic Button widget (button icon or label),
        // destroy the widget, then recreate it with the updated properties.
        CustomizableUI.destroyWidget("ae-panicbutton-toolbarbutton");
      }

      this.aeUtils.log("Panic Button: Adding Panic Button widget");

      let iconIdx = this.aeUtils.getPref("panicbutton.toolbarbutton.icon", 0);
      let tbClsName = this._toolbarIconCls[iconIdx];

      // Initialize custom toolbar button icon.
      let customImgURL = this.aeUtils.getPref("panicbutton.toolbarbutton.custom_icon_url", "");
      if (customImgURL) {
        if (! this._isValidCustomToolbarIconURL(customImgURL)) {
	  this.aeUtils.setPref("panicbutton.toolbarbutton.custom_icon_url", "");
	  customImgURL = "";
	}
        else {
          tbClsName = "ae-panicbutton-custom-icon";
        }
      }

      CustomizableUI.createWidget({
        id: "ae-panicbutton-toolbarbutton",
        type: "custom",
        defaultArea: CustomizableUI.AREA_NAVBAR,
        onBuild: function (aDocument) {
          let that = aDocument.defaultView.aecreations.panicbutton;
          let toolbarBtn = aDocument.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "toolbarbutton");
          toolbarBtn.id = "ae-panicbutton-toolbarbutton";
          toolbarBtn.className = "toolbarbutton-1 " + tbClsName;
          toolbarBtn.setAttribute("label", that.aeUtils.getPref("panicbutton.toolbarbutton.label", "Panic Button"));

          if (customImgURL) {
            toolbarBtn.setAttribute("image", customImgURL);
          }

          toolbarBtn.addEventListener("command", function (aEvent) {
            let wnd = aEvent.target.ownerDocument.defaultView;
            wnd.aecreations.panicbutton.doPanicAction();
          }, false);

          return toolbarBtn;
        }
      });

      return;
    }

    var toolbarBtnElt = document.getElementById("ae-panicbutton-toolbarbutton");
    if (toolbarBtnElt) {
      // Set Panic Button toolbar button label
      var toolbarBtnLabel = this.aeUtils.getPref("panicbutton.toolbarbutton.label", "");
      if (toolbarBtnLabel) {
	toolbarBtnElt.label = toolbarBtnLabel;
      }
      else {
	toolbarBtnElt.label = this._strBundle.getString("panicbutton.defaultLabel");
      }

      // Set Panic Button toolbar button image
      var oldCls = this._getOldToolbarButtonClass(toolbarBtnElt);
      this.aeUtils.log(this.aeString.format("setPanicButtonCustomizations(): old toolbar button classname: %S", oldCls));
      var customImgURL = this.aeUtils.getPref("panicbutton.toolbarbutton.custom_icon_url", "");

      if (customImgURL) {
        if (! this._isValidCustomToolbarIconURL(customImgURL)) {
	  this.aeUtils.setPref("panicbutton.toolbarbutton.custom_icon_url", "");
	  customImgURL = "";
        }
        else {
          this._cssClass.remove(toolbarBtnElt, oldCls);
          this._cssClass.add(toolbarBtnElt, "ae-panicbutton-custom-icon");
          toolbarBtnElt.setAttribute("image", customImgURL);
        }
      }
      else {
	toolbarBtnElt.removeAttribute("image");
      }

      if (! customImgURL) {
	var iconIdx = this.aeUtils.getPref("panicbutton.toolbarbutton.icon", 0);
	this._cssClass.remove(toolbarBtnElt, oldCls);
	this.aeUtils.log(this.aeString.format("setPanicButtonCustomizations(): after removing old classname, toolbar button classname is now: %S", toolbarBtnElt.className));
	this.aeUtils.log(this.aeString.format("setPanicButtonCustomizations(): adding toolbar button class: %S", this._toolbarIconCls[iconIdx]));

	this._cssClass.add(toolbarBtnElt, this._toolbarIconCls[iconIdx]);
	this.aeUtils.log(this.aeString.format("setPanicButtonCustomizations(): toolbar button classname is changed to: %S", toolbarBtnElt.className));
      }
    }
  },


  _isValidCustomToolbarIconURL: function (aCustomImgURL)
  {
    // URLs other than file:// are not acceptable.
    return (aCustomImgURL.search(/^file:\/\//) != -1);
  },


  _getOldToolbarButtonClass: function (aToolbarButtonElt)
  {
    var allClassNames = aToolbarButtonElt.className;
    var rv = allClassNames.replace(/toolbarbutton\-1 /, "");
    if (rv && typeof(rv) == "string") rv = this.aeString.trim(rv);
    return rv;
  },


  doPanicAction: function ()
  {
    var action = this.aeUtils.getPref("panicbutton.action", 0);

    if (this.aeBrowserSession.replaceSession) {
      this._restoreSession();
      return;
    }

    if (action == this.aeConstants.PANICBUTTON_ACTION_HIDE) {
      this._closeAll(true);
    }
    else if (action == this.aeConstants.PANICBUTTON_ACTION_MINIMIZE) {
      this._minimizeAll();
    }
    else if (action == this.aeConstants.PANICBUTTON_ACTION_QUIT) {
      this._closeAll(false);
    }
    else if (action == this.aeConstants.PANICBUTTON_ACTION_REPLACE) {
      let replacementURL = this.aeUtils.getPref("panicbutton.action.replace.web_pg_url", this.aeConstants.REPLACE_WEB_PAGE_DEFAULT_URL);
      this._closeAll(true, replacementURL);
    }
  },


  _closeAll: function (aSaveSession, aReplacementURL)
  {
    if (aSaveSession) {
      var ss = Components.classes["@mozilla.org/browser/sessionstore;1"]
                         .getService(Components.interfaces.nsISessionStore);
      var state = ss.getBrowserState();
      
      this.aeUtils.logToClipboard(state);
      this.aeBrowserSession.data = state;

      if (aReplacementURL) {
	this.aeBrowserSession.replaceSession = true;
      }
    }

    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
    // Close any open dialog boxes
    // **NOTE: The enumerator returned by nsIWindowMediator.getEnumerator()
    // will exclude system native file-picker dialogs.
    var dlgEnum = wm.getEnumerator("");

    while (dlgEnum.hasMoreElements()) {
      var dlg = dlgEnum.getNext();
      var docElt = dlg.document.documentElement;
      if (docElt.tagName == "dialog" || docElt.tagName == "prefwindow"
	  || docElt.tagName == "wizard") {
	docElt.cancelDialog();
      }
    }

    let wndEnum = wm.getEnumerator("");
    let that = this;
    window.setTimeout(function () { 
      that._closeAllWindows.apply(that,
	                          [aSaveSession, wndEnum, aReplacementURL]);
    }, 1);
  },


  _closeAllWindows: function (aSaveSession, aBrowserWndEnum, aReplacementURL)
  {
    // If ALL browser windows are in Private Browsing mode, then the
    // replacement window also needs to be private (issue #1).
    var isAllPrivate = true;

    // Close browser and ancillary app windows
    while (aBrowserWndEnum.hasMoreElements()) {
      let wnd = aBrowserWndEnum.getNext();

      if (isAllPrivate && !this.PrivateBrowsingUtils.isWindowPrivate(wnd)) {
        isAllPrivate = false;
      }

      wnd.close();
    }

    if (aSaveSession && aReplacementURL) {
      let wndFeatures = "titlebar,menubar,toolbar,location,personalbar,scrollbars,resizable";
      if (isAllPrivate) {
        wndFeatures += ",private";
      }

      window.open(aReplacementURL, "_blank", wndFeatures);
    }
    else if (aSaveSession && !aReplacementURL) {
      let wndURL = "chrome://panicbutton/content/panicbuttonToolbar.xul";
      let wndFeatures = "chrome,dialog=0,popup";

      if (this._osEnv == "Darwin") {
	// On Mac OS X, OS_TARGET is "Darwin"
	// Workaround strange behaviour with popups on Mac OS X; see bug 19026
	wndURL += "?tbchrome=none";
	wndFeatures = "chrome,dialog=0,resizable=0";
      }
      else if (this._osEnv == "Linux") {
	// Neither the titlebar nor windoid border colours show up properly on
	// Gnome or KDE; see bug 19051
	// Also use JS persistence of windoid position since XUL persistence
	// doesn't work on Linux
	wndURL += "?tbchrome=override&jspos=1";
      }

      window.open(wndURL, "ae_pbtb", wndFeatures);
    }
    else {
      var appStartup = Components.classes["@mozilla.org/toolkit/app-startup;1"]
                                 .getService(Components.interfaces.nsIAppStartup);
      appStartup.quit(appStartup.eForceQuit);
    }
  },

  
  _minimizeAll: function () 
  {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
    var wndEnum = wm.getEnumerator("");  // Get all host app windows

    while (wndEnum.hasMoreElements()) {
      var wnd = wndEnum.getNext();
      wnd = wnd.QueryInterface(Components.interfaces.nsIDOMChromeWindow);
      wnd.minimize();
    }
  },


  _restoreSession : function ()
  {
    var ss = Components.classes["@mozilla.org/browser/sessionstore;1"]
                       .getService(Components.interfaces.nsISessionStore);

    ss.setBrowserState(this.aeBrowserSession.data);
    this.aeBrowserSession.replaceSession = false;
    this.aeBrowserSession.data = "";
  }
};


//
// JavaScript modules
//

Components.utils.import("resource://panicbutton/modules/aeUtils.js",
			window.aecreations.panicbutton);
Components.utils.import("resource://panicbutton/modules/aeString.js",
			window.aecreations.panicbutton);
Components.utils.import("resource://panicbutton/modules/aeConstants.js",
			window.aecreations.panicbutton);
Components.utils.import("resource://panicbutton/modules/aeBrowserSession.js",
			window.aecreations.panicbutton);
Components.utils.import("resource://panicbutton/modules/aePrefMigrator.js",
			window.aecreations.panicbutton);
Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm",
                        window.aecreations.panicbutton);


//
// Event handler initialization
//

window.addEventListener("load", window.aecreations.panicbutton, false);
window.addEventListener("unload", window.aecreations.panicbutton, false);

