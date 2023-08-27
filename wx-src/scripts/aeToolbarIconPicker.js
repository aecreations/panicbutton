/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


let aeToolbarIconPicker = {
  CUSTOM_ICON_IDX: 20,

  _selectedIdx: null,
  _id: null,
  _elt: null,
  _toolbarBtnIcons: null,
  _custIcon: false,
  _prevElt: null,
  _nextElt: null,

  set selectedIndex(aIndex)
  {
    if (! this._toolbarBtnIcons) {
      throw new ReferenceError("aeToolbarIconPicker not initialized");
    }

    aIndex = Number(aIndex);
    if (aIndex == this.CUSTOM_ICON_IDX) {
      document.getElementById("custom-icon").checked = true;
    }
    else {
      document.getElementById(this._toolbarBtnIcons[aIndex]).checked = true;
    }
    
    return this._selectedIdx = aIndex;
  },

  get selectedIndex()
  {
    return this._selectedIdx;
  },

  set hasCustomIcon(aHasCustomIcon)
  {
    return this._custIcon = aHasCustomIcon;
  },

  get hasCustomIcon()
  {
    return this._custIcon;
  },

  init(aID, aToolbarBtnIcons, aPrevElt, aNextElt)
  {
    this._id = aID;
    this._toolbarBtnIcons = aToolbarBtnIcons;
    this._elt = document.getElementById(this._id);
    this._prevElt = aPrevElt;
    this._nextElt = aNextElt;

    let tbIcons = Array.from(document.getElementsByName("toolbar-button-icon"));
    tbIcons.forEach((aIcon, aIndex) => {
      aIcon.addEventListener("click", aEvent => {
        aeToolbarIconPicker.selectedIndex = aIndex;
      });
    });

    this._elt.addEventListener("keydown", aEvent => {
      aEvent.preventDefault();

      let currIdx = this._selectedIdx;
      let newIdx = 0;
      
      if (aEvent.key == "Tab") {
        this._elt.blur();
        if (aEvent.shiftKey) {
          this._prevElt.focus();
        }
        else {
          this._nextElt.focus();
        }
        return;
      }
      else if (aEvent.key == "ArrowRight" || aEvent.key == "ArrowDown") {
        let maxIdx = this._toolbarBtnIcons.length - 1;
        if (this._custIcon) {
          maxIdx = this.CUSTOM_ICON_IDX;
        }

        if (currIdx == maxIdx) {
          // The last toolbar button icon is selected.
          return;
        }
        this._selectedIdx = newIdx = currIdx + 1;
      }
      else if (aEvent.key == "ArrowLeft" || aEvent.key == "ArrowUp") {
        if (currIdx == 0) {
          // The first toolbar button icon is selected.
          return;
        }
        this._selectedIdx = newIdx = currIdx - 1;
      }

      let newToolbarBtnIco;
      if (newIdx == this.CUSTOM_ICON_IDX) {
        newToolbarBtnIco = document.getElementById("custom-icon");
      }
      else {
        newToolbarBtnIco = document.getElementById(this._toolbarBtnIcons[newIdx]);
      }
      newToolbarBtnIco.checked = true;
      newToolbarBtnIco.click();
    });
  },
};
