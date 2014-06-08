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

Components.utils.import("resource://panicbutton/modules/aeUtils.js");
Components.utils.import("resource://panicbutton/modules/aeConstants.js");
Components.utils.import("resource://panicbutton/modules/aeBrowserSession.js");


var gStrBundle;



//
// Floating toolbar window management
//

var gWindoid = {
  titlebarElt: null,

  focus: function (aEvent)
  {
    this.titlebarElt.style.backgroundColor = "activecaption";
  },

  blur:  function (aEvent)
  {
    this.titlebarElt.style.backgroundColor = "inactivecaption";
  }
};


var gWindoidCloseBtn = {
  mouseDown: function (aEvent) 
  {
    if (aEvent.which != 1) {
      return;
    }
  },

  mouseUp: function (aEvent) 
  {
    if (aEvent.which == 1) {
      setTimeout(function () { window.close() }, 80);
    }
  }
};


//
// DOM convenience function
//

function $(aID)
{
  return document.getElementById(aID);
}


//
// Toolbar functions
//

function load()
{
  gStrBundle = $('ae-panicbutton-strings');

  aeUtils.log("URL of Restore Session windoid: " + window.location + "\nParameter(s): " + window.location.search);

  var params = getParamsMap(window.location.search);

  gWindoid.titlebarElt = $("windoid-title-bar");
  window.addEventListener("focus", function (e) { gWindoid.focus(e) }, false);
  window.addEventListener("blur", function (e) { gWindoid.blur(e) }, false);

  var tbLayoutPref = aeUtils.getPref("panicbutton.restorebar.layout", 0);
  setToolbarLayout(tbLayoutPref, true);

  var tbChromeOverride = (params["tbchrome"] && params["tbchrome"] == "override");

  if (tbChromeOverride) {
    $("windoid-title-bar").style.backgroundImage = "url('chrome://panicbutton/skin/images/windoidTitleBar.png')";
    $("windoid-border").style.border = "2px solid #808080";
  }

  window.sizeToContent();

  if (isJSWindoidPositionPersistenceEnabled(params)) {
    window.setTimeout(function () { setToolbarPosition() }, 1);
  }
}


function getParamsMap(aQueryStr)
{
  var rv = {};

  // aQueryStr is the value returned by window.location.search
  // It would be typically formatted such as "?foo=1&bar=baz"
  if (aQueryStr) {
    var search = aQueryStr.substring(1);

    var paramsArray = search.split("&");

    for (let i = 0; i < paramsArray.length; i++) {
      var param = paramsArray[i].split("=");
      rv[param[0]] = param[1];
    }
  }

  return rv;
}


function setToolbarPosition()
{
  // Workaround to known problem on Linux where XUL attribute persistence of
  // window coordinates doesn't work.
  aeUtils.log("Reading extension preferences to retrieve Restore Bar position");

  var coords = aeUtils.getPref("panicbutton.restorebar.position", "64,256").split(",");
  window.moveTo(coords[0], coords[1]);
}


function setToolbarLayout(aLayoutPref, aOnLoad)
{
  if (! aOnLoad) {
    var currPref = aeUtils.getPref("panicbutton.restorebar.layout", 0);
    if (currPref == aLayoutPref) {
      return;
    }
  }

  var buttons = $("windoid-content");
  var restoreBtn = buttons.childNodes[0];
  var exitBtn = buttons.childNodes[1];

  if (aLayoutPref == aeConstants.RESTOREBAR_LAYOUT_ICONSONLY) {
    for (let i = 0; i < buttons.childNodes.length; i++) {
      let childNode = buttons.childNodes[i];
      let label = childNode.getAttribute("label");
      childNode.removeAttribute("label");
      if (aeUtils.getPref("panicbutton.restorebar.show_tooltips", true)) {
	childNode.setAttribute("tooltiptext", label);
      }
    }

    if (aeUtils.getOS() == "Darwin") {
      $("ae-panicbutton-restoresession-toolbar").style.width = "5.5em";
    }
  }
  else {
    // aLayoutPref == aeConstants.RESTOREBAR_LAYOUT_ICONSANDTEXT
    restoreBtn.setAttribute("label", gStrBundle.getString("restoreSession"));
    exitBtn.setAttribute("label", gStrBundle.getString("exit"));

    for (let i = 0; i < buttons.childNodes.length; i++) {
      buttons.childNodes[i].removeAttribute("tooltiptext");
    }

    if (aeUtils.getOS() == "Darwin") {
      $("ae-panicbutton-restoresession-toolbar").style.width = "16em";
    }
  }

  window.sizeToContent();
  aeUtils.setPref("panicbutton.restorebar.layout", aLayoutPref);

  var autoReposition = aeUtils.getPref("panicbutton.restorebar.auto_reposition", false);

  if (aLayoutPref == aeConstants.RESTOREBAR_LAYOUT_ICONSANDTEXT && autoReposition) {
    // Adjust positioning of windoid if it will disappear into the right edge
    // of the screen - needs to work with dual-monitor setups
    var rightEdgeXPos = window.screenX + window.outerWidth;
    var delta = rightEdgeXPos - window.screen.availWidth;
    if (rightEdgeXPos > window.screen.availWidth) {
      var newXPos = window.screenX - delta;
      window.moveTo(newXPos, window.screenY);
    }
  }
}


function restoreSession()
{
  var ss = Components.classes["@mozilla.org/browser/sessionstore;1"]
                     .getService(Components.interfaces.nsISessionStore);

  ss.setBrowserState(aeBrowserSession.data);
  aeBrowserSession.data = "";

  var params = getParamsMap(window.location.search);

  if (isJSWindoidPositionPersistenceEnabled(params)) {
    aeUtils.log("Saving Restore Bar position into extension preferences");
    aeUtils.setPref("panicbutton.restorebar.position",
		    window.screenX + "," +  window.screenY);
  }
  window.close();
}


function quitBrowser()
{
  var appStartup = Components.classes["@mozilla.org/toolkit/app-startup;1"]
                             .getService(Components.interfaces.nsIAppStartup);
  appStartup.quit(appStartup.eForceQuit);
}


function isJSWindoidPositionPersistenceEnabled(aParamsMap)
{
  var noPrefOverride = !(aeUtils.getPref("panicbutton.restorebar.disable_js_position_persistence", false));

  return (aParamsMap["jspos"] && aParamsMap["jspos"] == 1 && noPrefOverride);
}
