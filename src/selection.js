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
        if (!this.selectionInstance) {
            options = options || {};
            options.viewer = this;
            this.selectionInstance = new $.Selection(options);
        } else {
            this.selectionInstance.refresh(options);
        }
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
            startNew:             true
        }, options );

        if (!this.element) {
            this.element = $.makeNeutralElement( 'div' );
            this.element.style.background = '#000';
        }

        this.outerTracker = new $.MouseTracker({
            element:                  this.viewer.drawer.canvas,
            dragHandler:              $.delegate( this, onOutsideDrag ),
            dragEndHandler:           $.delegate( this, onOutsideDragEnd ),
            keyHandler:               $.delegate( this, onKeyPress ),
            startDisabled:            !this.isSelecting,
        });

        this.innerTracker = new $.MouseTracker({
            element:                  this.element,
            dragHandler:              $.delegate( this, onInsideDrag ),
            dragEndHandler:           $.delegate( this, onInsideDragEnd ),
            // keyHandler:               $.delegate( this, onKeyPress ),
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
            this.viewer.removeOverlay(this.element);
            this.rect = null;
        },

        disable: function() {
            this.isSelecting = false;
            this.outerTracker.setTracking(false);
            this.viewer.removeOverlay(this.element);
            this.rect = null;
        }
    };

    function onOutsideDrag(e) {
        var end = this.viewer.viewport.deltaPointsFromPixels(e.delta, true);
        if (!this.rect || this.startNew) {
            this.startNew = false;
            var start = new $.Point(e.position.x - e.delta.x, e.position.y - e.delta.y);
            start = this.viewer.viewport.pointFromPixel(start, true);
            this.rect = new $.SelectionRect(start.x, start.y, end.x, end.y);
            this.viewer.addOverlay(this.element, fixRect(this.rect));
        } else {
            this.rect.width += end.x;
            this.rect.height += end.y;
            this.viewer.updateOverlay(this.element, fixRect(this.rect));
        }
    }

    function onOutsideDragEnd() {
        this.startNew = true;
    }

    function onInsideDrag(e) {
        if (this.element.className.indexOf(' dragging ') === -1) {
            this.element.className += ' dragging ';
        }
        var delta = this.viewer.viewport.deltaPointsFromPixels(e.delta, true);
        this.rect.x += delta.x;
        this.rect.y += delta.y;
        this.viewer.updateOverlay(this.element, fixRect(this.rect));
    }

    function onInsideDragEnd() {
        this.element.className = this.element.className.replace(' dragging ', '');
    }

    function onKeyPress(e) {
        var key = e.keyCode ? e.keyCode : e.charCode;
        if (key === 13) {
            this.viewer.raiseEvent( 'selection', fixRect(this.rect) );
            this.viewer.removeOverlay(this.element);
        } else if (String.fromCharCode(key) === this.keyboardShortcut) {
            this.toggleState();
        }
    }

    function fixRect(rect) {
        var fixed = new $.Rect(rect.x, rect.y, rect.width, rect.height);
        if (fixed.width < 0) {
            fixed.x += fixed.width;
            fixed.width *= -1;
        }
        if (fixed.height < 0) {
            fixed.y += fixed.height;
            fixed.height *= -1;
        }
        return fixed;
    }

})( OpenSeadragon );
