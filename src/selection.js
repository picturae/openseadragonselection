/*
 * OpenSeadragon - full-screen support functions
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2013 OpenSeadragon contributors
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * - Neither the name of CodePlex Foundation nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function( $ ) {
    'use strict';

    if (!$.version || $.version.major < 2) {
        throw new Error('This version of OpenSeadragonSelection requires OpenSeadragon version 2.0.0+');
    }

    $.Viewer.prototype.selection = function(options) {
        if (!this.selectionInstance || options) {
            options = options || {};
            options.viewer = this;
            this.selectionInstance = new $.Selection(options);
        }
        return this.selectionInstance;
    };


    /**
    * @class Selection
    * @classdesc Provides functionality for selecting part of an image
    * @memberof OpenSeadragon
    * @param {Object} options
    */
    $.Selection = function ( options ) {

        $.extend( true, this, {
            //internal state properties
            viewer:               null,
            element:              null,
            showSelectionControl: true,
            keyboardShortcut:     'c',
            onSelection:          function() {},

            isSelecting:          false,
            rect:                 null,
            rectDone:             true,
        }, options );

        if (!this.element) {
            this.element = $.makeNeutralElement('div');
            this.element.style.background = '#000'; // @TEMP
        }
        if (!this.overlay) {
            this.overlay = new $.SelectionOverlay(this.element, this.rect || new $.SelectionRect());
        }

        this.outerTracker = new $.MouseTracker({
            element:                  this.viewer.drawer.canvas,
            dragHandler:              $.delegate( this, onOutsideDrag ),
            dragEndHandler:           $.delegate( this, onOutsideDragEnd ),
            keyHandler:               $.delegate( this, onKeyPress ),
            startDisabled:            !this.isSelecting,
            clickHandler:             function() {console.log('turtle');},
        });

        this.innerTracker = new $.MouseTracker({
            element:                  this.element,
            dragHandler:              $.delegate( this, onInsideDrag ),
            dragEndHandler:           $.delegate( this, onInsideDragEnd ),
            keyHandler:               $.delegate( this, onKeyPress ),
            scrollHandler:            $.delegate( this.viewer, this.viewer.innerTracker.scrollHandler ),
            pinchHandler:             $.delegate( this.viewer, this.viewer.innerTracker.pinchHandler ),
        });

        if ( this.keyboardShortcut ) {
            // var cb = this.viewer.innerTracker
            $.addEvent(
                this.viewer.container,
                'keypress',
                $.delegate( this, onKeyPress ),
                false
            );
        }
        if ( this.showSelectionControl ) {
            // @TODO
            // this.viewer.buttons.push( this.selectionButton = new $.Button({
            //     element:    null,
            //     clickTimeThreshold: this.viewer.clickTimeThreshold,
            //     clickDistThreshold: this.viewer.clickDistThreshold,
            //     tooltip:    $.getString( "Tooltips.RotateRight" ),
            //     srcRest:    resolveUrl( this.viewer.prefixUrl, this.viewer.navImages.rotateright.REST ),
            //     srcGroup:   resolveUrl( this.viewer.prefixUrl, this.viewer.navImages.rotateright.GROUP ),
            //     srcHover:   resolveUrl( this.viewer.prefixUrl, this.viewer.navImages.rotateright.HOVER ),
            //     srcDown:    resolveUrl( this.viewer.prefixUrl, this.viewer.navImages.rotateright.DOWN ),
            //     onRelease:  this.toggleState.bind( this ),
            //     onFocus:    $.delegate( this.viewer, onFocus ),
            //     onBlur:     $.delegate( this.viewer, onBlur )
            // }));
        }

        this.viewer.addHandler('selection', this.onSelection);
    };

    $.Selection.prototype = /** @lends OpenSeadragon.Selection.prototype */{

        toggleState: function() {
            $.console.log('onSelectionToggle');
            if (this.isSelecting) {
                this.disable();
            } else {
                this.enable();
            }
        },

        enable: function() {
            this.isSelecting = true;
            this.outerTracker.setTracking(true);
            this.undraw();
        },

        disable: function() {
            this.isSelecting = false;
            this.outerTracker.setTracking(false);
            this.undraw();
        },

        draw: function() {
            this.overlay.update(normalizeRect(this.rect));
            this.overlay.drawHTML(this.viewer.container, this.viewer.viewport);
        },

        undraw: function() {
            this.overlay.destroy();
            this.rect = null;
        },

        getAngleFromCenter: function(point) {
            var diff = point.minus(this.rect.getCenter());
            return Math.atan2(diff.x, diff.y);
        }
    };

    function onOutsideDrag(e) {
    this.outerTracker.setTracking(true);
        var start = new $.Point(e.position.x - e.delta.x, e.position.y - e.delta.y);
        start = this.viewer.viewport.pointFromPixel(start, true);
        var end = this.viewer.viewport.deltaPointsFromPixels(e.delta, true);
        if (!this.rect) {
            this.rect = new $.SelectionRect(start.x, start.y, end.x, end.y);
            this.rectDone = false;
        } else if (this.rectDone) {
            // rotate
            var angle1 = this.getAngleFromCenter(start);
            end = this.viewer.viewport.pointFromPixel(e.position, true);
            var angle2 = this.getAngleFromCenter(end);
            this.rect.rotation = (this.rect.rotation + angle1 - angle2) % Math.PI;
        } else {
            this.rect.width += end.x;
            this.rect.height += end.y;
        }
        this.draw();
        return true;
    }

    function onOutsideDragEnd() {
        this.rectDone = true;
        return true;
    }

    function onInsideDrag(e) {
        $.addClass(this.element, 'dragging');
        var delta = this.viewer.viewport.deltaPointsFromPixels(e.delta, true);
        this.rect.x += delta.x;
        this.rect.y += delta.y;
        this.draw();
        return true;
    }

    function onInsideDragEnd() {
        $.removeClass(this.element, 'dragging');
        return true;
    }

    function onKeyPress(e) {
        var key = e.keyCode ? e.keyCode : e.charCode;
        if (key === 13 && this.rect) {
            console.log(normalizeRect(this.rect));
            this.viewer.raiseEvent( 'selection', normalizeRect(this.rect) );
            this.undraw();
        } else if (String.fromCharCode(key) === this.keyboardShortcut) {
            this.toggleState();
        }
        return true;
    }

    function normalizeRect(rect) {
        var fixed = rect.clone();
        if (fixed.width < 0) {
            fixed.x += fixed.width;
            fixed.width *= -1;
        }
        if (fixed.height < 0) {
            fixed.y += fixed.height;
            fixed.height *= -1;
        }
        // fixed.rotation %= Math.PI;
        return fixed;
    }

})( OpenSeadragon );
