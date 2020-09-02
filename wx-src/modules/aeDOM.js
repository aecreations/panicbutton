/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let aeDOM = {};

aeDOM.createTextNode = function (aStringKey)
{
  let rv = document.createTextNode(browser.i18n.getMessage(aStringKey));
  return rv;
};


aeDOM.createTextNodeWithSpc = function ()
{
  let rv = document.createTextNode("\u00a0");
  return rv;
};


aeDOM.createEltWithID = function (aNodeName, aNodeID, aStringKey)
{
  let rv = document.createElement(aNodeName);
  rv.id = aNodeID;
  let text = document.createTextNode(browser.i18n.getMessage(aStringKey));
  rv.appendChild(text);

  return rv;
};


aeDOM.createEltWithClass = function (aNodeName, aNodeClass, aStringKey)
{
  let rv = document.createElement(aNodeName);
  rv.className = aNodeClass;
  let text = document.createTextNode(browser.i18n.getMessage(aStringKey));
  rv.appendChild(text);

  return rv;
};


aeDOM.createHyperlink = function (aStringKey, aURL)
{
  let rv = document.createElement("a");
  rv.className = "hyperlink";
  rv.setAttribute("href", aURL);
  let text = document.createTextNode(browser.i18n.getMessage(aStringKey));
  rv.appendChild(text);

  return rv; 
};

