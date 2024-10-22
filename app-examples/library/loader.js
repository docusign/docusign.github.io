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
        this.loaderChoice = args.loaderChoice; // multiple | modal | animationFloating | animationShader
        // The loader choice that will be used
        this._loaderChoice;
        this.makeLoaderChoice(); // sets this._loaderChoice
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
        if (this._loaderChoice === "animationFloating") {
            this.AnimationClass = AnimationFloating
        } else if (this._loaderChoice === "animationShader") {
            this.AnimationClass = RawShader
        }

        this.animation; 
        this.getSize = this.getSize.bind(this);
    }

    /***
     * Setter/Getter for loaderChoice
     */
    set loaderChoice(loaderChoiceArg) {
        this.#loaderChoice = loaderChoiceArg; 
        this.makeLoaderChoice()
        if (this._loaderChoice === "animationFloating") {
            this.AnimationClass = AnimationFloating
        } else if (this._loaderChoice === "animationShader") {
            this.AnimationClass = RawShader
        }
    }
    get loaderChoice() {
        return this.#loaderChoice
    }

    /***
     * makeLoaderChoice -- if "multiple" then determine the next choice
     */
    makeLoaderChoice() {
        const LOADER_CHOICE = "Animation loader choice";
        if (this.loaderChoice !== "multiple") {
            this._loaderChoice = this.loaderChoice;
            return; 
        }

        const choices = ["modal", "animationFloating", "animationShader"];
        const oldChoice = storageGet(LOADER_CHOICE, null);
        const oldChoiceI = oldChoice ? 
            choices.findIndex((element) => element === oldChoice) : null;
        let newChoice;
        if (!oldChoice) {
            newChoice = choices[choices.length - 1];
        } else if (oldChoiceI > -1) {
            newChoice = choices[(oldChoiceI + 1) % choices.length]
        } else {
            newChoice = choices[0]
        }
        this._loaderChoice = newChoice;
        storageSet(LOADER_CHOICE, newChoice);
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
        this.progressValue = 0.0;
        this.setProgress();
        this.progressIntervalId = setInterval (this.progressFunction, this.progressTick);

        this.animation = new this.AnimationClass({
            parentEl: this.parentEl,
            backgroundColor: this.backgroundColor,
            getSize: this.getSize,
        });

        this.statusEl.removeAttribute("hidden");
        this.parentEl.removeAttribute("hidden");
        this.shown = true;
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
        return this._loaderChoice === "modal"
    }
}

export { Loader };