(function ($) {
    'use strict';

    /**
     * @class SelectionRect
     * @classdesc A display rectangle is very similar to {@link OpenSeadragon.Rect} but adds rotation
     * around the center point
     *
     * @memberof OpenSeadragon
     * @extends OpenSeadragon.Rect
     * @param {Number} [x=0] The vector component 'x'.
     * @param {Number} [y=0] The vector component 'y'.
     * @param {Number} [width=0] The vector component 'height'.
     * @param {Number} [height=0] The vector component 'width'.
     * @param {Number} [rotation=0] The rotation in radians
     */
    $.SelectionRect = function (x, y, width, height, rotation) {
        $.Rect.apply(this, [x, y, width, height]);

        /**
         * The rotation in radians
         * @member {Number} rotation
         * @memberof OpenSeadragon.SelectionRect#
         */
        this.rotation = rotation || 0;
    };

    $.SelectionRect.fromRect = function (rect) {
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
         * @returns {SelectionRect} a duplicate of this Rect
         */
        clone: function () {
            return new $.SelectionRect(this.x, this.y, this.width, this.height, this.rotation);
        },

        /**
         * Determines if two Rectangles have equivalent components.
         * @function
         * @param {SelectionRect} other The Rectangle to compare to.
         * @return {boolean} 'true' if all components are equal, otherwise 'false'.
         */
        equals: function (other) {
            return $.Rect.prototype.equals.apply(this, [other]) &&
                (this.rotation === other.rotation);
        },

        /**
         * Provides a string representation of the rectangle which is useful for
         * debugging.
         * @function
         * @returns {string} A string representation of the rectangle.
         */
        toString: function () {
            return '[' +
                (Math.round(this.x * 100) / 100) + ',' +
                (Math.round(this.y * 100) / 100) + ',' +
                (Math.round(this.width * 100) / 100) + 'x' +
                (Math.round(this.height * 100) / 100) + '@' +
                (Math.round(this.rotation * 100) / 100) +
                ']';
        },

        swapWidthHeight: function () {
            const swapped = this.clone();

            swapped.width = this.height;
            swapped.height = this.width;

            swapped.x += (this.width - this.height) / 2;
            swapped.y += (this.height - this.width) / 2;

            return swapped;
        },

        /**
         * @function
         * @returns {number} The rotation in degrees
         */
        getDegreeRotation: function () {
            return this.rotation * (180 / Math.PI);
        },

        /**
         * @function
         * @param {OpenSeadragon.Point} point
         * @returns {number} The angle in radians
         */
        getAngleFromCenter: function (point) {
            const diff = point.minus(this.getCenter());
            return Math.atan2(diff.x, diff.y);
        },

        /**
         * Rounds pixel coordinates
         * @function
         * @returns {SelectionRect} The altered rect
         */
        round: function () {
            return new $.SelectionRect(
                Math.round(this.x),
                Math.round(this.y),
                Math.round(this.width),
                Math.round(this.height),
                this.rotation
            );
        },

        /**
         * Clones the current rect and fixes negative width/height and rotation larger than PI
         * @function
         * @returns {SelectionRect} Cloned normalized rect.
         */
        normalize: function () {
            const fixed = this.clone();

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
         * @returns {boolean} Does this rect fit in a specified area
         */
        fitsIn: function (area) {
            const rect = this.normalize();

            const corners = [
                rect.getTopLeft(),
                rect.getTopRight(),
                rect.getBottomRight(),
                rect.getBottomLeft(),
            ];

            const center = rect.getCenter();
            const rotation = rect.getDegreeRotation();
            const areaEnd = area.getBottomRight();

            for (let i = 0; i < 4; i++) {
                corners[i] = corners[i].rotate(rotation, center);
                if (corners[i].x < area.x || corners[i].x > areaEnd.x ||
                    corners[i].y < area.y || corners[i].y > areaEnd.y) {
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
        reduceRotation: function () {
            let reduced;

            if (this.rotation < Math.PI / (-4)) {
                reduced = this.swapWidthHeight();
                reduced.rotation += Math.PI / 2;
            } else if (this.rotation > Math.PI / 4) {
                reduced = this.swapWidthHeight();
                reduced.rotation -= Math.PI / 2;
            } else {
                reduced = this.clone();
            }

            return reduced;
        },
    });

}(OpenSeadragon));
