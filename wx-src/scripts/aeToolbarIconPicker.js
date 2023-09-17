/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


let aeToolbarIconPicker = {
  CUSTOM_ICON_IDX: 20,
  NUM_BUILTIN_ICONS: 20,
  CUSTOM_ICON_X: 4,
  CUSTOM_ICON_Y: 2,

  _id: null,
  _elt: null,
  _toolbarBtnIcons: null,
  _prevElt: null,
  _nextElt: null,
  _selectedIdx: null,
  _currPos: null,
  _custIcon: false,

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
      document.getElementById(this._toolbarBtnIcons[aIndex].id).checked = true;
    }
    this._currPos = this._toolbarBtnIcons[aIndex];

    return this._selectedIdx = aIndex;
  },

  get selectedIndex()
  {
    return this._selectedIdx;
  },

  set hasCustomIcon(aHasCustomIcon)
  {
    if (aHasCustomIcon && this._toolbarBtnIcons.length == this.NUM_BUILTIN_ICONS) {
      let custIcoInfo = new aeIconInfo("custom-icon", this.CUSTOM_ICON_X, this.CUSTOM_ICON_Y);
      this._toolbarBtnIcons.push(custIcoInfo);

      let custIcoRadioBtn = document.getElementById("custom-icon");
      custIcoRadioBtn.addEventListener("click", aEvent => {
        aeToolbarIconPicker.selectedIndex = this.CUSTOM_ICON_IDX;
      });
    }

    return this._custIcon = aHasCustomIcon;
  },

  get hasCustomIcon()
  {
    return this._custIcon;
  },

  init(aID, aToolbarBtnIconIDs, aPrevElt, aNextElt)
  {
    this._id = aID;
    this._toolbarBtnIcons = [];
    this._elt = document.getElementById(this._id);
    this._prevElt = aPrevElt;
    this._nextElt = aNextElt;

    let pickerSty = window.getComputedStyle(document.getElementById("toolbar-button-icon"));
    let firstIcoSty = window.getComputedStyle(document.querySelector("#default ~ label > canvas"));
    let pickerWidth = parseInt(pickerSty.width);
    let iconWidth = parseInt(firstIcoSty.width);
    let row = 0;
    let leftOffsetIdx = 0;
    let leftOffsetPx = 0;

    for (let i = 0; i < aToolbarBtnIconIDs.length; i++) {
      let iconInfo = new aeIconInfo(aToolbarBtnIconIDs[i], leftOffsetIdx, row);
      this._toolbarBtnIcons.push(iconInfo);

      let icoRadioBtn = document.getElementById(aToolbarBtnIconIDs[i]);
      icoRadioBtn.addEventListener("click", aEvent => {
        aeToolbarIconPicker.selectedIndex = i;
      });

      leftOffsetPx += iconWidth + 1;
      if ((leftOffsetPx + iconWidth) > pickerWidth) {
        row++;
        leftOffsetPx = 0;
        leftOffsetIdx = 0;
      }
      else {
        leftOffsetIdx++;
      }
    }

    let maxRowIdx = row;

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
      else if (aEvent.key == "ArrowRight") {
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
      else if (aEvent.key == "ArrowLeft") {
        if (currIdx == 0) {
          // The first toolbar button icon is selected.
          return;
        }
        this._selectedIdx = newIdx = currIdx - 1;
      }
      else if (aEvent.key == "ArrowUp") {
        if (this._currPos.y == 0) {
          return;
        }

        let newRow = this._currPos.y - 1;
        let newSelxn = this._toolbarBtnIcons.find(
          aTbIcon => aTbIcon.x == this._currPos.x && aTbIcon.y == newRow
        );
        newIdx = this._toolbarBtnIcons.findIndex(
          aTbIcon => aTbIcon.x == this._currPos.x && aTbIcon.y == newRow
        );

        this._currPos = newSelxn;
        this._selectedIdx = newIdx;
      }
      else if (aEvent.key == "ArrowDown") {
        if (this._currPos.y == maxRowIdx) {
          return;
        }

        let newRow = this._currPos.y + 1;
        let newSelxn = this._toolbarBtnIcons.find(
          aTbIcon => aTbIcon.x == this._currPos.x && aTbIcon.y == newRow
        );
        if (! newSelxn) {
          // There is no toolbar icon at this x position in the last row.
          return;
        }
        
        newIdx = this._toolbarBtnIcons.findIndex(
          aTbIcon => aTbIcon.x == this._currPos.x && aTbIcon.y == newRow
        );

        this._currPos = newSelxn;
        this._selectedIdx = newIdx;
      }
      else {
        return;
      }

      let newToolbarBtnIco;
      if (newIdx == this.CUSTOM_ICON_IDX) {
        newToolbarBtnIco = document.getElementById("custom-icon");
      }
      else {
        newToolbarBtnIco = document.getElementById(this._toolbarBtnIcons[newIdx].id);
      }
      newToolbarBtnIco.checked = true;
      newToolbarBtnIco.click();
    });
  },
};

// Helper class
class aeIconInfo
{
  constructor(aID, aX, aY)
  {
    this.id = aID;
    this.x = aX;
    this.y = aY;
  }
}
