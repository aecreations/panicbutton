/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


function $(aID)
{
  return document.getElementById(aID);
}


async function init()
{
  let extInfo = browser.runtime.getManifest();
  let contribCTA = browser.i18n.getMessage("contribCTA", aeConst.URL_DONATE);
  
  let verSubhdg = document.createTextNode(browser.i18n.getMessage("aboutExtVer", aeConst.CURR_MAJOR_VER));
  $("ver-subhead").appendChild(verSubhdg);

  let contribCTAElt = $("contrib-cta");
  let contCTATxt = createTextNode("contribCTA");
  let contLinkElt = createHyperlink("contribLink", aeConst.URL_DONATE);
  contribCTAElt.appendChild(contCTATxt);
  contribCTAElt.appendChild(createTextNodeWithSpc());
  contribCTAElt.appendChild(contLinkElt);
  
  document.querySelector("#link-website > a").href = extInfo.homepage_url;
  document.querySelector("#link-amo > a").href = aeConst.URL_AMO;
  document.querySelector("#link-blog > a").href = aeConst.URL_BLOG;
  document.querySelector("#link-forum > a").href= aeConst.URL_FORUM;
  
  $("btn-close").addEventListener("click", async (aEvent) => { closePage() }); 

  let anchorElts = document.getElementsByTagName("A");
  for (let elt of anchorElts) {
    elt.addEventListener("click", aEvent => {
      aEvent.preventDefault();
      gotoURL(aEvent.target.href);
    });
  }
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


function createHyperlink(aStringKey, aURL)
{
  let rv = document.createElement("a");
  rv.setAttribute("href", aURL);
  let text = document.createTextNode(browser.i18n.getMessage(aStringKey));
  rv.appendChild(text);
  return rv; 
}


function gotoURL(aURL)
{
  browser.tabs.create({url: aURL});
}


async function closePage()
{
  let tab = await browser.tabs.getCurrent();
  browser.tabs.remove(tab.id);
}


document.addEventListener("DOMContentLoaded", async (aEvent) => { init() });

document.addEventListener("contextmenu", aEvent => {
  if (aEvent.target.tagName != "INPUT" && aEvent.target.getAttribute("type") != "text") {
    aEvent.preventDefault();
  }
});
