/* -*- mode: javascript; tab-width: 8; indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


class aeDialog
{
  constructor(aDlgEltSelector)
  {
    this._dlgEltStor = aDlgEltSelector;
    this._fnInit = function () {};
    this._fnDlgShow = function () {};
    this._fnUnload = function () {};
    this._fnAfterDlgAccept = function () {};

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
  }

  close()
  {
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
    let openDlgElts = document.querySelectorAll(".lightbox-show");

    if (openDlgElts.length > 0) {
      // Normally there should just be 1 dialog open at a time.
      let acceptBtns = document.querySelectorAll(".lightbox-show .dlg-accept:not(:disabled)");
      acceptBtns.forEach(aBtn => { aBtn.click() });
    }
  }

  static cancelDlgs()
  {
    let openDlgElts = document.querySelectorAll(".lightbox-show");

    if (openDlgElts.length > 0) {
      let cancelBtns = document.querySelectorAll(".lightbox-show .dlg-cancel:not(:disabled)");
      cancelBtns.forEach(aBtn => { aBtn.click() });
    }
  }
}
