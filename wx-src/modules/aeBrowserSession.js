/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let aeBrowserSession = function () {
  let _replacemtWndID = null;
  let _savedWndStates = [];
  let _savedWndActiveTabIdxs = [];
  let _savedWndNumPinnedTabs = [];
  
  return {
    async saveAndClose(aReplacementURL)
    {
      let wnds = await browser.windows.getAll({populate: true});
      _savedWndStates = wnds;

      if (aReplacementURL) {
	let replcWnd = await browser.windows.create({ url: aReplacementURL });
	_replacemtWndID = replcWnd.id;
      }

      for (let wnd of wnds) {
	if (wnd.id == _replacemtWndID) {
	  continue;
	}

	_savedWndActiveTabIdxs.push(wnd.tabs.findIndex(aTab => aTab.active));

	let numPinnedTabs = 0;
	for (let i = 0; i < wnd.tabs.length; i++) {
          if (wnd.tabs[i].pinned) {
	    numPinnedTabs++;
          }
          else {
	    break;
          }
	};

	_savedWndNumPinnedTabs.push(numPinnedTabs);
	browser.windows.remove(wnd.id);
      }
    },

    async restore()
    {
      function isNonrestrictedURL(aURL)
      {
	// The restricted URLs for browser.tabs.create() are described here:
	// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/create
	return (!(aURL.startsWith("chrome:")
		  || aURL.startsWith("file:")
		  || aURL.startsWith("javascript:")
		  || aURL.startsWith("data:")
		  || aURL.startsWith("about:")));
      }

      let focusedWndID = null;
      
      while (_savedWndStates.length > 0) {   
	let closedWnd = _savedWndStates.shift();
	let wndInfo = {
          type: "normal",
          incognito: closedWnd.incognito,
          state: closedWnd.state,
	};

	if (closedWnd.state == "normal") {
          wndInfo.top = closedWnd.top;
          wndInfo.left = closedWnd.left;
          wndInfo.width = closedWnd.width;
          wndInfo.height = closedWnd.height;
	}
	
	if (closedWnd.tabs.length == 1) {
          let brwsTabURL = closedWnd.tabs[0].url;

          // Default to home page if URL is restricted.
          wndInfo.url = isNonrestrictedURL(brwsTabURL) ? brwsTabURL : null;
	}
	else {
          let safeBrwsTabs = closedWnd.tabs.filter(aTab => isNonrestrictedURL(aTab.url));
          wndInfo.url = safeBrwsTabs.map(aTab => aTab.url);
	}

	let createdWnd = await browser.windows.create(wndInfo);
	let activeTabIdx = _savedWndActiveTabIdxs.shift();
	let activeTabID = 0;

	if (activeTabIdx >= createdWnd.tabs.length) {
          // Some tabs may not be restored (e.g. "about:" pages), which would
          // mess up the saved index of the active tab.
          activeTabIdx = createdWnd.tabs.length - 1;
          activeTabID = createdWnd.tabs[activeTabIdx].id;
	}
	else {
          activeTabID = createdWnd.tabs[activeTabIdx].id;
	}
	await browser.tabs.update(activeTabID, {active: true});

	let numPinnedTabs = _savedWndNumPinnedTabs.shift();
	for (let i = 0; i < numPinnedTabs; i++) {
          browser.tabs.update(createdWnd.tabs[i].id, {pinned: true});
	}
	
	if (closedWnd.focused) {
          focusedWndID = createdWnd.id;
	}
      }

      let replacemtWnd = await browser.windows.get(_replacemtWndID);
      await browser.windows.remove(replacemtWnd.id);
      _replacemtWndID = null;

      if (focusedWndID) {
	let updWnd = await browser.windows.update(focusedWndID, {focused: true});
      }
    }
  };
}();
