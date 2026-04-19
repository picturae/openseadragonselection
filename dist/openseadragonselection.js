(() => {
  // src/selectionoverlay.js
  (function($) {
    "use strict";
    $.SelectionOverlay = function(element, location) {
      $.Overlay.apply(this, arguments);
      if ($.isPlainObject(element)) {
        this.rotation = element.location.rotation || 0;
      } else {
        this.rotation = location.rotation || 0;
      }
    };
    $.SelectionOverlay.prototype = $.extend(Object.create($.Overlay.prototype), {
      /**
       * @function
       * @param {Element} container
       */
      drawHTML: function() {
        $.Overlay.prototype.drawHTML.apply(this, arguments);
        this.style.transform = this.style.transform.replace(/ ?rotate\(.+rad\)/, "") + " rotate(" + this.rotation + "rad)";
      },
      /**
       * @function
       * @param {OpenSeadragon.Point|OpenSeadragon.Rect} location
       * @param {OpenSeadragon.OverlayPlacement} position
       */
      update: function(location) {
        $.Overlay.prototype.update.apply(this, arguments);
        this.rotation = location.rotation || 0;
      }
    });
  })(OpenSeadragon);

  // src/selectionrect.js
  (function($) {
    "use strict";
    $.SelectionRect = function(x, y, width, height, rotation) {
      $.Rect.apply(this, [x, y, width, height]);
      this.rotation = rotation || 0;
    };
    $.SelectionRect.fromRect = function(rect) {
      return new $.SelectionRect(
        rect.x,
        rect.y,
        rect.width,
        rect.height
      );
    };
    $.SelectionRect.prototype = $.extend(Object.create($.Rect.prototype), {
      /**
       * @function
       * @returns {OpenSeadragon.Rect} a duplicate of this Rect
       */
      clone: function() {
        return new $.SelectionRect(this.x, this.y, this.width, this.height, this.rotation);
      },
      /**
       * Determines if two Rectangles have equivalent components.
       * @function
       * @param {OpenSeadragon.Rect} rectangle The Rectangle to compare to.
       * @return {Boolean} 'true' if all components are equal, otherwise 'false'.
       */
      equals: function(other) {
        return $.Rect.prototype.equals.apply(this, [other]) && this.rotation === other.rotation;
      },
      /**
       * Provides a string representation of the rectangle which is useful for
       * debugging.
       * @function
       * @returns {String} A string representation of the rectangle.
       */
      toString: function() {
        return "[" + Math.round(this.x * 100) / 100 + "," + Math.round(this.y * 100) / 100 + "," + Math.round(this.width * 100) / 100 + "x" + Math.round(this.height * 100) / 100 + "@" + Math.round(this.rotation * 100) / 100 + "]";
      },
      swapWidthHeight: function() {
        var swapped = this.clone();
        swapped.width = this.height;
        swapped.height = this.width;
        swapped.x += (this.width - this.height) / 2;
        swapped.y += (this.height - this.width) / 2;
        return swapped;
      },
      /**
       * @function
       * @returns {Number} The rotaion in degrees
       */
      getDegreeRotation: function() {
        return this.rotation * (180 / Math.PI);
      },
      /**
       * @function
       * @param {OpenSeadragon.Point} point
       * @returns {Number} The angle in radians
       */
      getAngleFromCenter: function(point) {
        var diff = point.minus(this.getCenter());
        return Math.atan2(diff.x, diff.y);
      },
      /**
       * Rounds pixel coordinates
       * @function
       * @returns {SelectionRect} The altered rect
       */
      round: function() {
        return new $.SelectionRect(
          Math.round(this.x),
          Math.round(this.y),
          Math.round(this.width),
          Math.round(this.height),
          this.rotation
        );
      },
      /**
       * Fixes negative width/height, rotation larger than PI
       * @function
       * @returns {SelectionRect} The normalized rect
       */
      normalize: function() {
        var fixed = this.clone();
        if (fixed.width < 0) {
          fixed.x += fixed.width;
          fixed.width *= -1;
        }
        if (fixed.height < 0) {
          fixed.y += fixed.height;
          fixed.height *= -1;
        }
        fixed.rotation %= Math.PI;
        return fixed;
      },
      /**
       * @function
       * @param {OpenSeadragon.Rect} area
       * @returns {Boolean} Does this rect fit in a specified area
       */
      fitsIn: function(area) {
        var rect = this.normalize();
        var corners = [
          rect.getTopLeft(),
          rect.getTopRight(),
          rect.getBottomRight(),
          rect.getBottomLeft()
        ];
        var center = rect.getCenter();
        var rotation = rect.getDegreeRotation();
        var areaEnd = area.getBottomRight();
        for (var i = 0; i < 4; i++) {
          corners[i] = corners[i].rotate(rotation, center);
          if (corners[i].x < area.x || corners[i].x > areaEnd.x || corners[i].y < area.y || corners[i].y > areaEnd.y) {
            return false;
          }
        }
        return true;
      },
      /**
       * Reduces rotation to within [-45, 45] degrees by swapping width & height
       * @function
       * @returns {SelectionRect} The altered rect
       */
      reduceRotation: function() {
        var reduced;
        if (this.rotation < Math.PI / -4) {
          reduced = this.swapWidthHeight();
          reduced.rotation += Math.PI / 2;
        } else if (this.rotation > Math.PI / 4) {
          reduced = this.swapWidthHeight();
          reduced.rotation -= Math.PI / 2;
        } else {
          reduced = this.clone();
        }
        return reduced;
      }
    });
  })(OpenSeadragon);

  // src/selection.js
  /**
  * @param {OpenSeadragon} $ OpenSeadragon base object.
  */
  (function($) {
    "use strict";
    if (!$.version || $.version.major < 5) {
      throw new Error("This version of OpenSeadragonSelection requires OpenSeadragon version 2.0.0+");
    }
    $.Viewer.prototype.selection = function(options) {
      if (!this.selectionInstance || options) {
        options = options || {};
        options.viewer = this;
        this.selectionInstance = new $.Selection(options);
      }
      return this.selectionInstance;
    };
    $.Selection = function(options) {
      $.extend(true, this, {
        // internal state properties
        viewer: null,
        isSelecting: false,
        buttonActiveImg: false,
        rectDone: true,
        // options
        element: null,
        toggleButton: null,
        showSelectionControl: true,
        showConfirmDenyButtons: true,
        styleConfirmDenyButtons: true,
        returnPixelCoordinates: true,
        keyboardShortcut: "c",
        rect: null,
        allowRotation: true,
        startRotated: false,
        // useful for rotated crops
        startRotatedHeight: 0.1,
        restrictToImage: false,
        cropMinimumSize: false,
        cropMinimumWidth: 0,
        cropMinimumHeight: 0,
        onSelection: null,
        prefixUrl: null,
        navImages: {
          selection: {
            REST: "selection_rest.png",
            GROUP: "selection_grouphover.png",
            HOVER: "selection_hover.png",
            DOWN: "selection_pressed.png"
          },
          selectionConfirm: {
            REST: "selection_confirm_rest.png",
            GROUP: "selection_confirm_grouphover.png",
            HOVER: "selection_confirm_hover.png",
            DOWN: "selection_confirm_pressed.png"
          },
          selectionCancel: {
            REST: "selection_cancel_rest.png",
            GROUP: "selection_cancel_grouphover.png",
            HOVER: "selection_cancel_hover.png",
            DOWN: "selection_cancel_pressed.png"
          }
        },
        borderStyle: {
          width: "1px",
          color: "#fff"
        },
        handleStyle: {
          top: "50%",
          left: "50%",
          width: "6px",
          height: "6px",
          margin: "-4px 0 0 -4px",
          background: "#000",
          border: "1px solid #ccc"
        },
        cornersStyle: {
          width: "6px",
          height: "6px",
          background: "#000",
          border: "1px solid #ccc"
        }
      }, options);
      $.extend(true, this.navImages, this.viewer.navImages);
      if (!this.element) {
        this.element = $.makeNeutralElement("div");
        this.element.style.background = "rgba(0, 0, 0, 0.1)";
        this.element.className = "selection-box";
      }
      this.borders = this.borders || [];
      let handle;
      this.corners = this.corners || [];
      const corners = this.corners;
      for (let i = 0; i < 4; i++) {
        if (!this.borders[i]) {
          this.borders[i] = $.makeNeutralElement("div");
          this.borders[i].className = "border-" + i;
          this.borders[i].style.position = "absolute";
          this.borders[i].style.width = this.borderStyle.width;
          this.borders[i].style.height = this.borderStyle.width;
          this.borders[i].style.background = this.borderStyle.color;
        }
        handle = $.makeNeutralElement("div");
        handle.className = "border-" + i + "-handle";
        handle.style.position = "absolute";
        handle.style.top = this.handleStyle.top;
        handle.style.left = this.handleStyle.left;
        handle.style.width = this.handleStyle.width;
        handle.style.height = this.handleStyle.height;
        handle.style.margin = this.handleStyle.margin;
        handle.style.background = this.handleStyle.background;
        handle.style.border = this.handleStyle.border;
        new $.MouseTracker({
          element: this.borders[i],
          dragHandler: onBorderDrag.bind(this, i),
          dragEndHandler: onBorderDragEnd.bind(this, i)
        });
        corners[i] = $.makeNeutralElement("div");
        corners[i].className = "corner-" + i + "-handle";
        corners[i].style.position = "absolute";
        corners[i].style.width = this.cornersStyle.width;
        corners[i].style.height = this.cornersStyle.height;
        corners[i].style.background = this.cornersStyle.background;
        corners[i].style.border = this.cornersStyle.border;
        new $.MouseTracker({
          element: corners[i],
          dragHandler: onBorderDrag.bind(this, i + 0.5),
          dragEndHandler: onBorderDragEnd.bind(this, i)
        });
        this.borders[i].appendChild(handle);
        this.element.appendChild(this.borders[i]);
        setTimeout(this.element.appendChild.bind(this.element, corners[i]), 0);
      }
      this.borders[0].style.top = 0;
      this.borders[0].style.width = "100%";
      this.borders[1].style.right = 0;
      this.borders[1].style.height = "100%";
      this.borders[2].style.bottom = 0;
      this.borders[2].style.width = "100%";
      this.borders[3].style.left = 0;
      this.borders[3].style.height = "100%";
      corners[0].style.top = "-3px";
      corners[0].style.left = "-3px";
      corners[1].style.top = "-3px";
      corners[1].style.right = "-3px";
      corners[2].style.bottom = "-3px";
      corners[2].style.right = "-3px";
      corners[3].style.bottom = "-3px";
      corners[3].style.left = "-3px";
      if (!this.overlay) {
        this.overlay = new $.SelectionOverlay(this.element, this.rect || new $.SelectionRect());
      }
      this.innerTracker = new $.MouseTracker({
        element: this.element,
        clickTimeThreshold: this.viewer.clickTimeThreshold,
        clickDistThreshold: this.viewer.clickDistThreshold,
        dragHandler: $.delegate(this, onInsideDrag),
        dragEndHandler: $.delegate(this, onInsideDragEnd),
        clickHandler: $.delegate(this, onClick)
      });
      this.viewer.addHandler("canvas-click", onClick.bind(this));
      this.viewer.addHandler("canvas-drag", onOutsideDrag.bind(this));
      this.viewer.addHandler("canvas-drag-end", onOutsideDragEnd.bind(this));
      if (this.keyboardShortcut) {
        $.addEvent(
          this.viewer.container,
          "keypress",
          $.delegate(this, onKeyPress),
          false
        );
      }
      const prefix = this.prefixUrl || this.viewer.prefixUrl || "";
      const useGroup = this.viewer.buttons && this.viewer.buttonGroup.buttons;
      const anyButton = useGroup ? this.viewer.buttonGroup.buttons[0] : null;
      const onFocusHandler = anyButton ? anyButton.onFocus : null;
      const onBlurHandler = anyButton ? anyButton.onBlur : null;
      if (this.showSelectionControl) {
        this.toggleButton = new $.Button({
          element: this.toggleButton ? $.getElement(this.toggleButton) : null,
          clickTimeThreshold: this.viewer.clickTimeThreshold,
          clickDistThreshold: this.viewer.clickDistThreshold,
          tooltip: $.getString("Tooltips.SelectionToggle") || "Toggle selection",
          srcRest: prefix + this.navImages.selection.REST,
          srcGroup: prefix + this.navImages.selection.GROUP,
          srcHover: prefix + this.navImages.selection.HOVER,
          srcDown: prefix + this.navImages.selection.DOWN,
          onRelease: this.toggleState.bind(this),
          onFocus: onFocusHandler,
          onBlur: onBlurHandler
        });
        if (useGroup) {
          this.viewer.buttonGroup.buttons.push(this.toggleButton);
          this.viewer.buttonGroup.element.appendChild(this.toggleButton.element);
        }
        if (this.toggleButton.imgDown) {
          this.buttonActiveImg = this.toggleButton.imgDown.cloneNode(true);
          this.toggleButton.element.appendChild(this.buttonActiveImg);
        }
      }
      if (this.showConfirmDenyButtons) {
        this.confirmButton = new $.Button({
          element: this.confirmButton ? $.getElement(this.confirmButton) : null,
          clickTimeThreshold: this.viewer.clickTimeThreshold,
          clickDistThreshold: this.viewer.clickDistThreshold,
          tooltip: $.getString("Tooltips.SelectionConfirm") || "Confirm selection",
          srcRest: prefix + this.navImages.selectionConfirm.REST,
          srcGroup: prefix + this.navImages.selectionConfirm.GROUP,
          srcHover: prefix + this.navImages.selectionConfirm.HOVER,
          srcDown: prefix + this.navImages.selectionConfirm.DOWN,
          onRelease: this.confirm.bind(this),
          onFocus: onFocusHandler,
          onBlur: onBlurHandler
        });
        const confirm = this.confirmButton.element;
        confirm.classList.add("confirm-button");
        confirm.style.cursor = "pointer";
        this.element.appendChild(confirm);
        this.cancelButton = new $.Button({
          element: this.cancelButton ? $.getElement(this.cancelButton) : null,
          clickTimeThreshold: this.viewer.clickTimeThreshold,
          clickDistThreshold: this.viewer.clickDistThreshold,
          tooltip: $.getString("Tooltips.SelectionCancel") || "Cancel selection",
          srcRest: prefix + this.navImages.selectionCancel.REST,
          srcGroup: prefix + this.navImages.selectionCancel.GROUP,
          srcHover: prefix + this.navImages.selectionCancel.HOVER,
          srcDown: prefix + this.navImages.selectionCancel.DOWN,
          onRelease: this.cancel.bind(this),
          onFocus: onFocusHandler,
          onBlur: onBlurHandler
        });
        const cancel = this.cancelButton.element;
        cancel.classList.add("cancel-button");
        cancel.style.cursor = "pointer";
        this.element.appendChild(cancel);
        if (this.styleConfirmDenyButtons) {
          confirm.style.position = "absolute";
          confirm.style.top = "50%";
          confirm.style.left = "50%";
          confirm.style.transform = "translate(-100%, -50%)";
          cancel.style.position = "absolute";
          cancel.style.top = "50%";
          cancel.style.left = "50%";
          cancel.style.transform = "translate(0, -50%)";
        }
      }
      this.viewer.addHandler("selection", this.onSelection);
      this.viewer.addHandler("open", this.draw.bind(this));
      this.viewer.addHandler("animation", this.draw.bind(this));
      this.viewer.addHandler("resize", this.draw.bind(this));
      this.viewer.addHandler("rotate", this.draw.bind(this));
    };
    $.extend(
      $.Selection.prototype,
      $.ControlDock.prototype,
      /** @lends OpenSeadragon.Selection.prototype */
      {
        toggleState: function() {
          return this.setState(!this.isSelecting);
        },
        setState: function(enabled) {
          this.isSelecting = enabled;
          if (enabled) {
            this.draw();
          } else {
            this.undraw();
          }
          if (this.buttonActiveImg) {
            this.buttonActiveImg.style.visibility = enabled ? "visible" : "hidden";
          }
          this.viewer.raiseEvent("selection_toggle", { enabled });
          return this;
        },
        setAllowRotation: function(allowRotation) {
          this.allowRotation = allowRotation;
        },
        enable: function() {
          return this.setState(true);
        },
        disable: function() {
          return this.setState(false);
        },
        draw: function() {
          if (this.rect) {
            this.overlay.update(this.rect.normalize());
            this.overlay.drawHTML(this.viewer.drawer.container, this.viewer.viewport);
            updateSelectionCursors(this);
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
            let result = this.rect.normalize();
            if (this.returnPixelCoordinates) {
              let real = this.viewer.viewport.viewportToImageRectangle(result);
              real = $.SelectionRect.fromRect(real).round();
              real.rotation = result.rotation;
              result = real;
            }
            this.viewer.raiseEvent("selection", result);
            this.undraw();
          }
          return this;
        },
        cancel: function() {
          this.viewer.raiseEvent("selection_cancel", false);
          return this.undraw();
        }
      }
    );
    function checkMinimumRect(self) {
      if (self.cropMinimumSize === true) {
        const minPoint = self.viewer.viewport.imageToViewportCoordinates(self.cropMinimumWidth, self.cropMinimumHeight);
        self.rect.width = self.rect.width < minPoint.x ? minPoint.x : self.rect.width;
        self.rect.height = self.rect.height < minPoint.y ? minPoint.y : self.rect.height;
      }
    }
    function onOutsideDrag(e) {
      if (!this.isSelecting) {
        return;
      }
      e.preventDefaultAction = true;
      const delta = this.viewer.viewport.deltaPointsFromPixels(e.delta, true);
      const end = this.viewer.viewport.pointFromPixel(e.position, true);
      const start = new $.Point(end.x - delta.x, end.y - delta.y);
      if (!this.rect) {
        if (this.restrictToImage) {
          if (!pointIsInImage(this, start)) {
            return;
          }
          restrictVector(delta, end);
        }
        if (this.startRotated) {
          this.rotatedStartPoint = start;
          this.rect = getPrerotatedRect(start, end, this.startRotatedHeight);
        } else {
          this.rect = new $.SelectionRect(start.x, start.y, delta.x, delta.y);
        }
        this.rectDone = false;
      } else {
        let oldRect;
        if (this.restrictToImage || this.cropMinimumSize) {
          oldRect = this.rect.clone();
        }
        if (this.rectDone) {
          if (this.allowRotation) {
            const angle1 = this.rect.getAngleFromCenter(start);
            const angle2 = this.rect.getAngleFromCenter(end);
            this.rect.rotation = (this.rect.rotation + angle1 - angle2) % Math.PI;
          }
        } else {
          if (this.startRotated) {
            this.rect = getPrerotatedRect(this.rotatedStartPoint, end, this.startRotatedHeight);
          } else {
            this.rect.width += delta.x;
            this.rect.height += delta.y;
          }
        }
        const bounds = this.viewer.world.getHomeBounds();
        if (this.restrictToImage && !this.rect.fitsIn(new $.Rect(0, 0, bounds.width, bounds.height))) {
          this.rect = oldRect;
        }
      }
      checkMinimumRect(this);
      this.draw();
    }
    function onOutsideDragEnd() {
      if (this.rect === null) {
        return;
      }
      if (this.rect.width < 0) {
        this.rect.x += this.rect.width;
        this.rect.width = Math.abs(this.rect.width);
      }
      if (this.rect.height < 0) {
        this.rect.y += this.rect.height;
        this.rect.height = Math.abs(this.rect.height);
      }
      this.viewer.setMouseNavEnabled(true);
      this.rectDone = true;
    }
    function onClick() {
      this.viewer.canvas.focus();
    }
    function onInsideDrag(e) {
      $.addClass(this.element, "dragging");
      const delta = this.viewer.viewport.deltaPointsFromPixels(e.delta, true);
      this.rect.x += delta.x;
      this.rect.y += delta.y;
      const bounds = this.viewer.world.getHomeBounds();
      if (this.restrictToImage && !this.rect.fitsIn(new $.Rect(0, 0, bounds.width, bounds.height))) {
        this.rect.x -= delta.x;
        this.rect.y -= delta.y;
      }
      checkMinimumRect(this);
      this.draw();
    }
    function onInsideDragEnd() {
      $.removeClass(this.element, "dragging");
    }
    function onBorderDrag(border, e) {
      const rotation = this.rect.getDegreeRotation();
      const oldRect = this.restrictToImage || this.cropMinimumSize ? this.rect.clone() : null;
      let delta = e.delta;
      let center;
      if (rotation !== 0) {
        delta = delta.rotate(-1 * rotation, new $.Point(0, 0));
        center = this.rect.getCenter();
      }
      delta = this.viewer.viewport.deltaPointsFromPixels(delta, true);
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
        case 0.5:
          this.rect.y += delta.y;
          this.rect.height -= delta.y;
          this.rect.x += delta.x;
          this.rect.width -= delta.x;
          break;
        case 1.5:
          this.rect.y += delta.y;
          this.rect.height -= delta.y;
          this.rect.width += delta.x;
          break;
        case 2.5:
          this.rect.width += delta.x;
          this.rect.height += delta.y;
          break;
        case 3.5:
          this.rect.height += delta.y;
          this.rect.x += delta.x;
          this.rect.width -= delta.x;
          break;
      }
      if (rotation !== 0) {
        const newCenter = this.rect.getCenter();
        const target = newCenter.rotate(rotation, center);
        delta = target.minus(newCenter);
        this.rect.x += delta.x;
        this.rect.y += delta.y;
      }
      const bounds = this.viewer.world.getHomeBounds();
      if (this.restrictToImage && !this.rect.fitsIn(new $.Rect(0, 0, bounds.width, bounds.height))) {
        this.rect = oldRect;
      }
      checkMinimumRect(this);
      this.draw();
    }
    function onBorderDragEnd() {
      if (this.rect.width < 0) {
        this.rect.x += this.rect.width;
        this.rect.width = Math.abs(this.rect.width);
      }
      if (this.rect.height < 0) {
        this.rect.y += this.rect.height;
        this.rect.height = Math.abs(this.rect.height);
      }
    }
    function onKeyPress(e) {
      const key = e.keyCode ? e.keyCode : e.charCode;
      if (key === 13) {
        this.confirm();
      } else if (String.fromCharCode(key) === this.keyboardShortcut) {
        this.toggleState();
      }
    }
    function getPrerotatedRect(start, end, height) {
      if (start.x > end.x) {
        const x = start;
        start = end;
        end = x;
      }
      const delta = end.minus(start);
      const dist = start.distanceTo(end);
      const angle = -1 * Math.atan2(delta.x, delta.y) + Math.PI / 2;
      const center = new $.Point(
        delta.x / 2 + start.x,
        delta.y / 2 + start.y
      );
      const rect = new $.SelectionRect(
        center.x - dist / 2,
        center.y - height / 2,
        dist,
        height,
        angle
      );
      let heightModDelta = new $.Point(0, height);
      heightModDelta = heightModDelta.rotate(rect.getDegreeRotation(), new $.Point(0, 0));
      rect.x += heightModDelta.x / 2;
      rect.y += heightModDelta.y / 2;
      return rect;
    }
    function pointIsInImage(self, point) {
      const bounds = self.viewer.world.getHomeBounds();
      return point.x >= 0 && point.x <= bounds.width && point.y >= 0 && point.y <= bounds.height;
    }
    function restrictVector(delta, end) {
      let start;
      for (const prop in { x: 0, y: 0 }) {
        start = end[prop] - delta[prop];
        if (start < 1 && start > 0) {
          if (end[prop] > 1) {
            delta[prop] -= end[prop] - 1;
            end[prop] = 1;
          } else if (end[prop] < 0) {
            delta[prop] -= end[prop];
            end[prop] = 0;
          }
        }
      }
    }
    function updateSelectionCursors(self) {
      if (!self || !self.element) return;
      self.element.style.cursor = "move";
      if (self.borders && self.borders.length === 4) {
        self.borders[0].style.cursor = "ns-resize";
        self.borders[1].style.cursor = "ew-resize";
        self.borders[2].style.cursor = "ns-resize";
        self.borders[3].style.cursor = "ew-resize";
      }
      if (self.corners && self.corners.length === 4) {
        self.corners[0].style.cursor = "nwse-resize";
        self.corners[1].style.cursor = "nesw-resize";
        self.corners[2].style.cursor = "nwse-resize";
        self.corners[3].style.cursor = "nesw-resize";
      }
    }
  })(OpenSeadragon);
})();
//# sourceMappingURL=openseadragonselection.js.map
