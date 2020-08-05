/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let gPanicButton;


function $(aID)
{
  return document.getElementById(aID);
}


async function init()
{
  gPanicButton = await browser.runtime.getBackgroundPage();

  browser.history.deleteUrl({ url: window.location.href });


  let keybShctChg = $("keyb-shct-change");
  keybShctChg.appendChild(createTextNode("keybShctChg1"));
  keybShctChg.appendChild(createEltWithID("span", "panic-button-action", gPanicButton.getPanicActionUIStringKey()));
  keybShctChg.appendChild(createTextNode("keybShctChg2"));

  let keybShctExpl = $("explanation");
  keybShctExpl.appendChild(createTextNodeWithSpc());
  keybShctExpl.appendChild(createTextNode("keybShctExpl"));

  $("btn-close").addEventListener("click", async (aEvent) => { closePage() });
  
  document.addEventListener("contextmenu", aEvent => {
    if (aEvent.target.tagName != "INPUT" && aEvent.target.getAttribute("type") != "text") {
      aEvent.preventDefault();
    }
  }, false);   
}


function createTextNode(aStringKey)
{
  let rv = document.createTextNode(browser.i18n.getMessage(aStringKey));
  return rv;
}


function createTextNodeWithSpc()
{
  let rv = document.createTextNode("\u00a0");
  return rv;
}


function createEltWithID(aNodeName, aNodeID, aStringKey)
{
  let rv = document.createElement(aNodeName);
  rv.id = aNodeID;
  let text = document.createTextNode(browser.i18n.getMessage(aStringKey));
  rv.appendChild(text);
  return rv;
}


function createEltWithClass(aNodeName, aNodeClass, aStringKey)
{
  let rv = document.createElement(aNodeName);
  rv.className = aNodeClass;
  let text = document.createTextNode(browser.i18n.getMessage(aStringKey));
  rv.appendChild(text);
  return rv;
}


async function closePage()
{
  let tab = await browser.tabs.getCurrent();
  browser.tabs.remove(tab.id);
}


document.addEventListener("DOMContentLoaded", async (aEvent) => { init() });
