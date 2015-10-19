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
            // internal state properties
            viewer:                  null,
            isSelecting:             false,
            rectDone:                !!options.rect,

            // options
            element:                 null,
            toggleButton:            null,
            showSelectionControl:    true,
            showConfirmDenyButtons:  true,
            styleConfirmDenyButtons: true,
            keyboardShortcut:        'c',
            rect:                    null,
            onSelection:             function() {},
        }, options );

        this.navImages = this.navImages || {
            selection: {
                REST:   'selection_rest.png',
                GROUP:  'selection_grouphover.png',
                HOVER:  'selection_hover.png',
                DOWN:   'selection_pressed.png'
            },
            selectionConfirm: {
                REST:   'selection_confirm_rest.png',
                GROUP:  'selection_confirm_grouphover.png',
                HOVER:  'selection_confirm_hover.png',
                DOWN:   'selection_confirm_pressed.png'
            },
            selectionCancel: {
                REST:   'selection_cancel_rest.png',
                GROUP:  'selection_cancel_grouphover.png',
                HOVER:  'selection_cancel_hover.png',
                DOWN:   'selection_cancel_pressed.png'
            },
        };
        $.extend( true, this.navImages, this.viewer.navImages );

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
            handle.style.border     = '1px solid #ccc';
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

        var prefix = this.viewer.prefixUrl || '';
        var useGroup = this.viewer.buttons && this.viewer.buttons.buttons;
        var anyButton = useGroup ? this.viewer.buttons.buttons[0] : null;
        var onFocusHandler = anyButton ? anyButton.onFocus : null;
        var onBlurHandler = anyButton ? anyButton.onBlur : null;
        if (this.showSelectionControl) {
            this.toggleButton = new $.Button({
                element:    this.toggleButton ? $.getElement( this.toggleButton ) : null,
                clickTimeThreshold: this.viewer.clickTimeThreshold,
                clickDistThreshold: this.viewer.clickDistThreshold,
                tooltip:    $.getString('Tooltips.SelectionToggle') || 'Toggle selection',
                srcRest:    prefix + this.navImages.selection.REST,
                srcGroup:   prefix + this.navImages.selection.GROUP,
                srcHover:   prefix + this.navImages.selection.HOVER,
                srcDown:    prefix + this.navImages.selection.DOWN,
                onRelease:  this.toggleState.bind( this ),
                onFocus:    onFocusHandler,
                onBlur:     onBlurHandler
            });
            if (useGroup) {
                this.viewer.buttons.buttons.push(this.toggleButton);
                this.viewer.buttons.element.appendChild(this.toggleButton.element);
            }
        }
        if (this.showConfirmDenyButtons) {
            this.confirmButton = new $.Button({
                element:    this.confirmButton ? $.getElement( this.confirmButton ) : null,
                clickTimeThreshold: this.viewer.clickTimeThreshold,
                clickDistThreshold: this.viewer.clickDistThreshold,
                tooltip:    $.getString('Tooltips.SelectionConfirm') || 'Confirm selection',
                srcRest:    prefix + this.navImages.selectionConfirm.REST,
                srcGroup:   prefix + this.navImages.selectionConfirm.GROUP,
                srcHover:   prefix + this.navImages.selectionConfirm.HOVER,
                srcDown:    prefix + this.navImages.selectionConfirm.DOWN,
                onRelease:  this.confirm.bind( this ),
                onFocus:    onFocusHandler,
                onBlur:     onBlurHandler
            });
            var confirm = this.confirmButton.element;
            this.element.appendChild(confirm);

            this.cancelButton = new $.Button({
                element:    this.cancelButton ? $.getElement( this.cancelButton ) : null,
                clickTimeThreshold: this.viewer.clickTimeThreshold,
                clickDistThreshold: this.viewer.clickDistThreshold,
                tooltip:    $.getString('Tooltips.SelectionConfirm') || 'Cancel selection',
                srcRest:    prefix + this.navImages.selectionCancel.REST,
                srcGroup:   prefix + this.navImages.selectionCancel.GROUP,
                srcHover:   prefix + this.navImages.selectionCancel.HOVER,
                srcDown:    prefix + this.navImages.selectionCancel.DOWN,
                onRelease:  this.cancel.bind( this ),
                onFocus:    onFocusHandler,
                onBlur:     onBlurHandler
            });
            var cancel = this.cancelButton.element;
            this.element.appendChild(cancel);

            if (this.styleConfirmDenyButtons) {
                confirm.style.position = 'absolute';
                confirm.style.top = '50%';
                confirm.style.left = '50%';
                confirm.style.transform = 'translate(-100%, -50%)';

                cancel.style.position = 'absolute';
                cancel.style.top = '50%';
                cancel.style.left = '50%';
                cancel.style.transform = 'translate(0, -50%)';
            }
        }

        this.viewer.addHandler('selection', this.onSelection);

        this.viewer.addHandler('open', this.draw.bind(this));
        this.viewer.addHandler('animation', this.draw.bind(this));
        this.viewer.addHandler('resize', this.draw.bind(this));
        this.viewer.addHandler('rotate', this.draw.bind(this));
    };

    $.extend( $.Selection.prototype, $.ControlDock.prototype, /** @lends OpenSeadragon.Selection.prototype */{

        toggleState: function() {
            $.console.log('onSelectionToggle');
            if (this.isSelecting) {
                this.disable();
            } else {
                this.enable();
            }
            return this;
        },

        enable: function() {
            this.isSelecting = true;
            this.outerTracker.setTracking(true);
            this.undraw();
            this.viewer.raiseEvent('selection_toggle', true);
            return this;
        },

        disable: function() {
            this.isSelecting = false;
            this.outerTracker.setTracking(false);
            this.undraw();
            this.viewer.raiseEvent('selection_toggle', false);
            return this;
        },

        draw: function() {
            if (this.rect) {
                this.overlay.update(normalizeRect(this.rect));
                this.overlay.drawHTML(this.viewer.drawer.container, this.viewer.viewport);
            }
            return this;
        },

        undraw: function() {
            this.overlay.destroy();
            this.rect = null;
            return this;
        },

        confirm: function() {
            if (this.rect) {
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
            }
            return this;
        },

        cancel: function() {
            this.viewer.raiseEvent('selection_cancel', false);
            return this.undraw();
        },
    });

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
        if (key === 13) {
            this.confirm();
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
