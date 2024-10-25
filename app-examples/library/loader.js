// Copyright © 2024 Docusign, Inc.
// License: MIT Open Source https://opensource.org/licenses/MIT
//

import {AnimationFloating} from "./animation/lib/animationFloating.js";
import { RawShader } from "./animation/lib/rawShader.js";
import { storageGet, storageSet } from "./utilities.js";

/***
 * Loader gives the user feedback as a "loader"--either
 * by using the LoadingModal class (see utilities lib file)
 * or via an animation with additional feedback
 */
class Loader {
    #loaderChoice = null;
    constructor(args) {
        // The loader choice from the settings UX
        this.loaderChoice = args.loaderChoice; //  modal | animationFloating | animationShader
        // The loader choice that will be used
        this.parentEl = document.getElementById(args.parentEl); // ID of the element
        this.mainEl = args.mainEl ? document.getElementById(args.mainEl) : null; // ID of the element
        this.statusEl = document.getElementById(args.statusEl); // ID of the element
        this.loadingModal = args.loadingModal;
        this.backgroundColor = args.backgroundColor;
        
        this.shown = false; // Is the animation loader being shown?
        this.statusMessageSelector = `#${args.statusEl} .message`; // for jQuery
        this.progressIntervalId = null;
        this.progressBarEl = this.statusEl.getElementsByClassName("progress-bar")[0];
        this.progressValue;
        this.progressTick = 250; // milliseconds
        this.progressTotalSec = 15; // sec -- the maximum expected time needed with 
                                    //        mobile signers on a slow network
        // We want to reach 80% after this.progressTotalSec seconds
        this.progressPerTick =  (80.0 / this.progressTotalSec) * (this.progressTick / 1000);
        this.progressFunction = this.progressFunction.bind(this);
        
        this.AnimationClass;

        this.animation; 
        this.getSize = this.getSize.bind(this);
    }

    /***
     * show -- set the loader's message, show the loader
     *      can be called additional times to update the msg 
     */
    show(msg) {
        if (this._useModal()) {
            return this.loadingModal.show(msg);
        }

        //  use an animation
        //
        // update the message
        $(this.statusMessageSelector).text(msg);
        if (this.shown) {
            return; // EARLY return
        }

        // starting up
        this.shown = true;
        this.progressValue = 0.0;
        this.setProgress();
        this.progressIntervalId = setInterval (this.progressFunction, this.progressTick);

        if (this.loaderChoice === "animationFloating") {
            this.AnimationClass = AnimationFloating
        } else if (this.loaderChoice === "animationShader") {
            this.AnimationClass = RawShader
        }
        
        this.animation = new this.AnimationClass({
            parentEl: this.parentEl,
            backgroundColor: this.backgroundColor,
            getSize: this.getSize,
        });

        this.statusEl.removeAttribute("hidden");
        this.parentEl.removeAttribute("hidden");
        if (this.mainEl) {$(this.mainEl).addClass("hide")}
        this.animation.show();
        return;
    }

    /***
     * progressFunction
     */
    progressFunction() {
        this.progressValue += (this.progressValue < 80 ? this.progressPerTick :
            this.progressPerTick / 5);
        if (this.progressValue > 100) {
            this.progressValue = 100
        }
        this.setProgress()
    }

    /***
     * setProgress -- set the value for the progress bar
     */
    setProgress() {
        this.progressBarEl.style.width = `${this.progressValue}%`;
    }

    /***
     * getSize (parentEl) Returns ({height, width})
     */
    getSize(parentEl) {
        // The following works if the parentEl is setup with 100% height
        // The issue is the height of a div that is currently empty
        return this.parentEl.getBoundingClientRect();
    }

    /***
     * delayedHide -- show a final message for a couple of seconds,
     *      then hide the modal
     */
    delayedHide(msg, timeoutSec=2) {
        if (this._useModal()) {
            this.loadingModal.delayedHide(msg, timeoutSec);
            this.loaderChoice = this.loaderChoice; // will go on to the next loader if appropriate
            return
        }

        if (!this.shown) {
            return
        }
        this.shown = false;
        $(this.statusMessageSelector).text(msg);
        setTimeout(() => {this.hide(true)}, timeoutSec * 1000);
    }

    /***
     * hide -- immediately close the loader
     */
    hide(force = false) {
        if (this._useModal()) {
            this.loadingModal.hide()
            this.loaderChoice = this.loaderChoice; // will go on to the next loader if appropriate
            return
        }

        if (!(this.shown || force)) {
            return
        }
        this.shown = false;

        clearInterval(this.progressIntervalId);
        this.animation.destroy();
        this.animation = undefined;
        this.parentEl.setAttribute("hidden", "");
        this.statusEl.setAttribute("hidden", "");
        this.loaderChoice = this.loaderChoice; // will go on to the next loader if appropriate
    }

    _useModal() {
        return this.loaderChoice === "modal"
    }
}

export { Loader };