(function( $ ){
    'use strict';

    /**
     * @class SelectionRect
     * @classdesc A display rectangle is very similar to {@link OpenSeadragon.Rect} but adds rotation
     * around the center point
     *
     * @memberof OpenSeadragon
     * @extends OpenSeadragon.Rect
     * @param {Number} x The vector component 'x'.
     * @param {Number} y The vector component 'y'.
     * @param {Number} width The vector component 'height'.
     * @param {Number} height The vector component 'width'.
     * @param {Number} rotation The rotation in radians
     */
    $.SelectionRect = function( x, y, width, height, rotation ) {
        $.Rect.apply( this, [ x, y, width, height ] );

        /**
         * The rotation in radians
         * @member {Number} rotation
         * @memberof OpenSeadragon.SelectionRect#
         */
        this.rotation = rotation || 0;
    };

    $.SelectionRect.prototype = $.extend( Object.create($.Rect.prototype), {

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
        equals: function( other ) {
            return $.Rect.prototype.equals.apply(this, [ other ]) &&
                ( this.rotation === other.rotation );
        },

        /**
         * Provides a string representation of the rectangle which is useful for
         * debugging.
         * @function
         * @returns {String} A string representation of the rectangle.
         */
        toString: function() {
            return '[' +
                (Math.round(this.x*100) / 100) + ',' +
                (Math.round(this.y*100) / 100) + ',' +
                (Math.round(this.width*100) / 100) + 'x' +
                (Math.round(this.height*100) / 100) + '@' +
                (Math.round(this.rotation*100) / 100) +
            ']';
        }
    });

}( OpenSeadragon ));
