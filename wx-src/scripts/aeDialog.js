/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


class aeDialog
{
  constructor(aDlgEltSelector)
  {
    this.FOCUSABLE_ELTS_STOR = "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]";

    this._dlgElt = document.querySelector(`${aDlgEltSelector}`);
    this._dlgEltStor = aDlgEltSelector;
    this._fnInit = function () {};
    this._fnDlgShow = function () {};
    this._fnUnload = function () {};
    this._fnAfterDlgAccept = function () {};
    this._lastFocusedElt = null;
    this._focusedElt = null;
    this._firstTabStop = null;
    this._lastTabStop = null;

    this._fnDlgAccept = function (aEvent) {
      this.close();
    };
    
    this._fnDlgCancel = function (aEvent) {
      this.close();
    };

    this._init();
  }

  _init()
  {
    let dlgAcceptElt = document.querySelector(`${this._dlgEltStor} > .dlg-btns > .dlg-accept`);
    if (dlgAcceptElt) {
      dlgAcceptElt.addEventListener("click", aEvent => {
        if (aEvent.target.disabled) {
          return;
        }
        this._fnDlgAccept(aEvent);
        this._fnAfterDlgAccept();
      });
    }

    let dlgCancelElt = document.querySelector(`${this._dlgEltStor} > .dlg-btns > .dlg-cancel`);
    if (dlgCancelElt) {
      dlgCancelElt.addEventListener("click", aEvent => {
        if (aEvent.target.disabled) {
          return;
        }
        this._fnDlgCancel(aEvent);
      });
    }
  }
  
  set onInit(aFnInit)
  {
    this._fnInit = aFnInit;
  }

  set onUnload(aFnUnload)
  {
    this._fnUnload = aFnUnload;
  }

  set onShow(aFnShow)
  {
    this._fnDlgShow = aFnShow;
  }
  
  set onAfterAccept(aFnAfterAccept)
  {
    this._fnAfterDlgAccept = aFnAfterAccept;
  }
  
  set onAccept(aFnAccept)
  {
    this._fnDlgAccept = aFnAccept;
  }

  set onCancel(aFnCancel)
  {
    this._fnDlgCancel = aFnCancel;    
  }

  showModal()
  {
    this._fnInit();
    document.querySelector("#lightbox-bkgrd-ovl").classList.add("lightbox-show");
    document.querySelector(`${this._dlgEltStor}`).classList.add("lightbox-show");
    this._fnDlgShow();

    this.initKeyboardNavigation();
  }

  initKeyboardNavigation()
  {
    this._lastFocusedElt = document.activeElement;

    let focusableElts = this._dlgElt.querySelectorAll(`${this.FOCUSABLE_ELTS_STOR}`);
    this._firstTabStop = focusableElts[0];
    this._lastTabStop = focusableElts[focusableElts.length - 1];

    this._dlgElt.addEventListener("keydown", aEvent => { this.handleKeyDownEvent(aEvent) });

    if (this._focusedElt) {
      this._focusedElt.focus();
    }
    else {
      this._firstTabStop.focus();
    }
  }

  handleKeyDownEvent(aEvent)
  {
    if (aEvent.key == "Tab") {
      if (aEvent.shiftKey) {
        if (document.activeElement == this._firstTabStop) {
          aEvent.preventDefault();
          this._lastTabStop.focus();
        }
      }
      else {
        if (document.activeElement == this._lastTabStop) {
          aEvent.preventDefault();
          this._firstTabStop.focus();
        }
      }
    }
  }

  close()
  {
    this._dlgElt.removeEventListener("keydown", aEvent => { this.handleKeyDownEvent(aEvent) });

    this._fnUnload();
    document.querySelector(`${this._dlgEltStor}`).classList.remove("lightbox-show");
    document.querySelector("#lightbox-bkgrd-ovl").classList.remove("lightbox-show");
  }

  static isOpen()
  {
    return (document.querySelectorAll(".lightbox-show").length > 0);
  }
  
  static acceptDlgs()
  {
    let openDlgElts = document.querySelectorAll(".lightbox.lightbox-show");

    if (openDlgElts.length > 0) {
      // Normally there should just be 1 dialog open at a time.
      let defaultBtns = openDlgElts[0].querySelectorAll(".default:not(:disabled)");
      defaultBtns.forEach(aBtn => { aBtn.click() });
    }
  }

  static cancelDlgs()
  {
    let openDlgElts = document.querySelectorAll(".lightbox.lightbox-show");

    if (openDlgElts.length > 0) {
      // Normally there should just be 1 dialog open at a time.
      let cancelBtns = openDlgElts[0].querySelectorAll(".dlg-cancel:not(:disabled)");
      if (cancelBtns.length > 0) {
        cancelBtns.forEach(aBtn => { aBtn.click() });
      }
      else {
        // Dialog only has an OK, Close or Done button.
        let defaultBtns = openDlgElts[0].querySelectorAll(".default");
        defaultBtns.forEach(aBtn => { aBtn.click() });
      }
    }
  }
}
