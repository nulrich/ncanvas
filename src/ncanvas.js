var $nc = function(canvas, attr) {

    var has = "hasOwnProperty";

    var nc = {};
    var nc_objs = [];
    var nc_canvas = canvas;
    var nc_context = nc_canvas.getContext("2d");
    var nc_attr = attr || {};

    // Animation
    var idle = true;
    var animate = false;
    var nc_animations = [];

    // Mouse events
    var mouseIsDown = 0;
    var mouseIsOver = 0;
    var canX = 0;
    var canY = 0;

    nc_canvas.onmouseup = function(e) {
        mouseIsDown = 0;
    };

    nc_canvas.onmousedown = function(e) {
        if (mouseIsDown) { 
            return; 
        }
        mouseIsDown = 1;
        nc_update_pointer_coord(e);
        nc_repaint(); // nc_repath!
    };

    nc_canvas.onmouseover = function(e) {
        mouseIsOver = 1;
    };

    nc_canvas.onmouseout = function(e) {
        mouseIsOver = 0;
    };

    nc_canvas.onmousemove = function(e) {
        nc_update_pointer_coord(e);
        nc_repaint();
    };

    function nc_update_pointer_coord(e) {
        canX = e.pageX - nc_canvas.offsetLeft;
        canY = e.pageY - nc_canvas.offsetTop;
    }

    function nc_append(obj) {
        nc_objs.push(obj);
        return obj;
    }

    function nc_append_animation(animation) {
        nc_animations.push(animation);
        return animation;
    }

    function nc_remove(obj) {
        if (obj === undefined){
            return;
        }
        var index = nc_objs.indexOf(obj);
        if (index === -1) {
            return;
        }
        nc_objs.splice(index, 1);
    }

    function nc_remove_animation(anim) {
        if (anim === undefined) {
            return;
        }
        var index = nc_animations.indexOf(anim);
        if (index === -1) {
            return;
        }
        nc_animations.splice(index, 1);
    }

    function nc_animation(fun) {

        var animation = {
            isRunning: true
        };

        animation.tick = fun;

        return animation;

    }

    function nc_translate(x, y) {
        nc_context.translate(x, y);
    }

    function nc_rotate(obj, angle) {

        // Center of line
        var center = obj.getCenter();

        var t_x = center[0];
        var t_y = center[1];

        // Go to center, rotate, go back
        nc_context.translate(t_x, t_y);
        nc_context.rotate(angle * (Math.PI / 180));
        nc_context.translate(-t_x, - t_y);

    }

    function nc_scale(obj, x, y) {

        var center = obj.getCenter();

        var t_x = center[0];
        var t_y = center[1];

        // Go to center, scale, go back
        nc_context.translate(t_x, t_y);
        nc_context.scale(x, y);
        nc_context.translate(-t_x, - t_y);

    }

    function nc_layer(x, y, width, height) {

        //A layer is a rect with objects inside.
        var layer = nc_rect(x, y, width, height);
        var layer_objs = [];

        layer.attr.type = "layer";

        layer.draw = function(path) {

            nc_context.save();
            layer.applyTransformation();

            nc_set_style(layer.attr);

            // TODO: Rotation of points not of canvas AND clean with setTransformation
            if (layer.attr.angle !== undefined) {
                nc_rotate(layer, layer.attr.angle);
            }
            nc_draw(layer_objs);

            // Draw path without stroke for mouse detection in the layer
            nc_context.beginPath();
            nc_context.rect(layer.attr.x, layer.attr.y, layer.attr.width, layer.attr.height);
            nc_context.closePath();

            nc_context.restore();

        };

        layer.rect = function(x, y, w, h) {
            var rect = nc_rect(x, y, w, h);
            layer_objs.push(rect);
            return rect;
        };

        return layer;
    }

    function nc_obj() {

        var obj = {};
        var transformations = [];
        var transitions = {};
        var gradient = {};

        obj.attr = {
            visible: true,
            stroke: false,
            fill: true,
            font: 'italic 30px verdana'
        };

        obj.tick = function(fun) {
            obj.onTick = fun;
        };

        obj.onMouseDown = function(fun) {
            obj.down = fun;
        };

        obj.onMouseOver = function(fun) {
            obj.over = fun;
        };

        obj.onMouseOut = function(fun) {
            obj.out = fun;
        };

        obj.applyTransformation = function() {
            // Apply Transformations animate		
            for (var i in transformations) {
                transformations[i]();
            }
        };

        obj.translate = function(x, y) {
            obj_addTransformation(function() {
                nc_translate(x, y);
            });
            return obj;
        };

        obj.rotate = function(angle) {
            obj_addTransformation(function() {
                nc_rotate(obj, angle);
            });
            return obj;
        };

        obj.scale = function(x, y) {
            obj_addTransformation(function() {
                nc_scale(obj, x, y);
            });
            return obj;
        };

        obj.transition = function(attributes, offset, fun) {

            if (typeof offset === 'function') {
                fun = offset;
                offset = 1;
            }

            if (offset === undefined) {
                offset = 1;
            }

            for (var prop in attributes) {

                // Create transition animation
                var anim = nc_animation(obj_createTransition(attributes, prop, fun, offset));

                // If animation is already running for this property, stop it
                if (transitions[has](prop)) {
                    nc_remove_animation(transitions[prop]);
                    delete transitions[prop];
                }

                transitions[prop] = anim;
                nc_append_animation(anim);

                fun = undefined; // ugly, to call fun only once
            }

            nc_repaint();
            return obj;

        };

        obj.attribute = function(attr) {
            for (var k in attr) {
                obj.attr[k] = attr[k];
            }
            return obj;
        };

        obj.getCenter = function() {
            return [0, 0];
        };

        function obj_createTransition(attributes, prop, fun, offset) {

            offset = attributes[prop] > obj.attr[prop] ? offset : -offset;
            var diff = Math.abs(obj.attr[prop] - attributes[prop]);
            var loops = Math.abs(Math.round(diff / offset));
            var i = 0;

            return function(ann) {

                if (i++ === loops) {
                    // Last call, set to final value, call fun if exist and remove animation
                    obj.attr[prop] = attributes[prop];
                    if (fun !== undefined) {
                        fun.apply(obj, [prop]);
                    }
                    return nc_remove_animation(ann);
                }
                obj.attr[prop] = obj.attr[prop] + offset;
            };

        }

        function obj_addTransformation(transformation) {
            transformations.push(transformation);
        }

        return obj;

    }

    function nc_set_style(attr) {

        if (attr[has]('strokeStyle')) {
            nc_context.strokeStyle = attr.strokeStyle;
        }

        if (attr[has]('fillStyle')) {
            nc_context.fillStyle = attr.fillStyle;
        }

        if (attr[has]('lineWidth')) {
            nc_context.lineWidth = attr.lineWidth;
        }

        if (attr[has]('lineCap')) {
            nc_context.lineCap = attr.lineCap;
        }

        if (attr[has]('lineJoin')) {
            nc_context.lineJoin = attr.lineJoin;
        }

        if (attr[has]('globalAlpha')) {
            nc_context.globalAlpha = attr.globalAlpha;
        }

        if (attr[has]('shadowColor')) {
            nc_context.shadowColor = attr.shadowColor;
        }

        if (attr[has]('shadowBlur')) {
            nc_context.shadowBlur = attr.shadowBlur;
        }

        if (attr[has]('shadowOffsetX')) {
            nc_context.shadowOffsetX = attr.shadowOffsetX;
        }

        if (attr[has]('shadowOffsetY')) {
            nc_context.shadowOffsetY = attr.shadowOffsetY;
        }

        if (attr[has]('font')) {
            nc_context.font = attr.font;
        }

        if (attr[has]('textBaseline')) {
            nc_context.textBaseline = attr.textBaseline;
        }

        if (attr[has]('textAlign')) {
            nc_context.textAlign = attr.textAlign;
        }

        if (attr[has]('globalCompositeOperation')) {
            nc_context.globalCompositeOperation = attr.globalCompositeOperation;
        }



    }

    function nc_line(s_x, s_y, e_x, e_y) {

        var line = nc_obj();

        line.attr.type = "line";
        line.attr.s_x = s_x;
        line.attr.s_y = s_y;
        line.attr.e_x = e_x;
        line.attr.e_y = e_y;

        line.draw = function(path) {

            nc_context.save();

            nc_set_style(line.attr);
            line.applyTransformation();

            nc_context.beginPath();
            nc_context.moveTo(line.attr.s_x, line.attr.s_y);
            nc_context.lineTo(line.attr.e_x, line.attr.e_y);

            if (!path) {
                nc_context.stroke();
            }

            nc_context.restore();

        };

        line.getCenter = function() {
            var t_x = Math.abs((line.attr.s_x - line.attr.d_x) / 2);
            var t_y = Math.abs((line.attr.s_y - line.attr.d_y) / 2);
            return [t_x, t_y];
        };

        return line;

    }

    function nc_rect(x, y, width, height) {

        var rect = nc_obj();
        rect.attr.type = "rect";
        rect.attr.x = x;
        rect.attr.y = y;
        rect.attr.width = width;
        rect.attr.height = height;

        rect.draw = function(path) {

            nc_context.save();
            rect.applyTransformation();

            nc_set_style(this.attr);

            // TODO: Rotation of points not of canvas
            if (rect.attr.angle !== undefined) {
                nc_rotate(this, rect.attr.angle);
            }

            nc_context.beginPath();
            nc_context.rect(this.attr.x, this.attr.y, this.attr.width, this.attr.height);
            nc_context.closePath();

            if (rect.attr.stroke && !path) {
                nc_context.stroke();
            }
            if (rect.attr.fill && !path) {
                nc_context.fill();
            }

            nc_context.restore();

        };

        rect.getCenter = function() {
            var t_x = rect.attr.x + rect.attr.width / 2;
            var t_y = rect.attr.y + rect.attr.height / 2;
            return [t_x, t_y];
        };

        return rect;
    }

    function nc_text(x, y, str) {

        var text = nc_obj();

        text.attr.type = "text";
        text.attr.x = x;
        text.attr.y = y;
        text.attr.txt = str;

        text.draw = function(path) {

            if (path) {
                return;
            }

            nc_context.save();

            nc_set_style(this.attr);

            text.applyTransformation();

            if (text.attr.fill && !path) {
                nc_context.fillText(text.attr.txt, x, y);
            }

            nc_context.restore();

        };

        text.width = function() {
            return nc_context.measureText(text.attr.txt).width;			
        };

        return text;

    }

    function nc_path(strPath) {

        var path = nc_obj();

        path.attr.type = "path";

        path.draw = function(onlyPath) {

            nc_context.save();


            nc_set_style(this.attr);

            path.applyTransformation();

            nc_context.beginPath();

            var elems = strPath.match(/[A-Z][\s\d,-.]*/gi);
            for (var ii in elems) {
                var elem = elems[ii];
                pathEngine[elem[0]](elem.slice(1));
            }

            if (!onlyPath) {
                nc_context.stroke();
            }

            nc_context.restore();

        };

        return path;

    }

    function nc_circle(x, y, r, s, e) {

        var circle = nc_obj();

        circle.attr.type = "circle";
        circle.attr.x = x;
        circle.attr.y = y;
        circle.attr.r = r;
        circle.attr.s = s;
        circle.attr.e = e;

        circle.draw = function(path) {

            nc_context.save();

            nc_set_style(this.attr);

            circle.applyTransformation();

            /// replace by "renderGradient"
            if (this.attr[has]("gradient")) {
                var grad = nc_context.createRadialGradient(this.attr.x, this.attr.y, 0, this.attr.x, this.attr.y, this.attr.r);
                for (var i = 0; i < this.attr.gradient.steps.length; i++) {
                    grad.addColorStop(this.attr.gradient.steps[i], this.attr.gradient.colors[i]);
                }
                nc_context.fillStyle = grad;
            }
            /////

            nc_context.beginPath();

            var s = this.attr.s * (Math.PI / 180);
            var e = this.attr.e * (Math.PI / 180);


            if (this.attr.fill) {
                nc_context.lineTo(this.attr.x, this.attr.y);
            }

            nc_context.arc(this.attr.x, this.attr.y, this.attr.r, s, e);

            if (this.attr.fill) {
                nc_context.lineTo(this.attr.x, this.attr.y);
            }

            if (this.attr.stroke && !path) {
                nc_context.stroke();
            }
            if (this.attr.fill && !path) {
                nc_context.fill();
            }

            nc_context.restore();

        };

        return circle;

    }

    var now;
    var previous = Date.now();
    var interval = 1000 / 30;
    var elapsed;

    function nc_animate(timestamp) {

        // Idle, stop animation
        if (idle) {
            return;
        }

        window.requestNextAnimationFrame(nc_animate);

        now = Date.now();
        elapsed = now - previous;

        // Skip frame
        if (elapsed < interval && timestamp !== undefined) {
            return;	
        }

        // Todo: passing delta to function in order to correct animation
        previous = now - (elapsed % interval);

        nc_context.clearRect(0, 0, 1000, 1000);
        nc_context.save();
        nc_context.beginPath();

        // Run animations
        for (var i in nc_animations) {
            if (nc_animations[i].isRunning) {
                nc_animations[i].tick(nc_animations[i]);
            }
        }

        nc_set_style(nc_attr);

        // Draw shapes
        nc_draw(nc_objs);

        nc_context.restore();

        // If one animation running, no idle	
        idle = true;
        for (i in nc_animations) {
            if (nc_animations[i].isRunning) {
                idle = false;
                break;
            }
        }
    }

    function nc_draw(objs) {

        // Only path for detection 
        for (var i in objs) {

            var elem = objs[i];
            if (!elem.attr.visible) {
                continue;
            }

            elem.draw(true);

            if (mouseIsDown && nc_context.isPointInPath(canX, canY)) {
                if (elem.down !== undefined) {
                    // TODO prevent multiple calls + mouse up
                    elem.down(canX, canY);
                }
            }

            if (mouseIsOver && !elem.isOver && nc_context.isPointInPath(canX, canY)) {
                elem.isOver = true;
                if (elem.over !== undefined) {
                    elem.over();
                }
            }

            if (mouseIsOver && elem.isOver && !nc_context.isPointInPath(canX, canY)) {
                elem.isOver = false;
                if (elem.out !== undefined) {
                    elem.out();
                }
            }

        }

        // Again, but draw
        for (i in objs) {
            var elemToDraw = objs[i];
            if (elemToDraw.attr.visible) {
                elemToDraw.draw(false);
            }
        }
    }

    function log(text) {
        //console.log(text);
    }

    var pathEngine = {

        x: 0,
        y: 0,
        c_x1: 0,
        c_y1: 0,
        c_x2: 0,
        c_y2: 0,

        s_x2: 0,
        s_y2: 0,
        s_x1: 0,
        s_y1: 0,
        s_x: 0,
        s_y: 0,

        q_x1: 0,
        q_y1: 0,
        q_x: 0,
        q_y: 0,

        t_x1: 0,
        t_y1: 0,
        t_x: 0,
        t_y: 0,

        //Move
        M: function(elem) {
            var coord = elem.split(",");
            this.x = parseFloat(coord[0]);
            this.y = parseFloat(coord[1]);
            nc_context.moveTo(this.x, this.y);
            log("Move x:" + this.x + " y:" + this.y);
        },
        //Line
        L: function(elem) {
            var coord = parseCoord(elem);
            this.x = parseFloat(coord[0]);
            this.y = parseFloat(coord[1]);
            nc_context.lineTo(this.x, this.y);
            log("LineTo x:" + this.x + " y:" + this.y);
        },
        //Relative Line
        l: function(elem) {
            var coord = parseCoord(elem);
            this.x += parseFloat(coord[0]);
            this.y += parseFloat(coord[1]);
            nc_context.lineTo(this.x, this.y);
            log("lineTo x:" + this.x + " y:" + this.y);

        },
        //Close Path
        Z: function() {
            nc_context.closePath();
            log("Close Path");
        },
        //Relative Close Path
        z: function() {
            nc_context.closePath();
            log("Close Path");
        },
        //Vertical Line
        V: function(elem) {
            this.y = parseFloat(elem);
            nc_context.lineTo(this.x, this.y);
            log("Vertical x:" + this.x + " y:" + this.y);
        },
        //Relative Vertical Line
        v: function(elem) {
            this.y += parseFloat(elem);
            nc_context.lineTo(this.x, this.y);
            log("Vertical x:" + this.x + " y:" + this.y);
        },
        //Horizontal Line
        H: function(elem) {
            this.x = parseFloat(elem);
            nc_context.lineTo(this.x, this.y);
            log("Horizontal x:" + this.x + " y:" + this.y);
        },
        //Relative Horizontal Line
        h: function(elem) {
            this.x += parseFloat(elem);
            nc_context.lineTo(this.x, this.y);
            log("Horizontal x:" + this.x + " y:" + this.y);
        },
        //Cubic Bezier
        C: function(elem) {

            var list = elem.match(/\d*[,]\d*/gi);

            this.c_x1 = parseFloat(list[0].split(",")[0]);
            this.c_y1 = parseFloat(list[0].split(",")[1]);
            this.c_x2 = parseFloat(list[1].split(",")[0]);
            this.c_y2 = parseFloat(list[1].split(",")[1]);
            this.c_x = parseFloat(list[2].split(",")[0]);
            this.c_y = parseFloat(list[2].split(",")[1]);

            // Control 'S' line 1
            nc_context.moveTo(this.x, this.y);
            nc_context.lineTo(this.c_x1, this.c_y1);

            // Control 'S' line 2
            nc_context.moveTo(this.c_x, this.c_y);
            nc_context.lineTo(this.c_x2, this.c_y2);

            // Draw bezier
            nc_context.moveTo(this.x, this.y);
            nc_context.bezierCurveTo(this.c_x1, this.c_y1, this.c_x2, this.c_y2, this.c_x, this.c_y);

            log("Curve " + this.c_x1 + " " + this.c_y1 + " " + this.c_x2 + " " + this.c_y2 + " " + this.c_x + " " + this.c_y);

        },
        //Relative Cubic Bezier
        c: function(elem) {

            var list = elem.match(/\d*[,]\d*/gi);

            this.c_x1 = parseFloat(list[0].split(",")[0]);
            this.c_y1 = parseFloat(list[0].split(",")[1]);
            this.c_x2 = parseFloat(list[1].split(",")[0]);
            this.c_y2 = parseFloat(list[1].split(",")[1]);
            this.c_x = parseFloat(list[2].split(",")[0]);
            this.c_y = parseFloat(list[2].split(",")[1]);

            // Control 'S' line 1
            nc_context.moveTo(this.x, this.y);
            nc_context.lineTo(this.c_x1, this.c_y1);

            // Control 'S' line 2
            nc_context.moveTo(this.c_x, this.c_y);
            nc_context.lineTo(this.c_x2, this.c_y2);

            // Draw bezier
            nc_context.moveTo(this.x, this.y);
            nc_context.bezierCurveTo(this.c_x1, this.c_y1, this.c_x2, this.c_y2, this.c_x, this.c_y);

            log("Curve " + this._x1 + " " + this.c_y1 + " " + this.c_x2 + " " + this.c_y2 + " " + this.c_x + " " + this.c_y);

        },
        //Smooth Cubic Bezier
        S: function(elem) {

            var list = elem.match(/\d*[,]\d*/gi);

            // Set up 'S' control points
            this.s_x2 = parseFloat(list[0].split(",")[0]);
            this.s_y2 = parseFloat(list[0].split(",")[1]);
            this.s_x = parseFloat(list[1].split(",")[0]);
            this.s_y = parseFloat(list[1].split(",")[1]);

            // Setup new control point 
            // rotate second control point of previous curve 180° around previous curve ending		
            var coord = rotate(this.c_x2, this.c_y2, this.c_x, this.c_y, 180);
            this.s_x1 = parseFloat(coord[0]);
            this.s_y1 = parseFloat(coord[1]);

            // Control 'S' line 1
            nc_context.moveTo(this.c_x, this.c_y);
            nc_context.lineTo(this.s_x1, this.s_y1);

            // Control 'S' line 2
            nc_context.moveTo(this.s_x,this. s_y);
            nc_context.lineTo(this.s_x2, this.s_y2);

            // Draw 'S' bezier curve
            nc_context.moveTo(this.c_x, this.c_y);
            nc_context.bezierCurveTo(this.s_x1, this.s_y1,this. s_x2, this.s_y2, this.s_x, this.s_y);
            log("Curve " + this.s_x1 + " " + this.s_y1 + " " + this.s_x2 + " " + this.s_y2 + " " + this.s_x + " " + this.s_y);

        },
        Q: function(elem) {
            var list = elem.match(/\d*[,]\d*/gi);

            this.q_x1 = parseFloat(list[0].split(",")[0]);
            this.q_y1 = parseFloat(list[0].split(",")[1]);
            this.q_x = parseFloat(list[1].split(",")[0]);
            this.q_y = parseFloat(list[1].split(",")[1]);

            // Control 'Q' line 1
            nc_context.moveTo(this.x, this.y);
            nc_context.lineTo(this.q_x1, this.q_y1);

            // Control 'Q' line 2
            nc_context.moveTo(this.q_x1, this.q_y1);
            nc_context.lineTo(this.q_x, this.q_y);

            nc_context.moveTo(this.x, this.y);
            nc_context.quadraticCurveTo(this.q_x1, this.q_y1, this.q_x, this.q_y);
            log("Quadra " + list[0] + " " + list[1]);
        },
        T: function(elem) {

            var list = elem.match(/\d*[,]\d*/gi);

            // Set up 'T' control points
            this.t_x = parseFloat(list[0].split(",")[0]);
            this.t_y = parseFloat(list[0].split(",")[1]);

            // Setup new control points				
            var coord = rotate(this.q_x1, this.q_y1, this.q_x, this.q_y, 180);
            this.t_x1 = coord[0];
            this.t_y1 = coord[1];

            // Print 'T' control point 1
            nc_context.moveTo(this.q_x, this.q_y);
            nc_context.lineTo(this.t_x1, this.t_y1);

            // Print 'T' control point 1
            nc_context.moveTo(this.t_x1, this.t_y1);
            nc_context.lineTo(this.t_x, this.t_y);

            // Draw 'T' bezier curve
            nc_context.moveTo(this.q_x, this.q_y);
            nc_context.quadraticCurveTo(this.t_x1, this.t_y1, this.t_x, this.t_y);
            log("Cubic " + this.t_x1 + " " + this.t_y1 + " " + this.t_x + " " + this.t_y);

        }

    };

    function parseCoord(elem) {
        var coords;
        var index = elem.lastIndexOf('-');
        if (index !== 1 && index > 0) {
            coords = [elem.slice(0, index), elem.slice(index, elem.length)];
        } else {
            coords = elem.split(",");
        }

        log("coord " + coords[0] + " " + coords[1]);
        return coords;
    }

    function rotate(x, y, centerX, centerY, degree) {

        log("rotate " + x + " " + y + " " + centerX + " " + centerY);

        var radians = degree * (Math.PI / 180);

        var cosVal = Math.cos(radians);
        var sinVal = Math.sin(radians);

        var ox = x - centerX;
        var oy = y - centerY;

        var xx = centerX + ox * cosVal - oy * sinVal;
        var yy = centerY + ox * sinVal + oy * cosVal;

        log("rotate " + xx + " " + yy);

        return [xx, yy];

    }

    function nc_repaint() {
        if (!idle) {
            return;
        }
        idle = false;
        nc_animate();
    }

    nc.size = function(height, width) {
        nc_canvas.height = height;
        nc_canvas.width = width;
        return this;
    };

    nc.background = function(color) {
        nc_canvas.style.backgroundColor = color;
        return this;
    };

    nc.anim = function(fun) {
        var animation = nc_append_animation(nc_animation(fun));
        nc_repaint();
        return animation;
    };

    nc.line = function(s_x, s_y, e_x, e_y) {
        return nc_append(nc_line(s_x, s_y, e_x, e_y));
    };

    nc.rect = function(x, y, w, h) {
        return nc_append(nc_rect(x, y, w, h));
    };

    nc.text = function(x, y, txt) {
        return nc_append(nc_text(x, y, txt));
    };

    nc.path = function(path) {
        return nc_append(nc_path(path));
    };

    nc.layer = function(x, y, w, h) {
        return nc_append(nc_layer(x, y, w, h));
    };

    nc.circle = function(x, y, r, s, e) {
        return nc_append(nc_circle(x, y, r, s, e));
    };

    nc.clear = function() {
        nc_context.clearRect(0, 0, nc_canvas.height, nc_canvas.width);
        return this;
    };

    nc.repaint = function() {
        nc_repaint();
        return this;
    };

    nc.remove = function(obj) {
        nc_remove(obj);
        return this;
    };

    nc.forEach = function(fun, type) {
        var i;
        for (i = 0; i < nc_objs.length; i += 1) {
            if (type === undefined || (type !== undefined && nc_objs[i].attr.type === type)) {
                fun(nc_objs[i]);
            }
        }
    };

    nc.textWidth = function(txt) {
        return nc_context.measureText(txt).width;			
    };

    nc.createRadialGradient = function(startX, startY, initialSize, endX, endY, endSize) {
        return nc_context.createRadialGradient(startX, startY, initialSize, endX, endY, endSize);
    };

    nc.createLinearGradient = function(X, Y, W, H) {
        return nc_context.createLinearGradient(X, Y, W, H);
    };

    return nc;

};
