/**
 * @file Manages SVG gradient elements.
 * @author Zhang Wenli
 */

define(function (require) {

    var Definable = require('./Definable');
    var zrUtil = require('../../core/util');
    var zrLog = require('../../core/log');

    /**
     * Manages SVG gradient elements.
     *
     * @class
     * @extends Definable
     * @param   {SVGElement} svgRoot root of SVG document
     */
    function GradientManager(svgRoot) {
        Definable.call(
            this,
            svgRoot,
            ['linearGradient', 'radialGradient'],
            '__gradient_in_use__'
        );
    }


    zrUtil.inherits(GradientManager, Definable);


    /**
     * Create new gradient DOM for fill or stroke if not exist,
     * but will not update gradient if exists.
     *
     * @param {SvgElement}  svgElement   SVG element to paint
     * @param {Displayable} displayable  zrender displayable element
     */
    GradientManager.prototype.addWithoutUpdate = function (
        svgElement,
        displayable
    ) {
        if (displayable && displayable.style) {
            var that = this;
            zrUtil.each(['fill', 'stroke'], function (fillOrStroke) {
                if (displayable.style[fillOrStroke]
                    && (displayable.style[fillOrStroke].type === 'linear'
                    || displayable.style[fillOrStroke].type === 'radial')
                ) {
                    var gradient = displayable.style[fillOrStroke];
                    var defs = that.getDefs(true);

                    // Create dom in <defs> if not exists
                    var dom;
                    if (gradient._dom) {
                        // Gradient exists
                        dom = gradient._dom;
                        if (!defs.contains(gradient._dom)) {
                            // _dom is no longer in defs, recreate
                            that.addDom(dom);
                        }
                    }
                    else {
                        // New dom
                        dom = that.add(gradient);
                    }

                    that.markUsed(displayable);

                    var id = dom.getAttribute('id');
                    svgElement.setAttribute(fillOrStroke, 'url(#' + id + ')');
                }
            });
        }
    };


    /**
     * Add a new gradient tag in <defs>
     *
     * @param   {Gradient} gradient zr gradient instance
     * @return {SVGLinearGradientElement | SVGRadialGradientElement}
     *                            created DOM
     */
    GradientManager.prototype.add = function (gradient) {
        var dom;
        if (gradient.type === 'linear') {
            dom = this.createElement('linearGradient');
        }
        else if (gradient.type === 'radial') {
            dom = this.createElement('radialGradient');
        }
        else {
            zrLog('Illegal gradient type.');
            return null;
        }

        // Set dom id with gradient id, since each gradient instance
        // will have no more than one dom element.
        // id may exists before for those dirty elements, in which case
        // id should remain the same, and other attributes should be
        // updated.
        gradient.id = gradient.id || this.nextId++;
        dom.setAttribute('id', 'zr-gradient-' + gradient.id);

        this.updateDom(gradient, dom);
        this.addDom(dom);

        return dom;
    };


    /**
     * Update gradient.
     *
     * @param {Gradient} gradient zr gradient instance
     */
    GradientManager.prototype.update = function (gradient) {
        var that = this;
        Definable.prototype.update.call(this, gradient, function () {
            var type = gradient.type;
            var tagName = gradient._dom.tagName;
            if (type === 'linear' && tagName === 'linearGradient'
                || type === 'radial' && tagName === 'radialGradient'
            ) {
                // Gradient type is not changed, update gradient
                that.updateDom(gradient, gradient._dom);
            }
            else {
                // Remove and re-create if type is changed
                that.removeDom(gradient);
                that.add(gradient);
            }
        });
    };


    /**
     * Update gradient dom
     *
     * @param {Gradient} gradient zr gradient instance
     * @param {SVGLinearGradientElement | SVGRadialGradientElement} dom
     *                            DOM to update
     */
    GradientManager.prototype.updateDom = function (gradient, dom) {
        if (gradient.type === 'linear') {
            dom.setAttribute('x1', gradient.x);
            dom.setAttribute('y1', gradient.y);
            dom.setAttribute('x2', gradient.x2);
            dom.setAttribute('y2', gradient.y2);
        }
        else if (gradient.type === 'radial') {
            dom.setAttribute('cx', gradient.x);
            dom.setAttribute('cy', gradient.y);
            dom.setAttribute('r', gradient.r);
        }
        else {
            zrLog('Illegal gradient type.');
            return;
        }

        if (gradient.global) {
            // x1, x2, y1, y2 in range of 0 to canvas width or height
            dom.setAttribute('gradientUnits', 'userSpaceOnUse');
        }
        else {
            // x1, x2, y1, y2 in range of 0 to 1
            dom.setAttribute('gradientUnits', 'objectBoundingBox');
        }

        // Remove color stops if exists
        dom.innerHTML = '';

        // Add color stops
        var colors = gradient.colorStops;
        for (var i = 0, len = colors.length; i < len; ++i) {
            var stop = this.createElement('stop');
            stop.setAttribute('offset', colors[i].offset * 100 + '%');
            stop.setAttribute('stop-color', colors[i].color);
            dom.appendChild(stop);
        }

        // Store dom element in gradient, to avoid creating multiple
        // dom instances for the same gradient element
        gradient._dom = dom;
    };

    /**
     * Mark a single gradient to be used
     *
     * @param {Displayable} displayable displayable element
     */
    GradientManager.prototype.markUsed = function (displayable) {
        if (displayable.style) {
            var gradient = displayable.style.fill;
            if (gradient && gradient._dom) {
                Definable.prototype.markUsed.call(this, gradient._dom);
            }

            gradient = displayable.style.stroke;
            if (gradient && gradient._dom) {
                Definable.prototype.markUsed.call(this, gradient._dom);
            }
        }
    };


    return GradientManager;

});
