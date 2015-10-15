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

(function($) {
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
            rectDone:             !!options.rect,
        }, options );

        if (!this.element) {
            this.element = $.makeNeutralElement('div');
            this.element.style.background = 'rgba(0, 0, 0, 0.1)';
        }
        if (!this.borders) {
            this.element = $.makeNeutralElement('div');
            this.element.style.background = 'rgba(0, 0, 0, 0.1)';
        }
        this.borders = this.borders || [];
        var handle;
        for (var i = 0; i < 4; i++) {
            if (!this.borders[i]) {
                this.borders[i]                  = $.makeNeutralElement('div');
                this.borders[i].className        = 'border-' + i;
                this.borders[i].style.position   = 'absolute';
                this.borders[i].style.width      = '1px';
                this.borders[i].style.height     = '1px';
                this.borders[i].style.background = '#fff';
            }

            handle                  = $.makeNeutralElement('div');
            handle.className        = 'border-' + i + '-handle';
            handle.style.position   = 'absolute';
            handle.style.top        = '50%';
            handle.style.left       = '50%';
            handle.style.width      = '6px';
            handle.style.height     = '6px';
            handle.style.margin     = '-4px 0 0 -4px';
            handle.style.background = '#000';
            new $.MouseTracker({
                element:     this.borders[i],
                dragHandler: onBorderDrag.bind(this, i),
            });

            this.borders[i].appendChild(handle);
            this.element.appendChild(this.borders[i]);
        }
        this.borders[0].style.top = 0;
        this.borders[0].style.width = '100%';
        this.borders[1].style.right = 0;
        this.borders[1].style.height = '100%';
        this.borders[2].style.bottom = 0;
        this.borders[2].style.width = '100%';
        this.borders[3].style.left = 0;
        this.borders[3].style.height = '100%';

        if (!this.overlay) {
            this.overlay = new $.SelectionOverlay(this.element, this.rect || new $.SelectionRect());
        }

        this.outerTracker = new $.MouseTracker({
            element:        this.viewer.drawer.canvas,
            dragHandler:    $.delegate( this, onOutsideDrag ),
            dragEndHandler: $.delegate( this, onOutsideDragEnd ),
            keyHandler:     $.delegate( this, onKeyPress ),
            startDisabled:  !this.isSelecting,
        });

        this.innerTracker = new $.MouseTracker({
            element:        this.element,
            dragHandler:    $.delegate( this, onInsideDrag ),
            dragEndHandler: $.delegate( this, onInsideDragEnd ),
            keyHandler:     $.delegate( this, onKeyPress ),
            scrollHandler:  $.delegate( this.viewer, this.viewer.innerTracker.scrollHandler ),
            pinchHandler:   $.delegate( this.viewer, this.viewer.innerTracker.pinchHandler ),
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

        this.viewer.addHandler('open', this.draw.bind(this));
        this.viewer.addHandler('animation', this.draw.bind(this));
        this.viewer.addHandler('resize', this.draw.bind(this));
        this.viewer.addHandler('rotate', this.draw.bind(this));
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
            if (this.rect) {
                this.overlay.update(normalizeRect(this.rect));
                this.overlay.drawHTML(this.viewer.drawer.container, this.viewer.viewport);
            }
        },

        undraw: function() {
            this.overlay.destroy();
            this.rect = null;
        },
    };

    function onOutsideDrag(e) {
        var start = new $.Point(e.position.x - e.delta.x, e.position.y - e.delta.y);
        start = this.viewer.viewport.pointFromPixel(start, true);
        var end = this.viewer.viewport.deltaPointsFromPixels(e.delta, true);
        if (!this.rect) {
            this.rect = new $.SelectionRect(start.x, start.y, end.x, end.y);
            this.rectDone = false;
        } else if (this.rectDone) {
            // rotate
            var angle1 = this.rect.getAngleFromCenter(start);
            end = this.viewer.viewport.pointFromPixel(e.position, true);
            var angle2 = this.rect.getAngleFromCenter(end);
            this.rect.rotation = (this.rect.rotation + angle1 - angle2) % Math.PI;
        } else {
            this.rect.width += end.x;
            this.rect.height += end.y;
        }
        this.draw();
    }

    function onOutsideDragEnd() {
        this.rectDone = true;
    }

    function onInsideDrag(e) {
        $.addClass(this.element, 'dragging');
        var delta = this.viewer.viewport.deltaPointsFromPixels(e.delta, true);
        this.rect.x += delta.x;
        this.rect.y += delta.y;
        this.draw();
    }

    function onInsideDragEnd() {
        $.removeClass(this.element, 'dragging');
    }

    function onBorderDrag(border, e) {
        var delta = e.delta;
        var rotation = this.rect.getDegreeRotation();
        if (rotation !== 0) {
            // adjust vector
            delta = delta.rotate(-1 * rotation, new $.Point(0, 0));
        }
        delta = this.viewer.viewport.deltaPointsFromPixels(delta, true);
        var center = this.rect.getCenter();
        switch (border) {
            case 0:
                this.rect.y += delta.y;
                this.rect.height -= delta.y;
                break;
            case 1:
                this.rect.width += delta.x;
                break;
            case 2:
                this.rect.height += delta.y;
                break;
            case 3:
                this.rect.x += delta.x;
                this.rect.width -= delta.x;
                break;
        }
        if (rotation !== 0) {
            // calc center deviation
            var newCenter = this.rect.getCenter();
            // rotate new center around old
            var target = newCenter.rotate(rotation, center);
            // adjust new center
            delta = target.minus(newCenter);
            this.rect.x += delta.x;
            this.rect.y += delta.y;
        }
        this.draw();
    }

    function onKeyPress(e) {
        var key = e.keyCode ? e.keyCode : e.charCode;
        if (key === 13 && this.rect) {
            var result = this.viewer.viewport.viewportToImageRectangle(normalizeRect(this.rect));
            result = new $.SelectionRect(
                Math.round(result.x),
                Math.round(result.y),
                Math.round(result.width),
                Math.round(result.height),
                this.rect.rotation
            );
            console.log(result);
            this.viewer.raiseEvent('selection', result);
            this.undraw();
        } else if (String.fromCharCode(key) === this.keyboardShortcut) {
            this.toggleState();
        }
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

})(OpenSeadragon);
