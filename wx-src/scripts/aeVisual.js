/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


let aeVisual = {
  _iconCache: [],

  preloadMsgBoxIcons()
  {
    this.cacheIcons(
      "question-64.png",
      "question-64-mac.png",
      "confirm-win.png",
    );
  },

  cacheIcons(...aIconFileNames)
  {
    for (let fileName of aIconFileNames) {
      let img = new Image();
      img.src = `../img/${fileName}`;
      this._iconCache.push(img);
    }
  },
};
