
document.body.innerHTML = '<style>div{color: grey;text-align:center;position:absolute;margin:auto;top:0;right:0;bottom:0;left:0;width:500px;height:100px;}</style><body><div id="loading"><p>This could take a while, please give it at least 5 minutes to render.</p><br><h1 class="spin">⏳</h1><br><h3>Press <strong>?</strong> for shortcut keys</h3><br><p><small>Output contains an embedded blueprint for creating an IRL wall sculpture</small></p></div></body>';

paper.install(window);
window.onload = function() {

document.body.innerHTML = '<style>body {margin: 0px;text-align: center;}</style><canvas resize="true" style="display:block;width:100%;" id="myCanvas"></canvas>';

setquery("fxhash",$fx.hash);
var initialTime = new Date().getTime();

//file name 
var fileName = $fx.hash;

var canvas = document.getElementById("myCanvas");

paper.setup('myCanvas');
paper.activate();

//vvvvvvvvvvvvvvv CLIPPER BOOLEAN ENGINE vvvvvvvvvvvvvvv
var CLIP_SCALE = 100;   // Integer precision for Clipper (100 = 0.01 unit resolution)
var CLIP_FLATTEN = 0.1; // Bezier-to-polygon tolerance (lower = smoother, more points)

function _toClipperPaths(paperItem) {
    var clone = paperItem.clone({ insert: false });
    clone.flatten(CLIP_FLATTEN);
    var children = (clone.className === 'CompoundPath') ? clone.children : [clone];
    var result = [];
    for (var i = 0; i < children.length; i++) {
        var segs = children[i].segments;
        if (segs.length < 3) continue;
        var pts = new Array(segs.length);
        for (var j = 0; j < segs.length; j++) {
            pts[j] = { X: Math.round(segs[j].point.x * CLIP_SCALE),
                       Y: Math.round(segs[j].point.y * CLIP_SCALE) };
        }
        result.push(pts);
    }
    clone.remove();
    return result;
}

function _fromClipperPaths(clipperPaths) {
    if (!clipperPaths || clipperPaths.length === 0) return new Path();
    var compound = new CompoundPath({});
    for (var i = 0; i < clipperPaths.length; i++) {
        var pts = clipperPaths[i];
        if (pts.length < 3) continue;
        var paperPts = new Array(pts.length);
        for (var j = 0; j < pts.length; j++) {
            paperPts[j] = new Point(pts[j].X / CLIP_SCALE, pts[j].Y / CLIP_SCALE);
        }
        compound.addChild(new Path({ segments: paperPts, closed: true, insert: false }));
    }
    // Use non-zero winding — matches Paper.js canvas default and Clipper's output orientation.
    // CleanPolygons removes near-degenerate edges that can cause winding flips at fine tolerances.
    ClipperLib.Clipper.CleanPolygons(clipperPaths, 0.5);
    compound.reorient(true, true);
    return compound;
}

function _clipBool(a, b, clipType) {
    var savedStyle = a.style;
    var clipper = new ClipperLib.Clipper();
    clipper.AddPaths(_toClipperPaths(a), ClipperLib.PolyType.ptSubject, true);
    clipper.AddPaths(_toClipperPaths(b), ClipperLib.PolyType.ptClip, true);
    var solution = new ClipperLib.Paths();
    clipper.Execute(clipType, solution,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero);
    var result = _fromClipperPaths(solution);
    result.style = savedStyle;
    return result;
}

function clipUnite(a, b)     { return _clipBool(a, b, ClipperLib.ClipType.ctUnion); }
function clipSubtract(a, b)  { return _clipBool(a, b, ClipperLib.ClipType.ctDifference); }
function clipIntersect(a, b) { return _clipBool(a, b, ClipperLib.ClipType.ctIntersection); }
//^^^^^^^^^^^^^ END CLIPPER BOOLEAN ENGINE ^^^^^^^^^^^^^

console.log('hash: '+$fx.hash)
console.log('#'+$fx.iteration)

canvas.style.background = "white";

//Set a seed value for Perlin
var seed = Math.floor($fx.rand()*10000000000000000);

//initialize perlin noise 
var noise = new perlinNoise3d();
noise.noiseSeed(seed);

//read in query strings
var qcolor1 = "AllColors";
if(new URLSearchParams(window.location.search).get('c1')){qcolor1 = new URLSearchParams(window.location.search).get('c1')}; //colors1
var qcolor2 = "None";
if(new URLSearchParams(window.location.search).get('c2')){qcolor2 = new URLSearchParams(window.location.search).get('c2')}; //colors2
var qcolor3 = "None";
if(new URLSearchParams(window.location.search).get('c3')){qcolor3 = new URLSearchParams(window.location.search).get('c3')}; //colors3
var qcolors = R.random_int(1,6);
if(new URLSearchParams(window.location.search).get('c')){qcolors = new URLSearchParams(window.location.search).get('c')}; //number of colors
var qsize = "2";
if(new URLSearchParams(window.location.search).get('s')){qsize = new URLSearchParams(window.location.search).get('s')}; //size
// Small URL override helper — reads ?key=value and returns null when absent.
// Used both as slider defaults AND as hard overrides at the $fx.getParam sites
// below, so e.g. ?d=10 forces density=10 regardless of what fxparams picked.
function qParam(key) {
    var v = new URLSearchParams(window.location.search).get(key);
    return (v !== null && v !== '') ? v : null;
}

var qdensity = R.random_int(1,10);
if(qParam('d') !== null){qdensity = parseInt(qParam('d'))}; //density
qdensity = qdensity+3;
var qcomplexity = R.random_int(1,10);
if(qParam('cx') !== null){qcomplexity = parseInt(qParam('cx'))}; //complexity (how many webs)
var qvariation = 10;
if(qParam('v') !== null){qvariation = parseInt(qParam('v'))}; //cell size variation
var qdepthvariation = false;
if(qParam('dv') !== null){
    var _dv = qParam('dv').toLowerCase();
    qdepthvariation = (_dv === '1' || _dv === 'true' || _dv === 'on' || _dv === 'yes');
}; //depth variation (boolean)
var qstyle = R.random_choice(["Natural","Natural","Natural","Orb","Corner","Edge"]);
if(qParam('st') !== null){qstyle = qParam('st')}; //style

var qorientation =R.random_int(1,2) < 2 ? "portrait" : "landscape";
var qframecolor = R.random_int(0,3) < 1 ? "White" : R.random_int(1,3) < 2 ? "Mocha" : "Random";     
var qmatwidth = R.random_int(50,100);


//fxparams
definitions = [
    {
        id: "layers",
        name: "Layers",
        type: "number",
        default: 12,
        options: {
            min: 6,
            max: 24,
            step: 1,
        },  
    },
    {
        id: "orientation",
        name: "Orientation",
        type: "select",
        default: qorientation,
        options: {options: ["portrait", "landscape"]},
    },
    {
        id: "aspectratio",
        name: "Aspect ratio",
        type: "select",
        default: "4:5",
        options: {options: ["1:1", "2:5","3:5","4:5","54:86","296:420"]},
    },
    {
        id: "size",
        name: "Size",
        type: "select",
        default: qsize,
        options: {options: ["1", "2", "3","4","5","6"]},
    },
    {
        id: "colors",
        name: "Max # of colors",
        type: "number",
        default: qcolors,
        options: {
            min: 1,
            max: 6,
            step: 1,
        },  
    },
    {
        id: "colors1",
        name: "Pallete 1",
        type: "select",
        default: qcolor1,
        options: {options: palleteNames},
    },
    {
        id: "colors2",
        name: "Pallete 2",
        type: "select",
        default: qcolor2,
        options: {options: palleteNames},
    },
    {
        id: "colors3",
        name: "Pallete 3",
        type: "select",
        default: qcolor3,
        options: {options: palleteNames},
    },
    {
        id: "framecolor",
        name: "Frame color",
        type: "select",
        default: qframecolor,
        options: {options: ["Random","White","Mocha"]},
    },
    {
        id: "density",
        name: "Density",
        type: "number",
        default: qdensity,
        options: {
            min: 3,
            max: 13,
            step: 1,
        },
    },
    {
        id: "complexity",
        name: "Complexity",
        type: "number",
        default: qcomplexity,
        options: {
            min: 1,
            max: 10,
            step: 1,
        },
    },
    {
        id: "variation",
        name: "Web irregularity",
        type: "number",
        default: qvariation,
        options: {
            min: 1,
            max: 10,
            step: 1,
        },
    },
    {
        id: "depthvariation",
        name: "Depth variation",
        type: "boolean",
        default: qdepthvariation,
    },
    {
        id: "style",
        name: "Style",
        type: "select",
        default: qstyle,
        options: {options: ["Natural","Orb","Corner","Edge"]},
    },
    {
        id: "matwidth",
        name: "Mat size",
        type: "number",
        default: qmatwidth,
        options: {
            min: 50,
            max: 150,
            step: 10,
        },  
    },
   
    ]


$fx.params(definitions)
var scale = $fx.getParam('size');
var stacks = $fx.getParam('layers');
var numofcolors = $fx.getParam('colors');


//Set the properties for the artwork where 100 = 1 inch
var wide = 800; 
var high = 1000; 

if ($fx.getParam('aspectratio')== "1:1"){wide = 800; high = 800};
if ($fx.getParam('aspectratio')== "2:5"){wide = 400; high = 1000};
if ($fx.getParam('aspectratio')== "3:5"){wide = 600; high = 1000};
if ($fx.getParam('aspectratio')== "4:5"){wide = 800; high = 1000};
if ($fx.getParam('aspectratio')== "54:86"){wide = 540; high = 860};
if ($fx.getParam('aspectratio')== "296:420"){wide =705; high = 1000};


var ratio = 1/scale;//use 1/4 for 32x40 - 1/3 for 24x30 - 1/2 for 16x20 - 1/1 for 8x10
var minOffset = ~~(7*ratio); //this is aproximatly .125"
var framewidth = ~~($fx.getParam('matwidth')*ratio*scale); 
var framradius = 0;


// Set a canvas size for when layers are exploded where 100=1in
var panelWide = 1600; 
var panelHigh = 2000; 
 
paper.view.viewSize.width = 2400;
paper.view.viewSize.height = 2400;


var colors = []; var palette = []; 

// set a pallete based on color schemes
var newPalette = [];
newPalette = this[$fx.getParam('colors1')].concat(this[$fx.getParam('colors2')],this[$fx.getParam('colors3')]);
for (c=0; c<numofcolors; c=c+1){palette[c] = newPalette[R.random_int(0, newPalette.length-1)]}  
console.log(newPalette);

//randomly assign colors to layers
for (c=0; c<stacks; c=c+1){colors[c] = palette[R.random_int(0, palette.length-1)];};

//or alternate colors
p=0;for (var c=0; c<stacks; c=c+1){colors[c] = palette[p];p=p+1;if(p==palette.length){p=0};}

console.log(colors);

if ($fx.getParam('framecolor')=="White"){colors[stacks-1]={"Hex":"#FFFFFF", "Name":"Smooth White"}};
if ($fx.getParam('framecolor')=="Mocha"){colors[stacks-1]={"Hex":"#4C4638", "Name":"Mocha"}};


var woodframe = new Path();var framegap = new Path();
var fColor = frameColors[R.random_int(0, frameColors.length-1)];
fColor = {"Hex":"#60513D","Name":"Walnut"};
var frameColor = fColor.Hex;

//adjust the canvas dimensions
w=wide;h=high;
var orientation="Portrait";
 
if ($fx.getParam('orientation')=="landscape"){wide = h;high = w;orientation="Landscape";};
if ($fx.getParam('orientation')=="portrait"){wide = w;high = h;orientation="Portrait";};

//setup the project variables


//Set the line color
linecolor={"Hex":"#4C4638", "Name":"Mocha"};


//************* Draw the layers ************* 


sheet = []; //This will hold each layer

var px=0;var py=0;var pz=0;var prange=.1; 


//define the spider webs (deterministic via $fx.rand)
        var drawareawide = wide-framewidth*2;
        var drawareahigh = high-framewidth*2;
        var densityParam = qParam('d') !== null ? parseInt(qParam('d')) : $fx.getParam('density'); // 3..13

        // The webs live inside the frame opening — the anchor threads run all
        // the way out to this boundary, so every web hangs off the frame.
        var bbox = {
            minX: framewidth,
            minY: framewidth,
            maxX: wide - framewidth,
            maxY: high - framewidth
        };

        var cellGap = minOffset * R.random_num(1, 2);

        //vvvvvvvvvvvvvvv POLYGON HELPERS vvvvvvvvvvvvvvv
        function polygonSignedArea(poly) {
            var a = 0;
            for (var i = 0; i < poly.length; i++) {
                var p = poly[i], q = poly[(i+1) % poly.length];
                a += p.x * q.y - q.x * p.y;
            }
            return a * 0.5;
        }
        function polygonArea(poly) { return Math.abs(polygonSignedArea(poly)); }

        function polygonCentroid(poly) {
            var cx = 0, cy = 0, area = 0;
            for (var j = 0; j < poly.length; j++) {
                var p = poly[j], q = poly[(j+1)%poly.length];
                var cross = p.x*q.y - q.x*p.y;
                area += cross;
                cx += (p.x + q.x) * cross;
                cy += (p.y + q.y) * cross;
            }
            area *= 0.5;
            if (Math.abs(area) < 1e-6) return null;
            return {x: cx / (6 * area), y: cy / (6 * area)};
        }

        // offsetPolygonClipper shrinks assuming positive signed area (the same
        // convention the triangulation this was forked from used).
        function ensurePositiveWinding(poly) {
            return polygonSignedArea(poly) >= 0 ? poly : poly.slice().reverse();
        }

        // Drop consecutive duplicates — spiral polylines meet radial endpoints
        // exactly, and Clipper dislikes zero-length edges.
        function dedupePolygon(poly) {
            var out = [];
            for (var i = 0; i < poly.length; i++) {
                var p = poly[i];
                var q = out.length ? out[out.length-1] : null;
                if (q && Math.abs(p.x-q.x) < 1e-6 && Math.abs(p.y-q.y) < 1e-6) continue;
                out.push(p);
            }
            while (out.length > 1) {
                var f = out[0], l = out[out.length-1];
                if (Math.abs(f.x-l.x) < 1e-6 && Math.abs(f.y-l.y) < 1e-6) out.pop(); else break;
            }
            return out;
        }

        // Inward polygon offset via Clipper (returns largest resulting piece, or null).
        function offsetPolygonClipper(points, delta) {
            if (!points || points.length < 3) return null;
            var co = new ClipperLib.ClipperOffset();
            var scaled = new Array(points.length);
            for (var k = 0; k < points.length; k++) {
                scaled[k] = { X: Math.round(points[k].x * CLIP_SCALE), Y: Math.round(points[k].y * CLIP_SCALE) };
            }
            co.AddPath(scaled, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
            var solution = new ClipperLib.Paths();
            co.Execute(solution, delta * CLIP_SCALE);
            if (!solution || solution.length === 0) return null;
            var best = null, bestArea = 0;
            for (var s = 0; s < solution.length; s++) {
                if (solution[s].length < 3) continue;
                var a = Math.abs(ClipperLib.Clipper.Area(solution[s]));
                if (a > bestArea) { bestArea = a; best = solution[s]; }
            }
            if (!best) return null;
            var out = new Array(best.length);
            for (var k = 0; k < best.length; k++) {
                out[k] = {x: best[k].X / CLIP_SCALE, y: best[k].Y / CLIP_SCALE};
            }
            return out;
        }

        function polyBounds(poly) {
            var b = {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity};
            for (var i = 0; i < poly.length; i++) {
                if (poly[i].x < b.minX) b.minX = poly[i].x;
                if (poly[i].y < b.minY) b.minY = poly[i].y;
                if (poly[i].x > b.maxX) b.maxX = poly[i].x;
                if (poly[i].y > b.maxY) b.maxY = poly[i].y;
            }
            b.w = b.maxX - b.minX; b.h = b.maxY - b.minY;
            return b;
        }

        // Distance from `origin` to the boundary of convex polygon `poly` along
        // `angle`. This is what pins the web to its frame: a radial's full
        // reach is exactly the distance to the region edge.
        function rayReachInPolygon(origin, angle, poly) {
            var dx = Math.cos(angle), dy = Math.sin(angle);
            var best = Infinity;
            for (var i = 0; i < poly.length; i++) {
                var a = poly[i], b = poly[(i+1) % poly.length];
                var ex = b.x - a.x, ey = b.y - a.y;
                var den = dx * ey - dy * ex;
                if (Math.abs(den) < 1e-12) continue; // parallel
                var wx = a.x - origin.x, wy = a.y - origin.y;
                var t = (wx * ey - wy * ex) / den;
                if (t <= 1e-6) continue;
                var e2 = ex*ex + ey*ey;
                if (e2 < 1e-12) continue;
                var s = ((t * dx - wx) * ex + (t * dy - wy) * ey) / e2;
                if (s < -1e-6 || s > 1 + 1e-6) continue;
                if (t < best) best = t;
            }
            return best === Infinity ? 0 : best;
        }
        //^^^^^^^^^^^^^ END POLYGON HELPERS ^^^^^^^^^^^^^

        // Shared driver knobs.
        var variation = qParam('v') !== null ? parseInt(qParam('v')) : $fx.getParam('variation');
        var variationT = (variation - 1) / 9; // 0 = a tidy web, 1 = a ragged one

        var depthVariation = qParam('dv') !== null ? qdepthvariation : $fx.getParam('depthvariation');
        var depthVarT = depthVariation ? 1 : 0; // boolean: full range vs uniform
        var topWebLayer = stacks - 1; // every layer participates in the web
        var fullMaxDepth = topWebLayer;
        // Full depth by default — cuts reach layer 1, only z=0 (the backing board)
        // stays solid. depthVariation opens the range to [1, topWebLayer]
        // so some cells cut all the way through and others are shallower.
        var midDepth = topWebLayer;
        var halfRangeDown = (midDepth - 1) * depthVarT;
        var halfRangeUp = (fullMaxDepth - midDepth) * depthVarT;
        var minDepth = Math.max(1, Math.round(midDepth - halfRangeDown));
        var maxDepth = Math.min(fullMaxDepth, Math.round(midDepth + halfRangeUp));
        if (maxDepth < minDepth) maxDepth = minDepth;
        console.log('Depth: dv=' + depthVariation + ' range=[' + minDepth + '..' + maxDepth + '] mid=' + midDepth);

        //vvvvvvvvvvvvvvv WEB LAYOUT vvvvvvvvvvvvvvv
        // A web is a hub plus a fan of radial threads that each run out to the
        // boundary of its own region, crossed by sagging spiral threads. The
        // faces of that subdivision are the cells the layer stack cuts into —
        // so the material left standing between the cuts *is* the silk.
        //
        // Nothing here is regular on purpose: hubs sit off-centre, radials are
        // unevenly spaced, spiral rings wobble, and only a handful of anchor
        // threads make it all the way out to the frame.
        var styleParam = qParam('st') !== null ? qParam('st') : $fx.getParam('style');

        function rect(x0, y0, x1, y1) {
            return [{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];
        }

        // Keep the side of `poly` where (p - m) . n <= 0. Convex in, convex out.
        function clipHalfPlane(poly, mx, my, nx, ny) {
            var out = [];
            var n = poly.length;
            if (n < 3) return out;
            for (var i = 0; i < n; i++) {
                var s = poly[i], e = poly[(i + 1) % n];
                var sd = (s.x - mx) * nx + (s.y - my) * ny;
                var ed = (e.x - mx) * nx + (e.y - my) * ny;
                var sIn = sd <= 0, eIn = ed <= 0;
                if (sIn) {
                    if (eIn) out.push(e);
                    else { var t = sd / (sd - ed); out.push({x: s.x + (e.x - s.x) * t, y: s.y + (e.y - s.y) * t}); }
                } else if (eIn) {
                    var t2 = sd / (sd - ed);
                    out.push({x: s.x + (e.x - s.x) * t2, y: s.y + (e.y - s.y) * t2});
                    out.push(e);
                }
            }
            return out;
        }

        function pointInPolygon(pt, poly) {
            var inside = false;
            for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                var pi = poly[i], pj = poly[j];
                if (((pi.y > pt.y) !== (pj.y > pt.y)) &&
                    (pt.x < (pj.x - pi.x) * (pt.y - pi.y) / (pj.y - pi.y) + pi.x)) inside = !inside;
            }
            return inside;
        }

        // Is this point sitting on the frame opening (as opposed to on an
        // interior split line)? Webs would rather anchor to the real frame.
        function onFrame(p) {
            return Math.abs(p.x - bbox.minX) < 1 || Math.abs(p.x - bbox.maxX) < 1 ||
                   Math.abs(p.y - bbox.minY) < 1 || Math.abs(p.y - bbox.maxY) < 1;
        }

        // Cut the frame opening into `count` convex pockets, one web each.
        // The cuts are at free angles rather than on a grid, so several webs
        // sharing a frame read as a tangle of separate webs and not as tiles.
        function splitRegions(region, count) {
            var out = [region];
            while (out.length < count) {
                // Always split whatever pocket is largest.
                var bi = 0, bArea = -1;
                for (var i = 0; i < out.length; i++) {
                    var a = polygonArea(out[i]);
                    if (a > bArea) { bArea = a; bi = i; }
                }
                var poly = out[bi];
                var b = polyBounds(poly);
                var c = polygonCentroid(poly) || {x: (b.minX+b.maxX)/2, y: (b.minY+b.maxY)/2};
                var gap = minOffset * 3;
                var extent = Math.max(b.w, b.h);

                var pieces = null;
                for (var attempt = 0; attempt < 12 && !pieces; attempt++) {
                    // Bias the cut toward the long axis so pockets stay chunky,
                    // then let it wander well off square.
                    var baseAng = (b.w >= b.h ? 0 : Math.PI / 2);
                    var ang = baseAng + (R.random_dec() - 0.5) * 0.9;
                    var nx = Math.cos(ang), ny = Math.sin(ang);
                    // Off-centre so the two pockets come out different sizes.
                    var off = (R.random_dec() - 0.5) * extent * 0.3;
                    var mx = c.x + nx * off, my = c.y + ny * off;
                    var A = clipHalfPlane(poly, mx + nx * gap, my + ny * gap, nx, ny);
                    var B = clipHalfPlane(poly, mx - nx * gap, my - ny * gap, -nx, -ny);
                    if (A.length >= 3 && B.length >= 3 &&
                        polygonArea(A) > bArea * 0.25 && polygonArea(B) > bArea * 0.25) {
                        pieces = [A, B];
                    }
                }
                if (!pieces) break; // nothing splits cleanly — stop here
                out.splice(bi, 1, pieces[0], pieces[1]);
            }
            return out;
        }

        // Given two directions out of `hub`, return the sweep that runs through
        // the inside of `poly` (rather than the reflex way round the outside).
        function interiorSweep(hub, aA, aB, poly) {
            var d = aB - aA;
            while (d <= 1e-9) d += Math.PI * 2;
            while (d > Math.PI * 2) d -= Math.PI * 2;
            var mid = aA + d / 2;
            var probe = {x: hub.x + Math.cos(mid) * 2, y: hub.y + Math.sin(mid) * 2};
            if (pointInPolygon(probe, poly)) return {start: aA, end: aA + d};
            return {start: aB, end: aB + (Math.PI * 2 - d)};
        }

        // Build the web descriptors for a style. Each is {region, hub, closed}
        // — `closed` webs wrap all the way around; open ones fan out from a hub
        // sitting on the pocket's own boundary, ideally the frame itself.
        function buildWebs(style, count) {
            var full = rect(bbox.minX, bbox.minY, bbox.maxX, bbox.maxY);
            var webs = [];
            // A lone spider often bothers with only part of the frame; once
            // several are sharing it they each fill their pocket.
            var trimOdds = count === 1 ? 7 : (count <= 3 ? 5 : 2);

            // Orb weavers hang above centre — bias the hub up and jitter it
            // across, so the radials are never the same length twice.
            function orbWeb(region) {
                var b = polyBounds(region);
                var hub, tries = 0;
                do {
                    hub = {
                        x: b.minX + b.w * (0.5 + (R.random_dec() - 0.5) * 0.42),
                        y: b.minY + b.h * (0.44 + (R.random_dec() - 0.5) * 0.46)
                    };
                    tries++;
                } while (!pointInPolygon(hub, region) && tries < 20);
                if (!pointInPolygon(hub, region)) {
                    hub = polygonCentroid(region) || {x: (b.minX+b.maxX)/2, y: (b.minY+b.maxY)/2};
                }
                return {region: region, hub: hub, closed: true};
            }

            // Trim a pocket back to just the part near the hub, so an
            // anchored web spans a chord of the frame instead of always
            // reaching the far side. This is what leaves bare frame beside a
            // corner web — the spider only bothered with its own corner.
            function trimToward(region, hub, nx, ny, lo, hi) {
                var maxD = 0;
                for (var i = 0; i < region.length; i++) {
                    var d = (region[i].x - hub.x) * nx + (region[i].y - hub.y) * ny;
                    if (d > maxD) maxD = d;
                }
                if (maxD <= 0) return region;
                var dist = maxD * (lo + R.random_dec() * (hi - lo));
                var trimmed = clipHalfPlane(region, hub.x + nx * dist, hub.y + ny * dist, nx, ny);
                if (trimmed.length < 3) return region;
                if (polygonArea(trimmed) < polygonArea(region) * 0.12) return region;
                return trimmed;
            }

            // Inward-pointing unit normal of region edge i.
            function inwardNormal(region, i) {
                var a = region[i], b = region[(i + 1) % region.length];
                var dx = b.x - a.x, dy = b.y - a.y;
                var L = Math.hypot(dx, dy);
                if (L < 1e-6) return {x: 0, y: 0};
                var nx = -dy / L, ny = dx / L;
                var mid = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
                if (!pointInPolygon({x: mid.x + nx * 2, y: mid.y + ny * 2}, region)) { nx = -nx; ny = -ny; }
                return {x: nx, y: ny};
            }

            // Hub pinned on a corner of the pocket, fanning across that corner's
            // interior angle — the two end radials lie along the pocket edges.
            function cornerWeb(region) {
                var n = region.length;
                // A spider needs a real corner to bridge: skip slivers and
                // near-straight vertices left behind by the pocket cuts.
                function cornerOK(i) {
                    var v0 = region[i];
                    var p0 = region[(i - 1 + n) % n], n0 = region[(i + 1) % n];
                    var s0 = interiorSweep(v0,
                        Math.atan2(n0.y - v0.y, n0.x - v0.x),
                        Math.atan2(p0.y - v0.y, p0.x - v0.x), region);
                    var ang0 = s0.end - s0.start;
                    return ang0 > 0.6 && ang0 < 2.6;
                }
                var pool = [];
                for (var i = 0; i < n; i++) if (onFrame(region[i]) && cornerOK(i)) pool.push(i);
                if (!pool.length) for (var i = 0; i < n; i++) if (cornerOK(i)) pool.push(i);
                if (!pool.length) for (var i = 0; i < n; i++) pool.push(i);
                var vi = pool[R.random_int(0, pool.length - 1)];
                var v = region[vi];
                var prev = region[(vi - 1 + n) % n], next = region[(vi + 1) % n];
                var aPrev = Math.atan2(prev.y - v.y, prev.x - v.x);
                var aNext = Math.atan2(next.y - v.y, next.x - v.x);
                var hub = {x: v.x, y: v.y};
                // Usually the spider only spans part of the pocket.
                if (R.random_int(0, 9) < trimOdds) {
                    var cen = polygonCentroid(region);
                    if (cen) {
                        var dx = cen.x - hub.x, dy = cen.y - hub.y;
                        var L = Math.hypot(dx, dy);
                        if (L > 1e-6) region = trimToward(region, hub, dx / L, dy / L, 0.55, 1.0);
                    }
                }
                var sw = interiorSweep(hub, aNext, aPrev, region);
                return {region: region, hub: hub, sweepStart: sw.start, sweepEnd: sw.end, closed: false};
            }

            // Hub out on an edge, fanning a half turn inward — the half-web
            // that hangs off the top or the side of a frame.
            function edgeWeb(region) {
                var n = region.length;
                var pool = [];
                for (var i = 0; i < n; i++) {
                    var a = region[i], b2 = region[(i + 1) % n];
                    if (onFrame(a) && onFrame(b2) && onFrame({x: (a.x+b2.x)/2, y: (a.y+b2.y)/2})) pool.push(i);
                }
                if (!pool.length) {
                    // No frame edge in this pocket — anchor on its longest edge.
                    var bestI = 0, bestL = -1;
                    for (var i = 0; i < n; i++) {
                        var a = region[i], b2 = region[(i + 1) % n];
                        var L = Math.hypot(b2.x - a.x, b2.y - a.y);
                        if (L > bestL) { bestL = L; bestI = i; }
                    }
                    pool.push(bestI);
                }
                var ei = pool[R.random_int(0, pool.length - 1)];
                var a0 = region[ei], b0 = region[(ei + 1) % n];
                var t = 0.28 + R.random_dec() * 0.44;
                var hub = {x: a0.x + (b0.x - a0.x) * t, y: a0.y + (b0.y - a0.y) * t};
                if (R.random_int(0, 9) < trimOdds) {
                    var nrm = inwardNormal(region, ei);
                    if (nrm.x || nrm.y) region = trimToward(region, hub, nrm.x, nrm.y, 0.55, 1.0);
                }
                var aA = Math.atan2(a0.y - hub.y, a0.x - hub.x);
                var aB = Math.atan2(b0.y - hub.y, b0.x - hub.x);
                var sw = interiorSweep(hub, aB, aA, region);
                return {region: region, hub: hub, sweepStart: sw.start, sweepEnd: sw.end, closed: false};
            }

            var regions = count === 1 ? [full] : splitRegions(full, count);

            for (var i = 0; i < regions.length; i++) {
                if (style === 'Orb')    { webs.push(orbWeb(regions[i])); continue; }
                if (style === 'Corner') { webs.push(cornerWeb(regions[i])); continue; }
                if (style === 'Edge')   { webs.push(edgeWeb(regions[i])); continue; }
                // Natural: a mix. A lone web is usually a full orb; once the
                // frame is shared, more of them hang off a corner or an edge.
                var roll = R.random_int(0, 9);
                if (regions.length === 1) webs.push(roll < 7 ? orbWeb(regions[i]) : (roll < 9 ? cornerWeb(regions[i]) : edgeWeb(regions[i])));
                else if (roll < 4)        webs.push(cornerWeb(regions[i]));
                else if (roll < 7)        webs.push(edgeWeb(regions[i]));
                else                      webs.push(orbWeb(regions[i]));
            }
            return webs;
        }
        // Complexity is purely "how many webs share the frame" — 1 or 2 reads
        // as a single web on its own, 10 crowds the frame with half a dozen.
        var complexityParam = qParam('cx') !== null ? parseInt(qParam('cx')) : $fx.getParam('complexity');
        var webCount = Math.max(1, Math.min(6, Math.ceil(complexityParam / 2)));

        var webs = buildWebs(styleParam, webCount);
        console.log('Style: ' + styleParam + ' / complexity: ' + complexityParam + ' / webs: ' + webs.length);

        // Ring / radial counts per web: scaled by the density knob, then shrunk
        // for the smaller pockets so their cells stay big enough to cut.
        var webPlan = [];
        var projected = 0;
        for (var wi = 0; wi < webs.length; wi++) {
            var regionScale = Math.sqrt(polygonArea(webs[wi].region) / (drawareawide * drawareahigh));
            var densityScale = 0.5 + 0.5 * regionScale;
            var plan = {
                rings: Math.max(3, Math.round((densityParam + 1) * densityScale)),
                rad: webs[wi].closed
                    ? Math.max(9, Math.round(densityParam * 2.1 * densityScale))
                    : Math.max(7, Math.round(densityParam * 1.35 * densityScale)) + 1
            };
            webPlan.push(plan);
            projected += plan.rings * plan.rad;
        }
        // Every cell costs one boolean subtract per layer it cuts through, so
        // keep the total in the same range the triangulation this was forked
        // from produced — a frame full of webs thins each one out rather than
        // multiplying the render time by the web count.
        var cellBudget = 460;
        if (projected > cellBudget) {
            var shrink = Math.sqrt(cellBudget / projected);
            for (var wi = 0; wi < webPlan.length; wi++) {
                webPlan[wi].rings = Math.max(3, Math.round(webPlan[wi].rings * shrink));
                webPlan[wi].rad = Math.max(webs[wi].closed ? 8 : 6, Math.round(webPlan[wi].rad * shrink));
            }
            console.log('Thinned webs to fit the cell budget (projected ' + projected + ')');
        }

        var cells = [];

        for (var wi = 0; wi < webs.length; wi++) {
            var web = webs[wi];
            var hub = web.hub;
            var region = web.region;
            var closedWeb = web.closed;
            var nRings = webPlan[wi].rings;
            var nRad = webPlan[wi].rad;

            // ---- radial threads: evenly spaced, then knocked out of true ----
            // Even at variation=1 there is a baseline wobble; real webs never
            // divide the circle cleanly.
            var angleJitter = 0.16 + 0.45 * variationT;
            var angles = new Array(nRad);
            if (closedWeb) {
                var phase = R.random_dec() * Math.PI * 2;
                var slot = Math.PI * 2 / nRad;
                for (var k = 0; k < nRad; k++) {
                    // Jitter stays under half a slot so radials can never cross.
                    angles[k] = phase + k * slot + (R.random_dec() - 0.5) * slot * angleJitter;
                }
            } else {
                var sweep = web.sweepEnd - web.sweepStart;
                var slotO = sweep / (nRad - 1);
                for (var k = 0; k < nRad; k++) {
                    var jit = (k === 0 || k === nRad - 1) ? 0 : (R.random_dec() - 0.5) * slotO * angleJitter;
                    angles[k] = web.sweepStart + k * slotO + jit;
                }
                // Nudge the outer radials just off the frame edge so the ray
                // cast doesn't run parallel along it.
                angles[0] += 0.004;
                angles[nRad-1] -= 0.004;
            }

            // How far each radial can run before it hits the frame.
            var reach = new Array(nRad);
            var rMin = Infinity;
            for (var k = 0; k < nRad; k++) {
                reach[k] = rayReachInPolygon(hub, angles[k], region);
                if (reach[k] < rMin) rMin = reach[k];
            }
            if (!(rMin > 0)) continue;

            // ---- spiral rings ----
            // Rings 0..nRings-1 are the round body of the web: a spider walks a
            // circle, it doesn't trace the frame. Ring nRings is the frame
            // itself, so the band between the last spiral and the frame is
            // where the long anchor threads live.
            //
            // ringT[0] is the free zone left solid around the hub; the exponent
            // packs the spiral tight near the hub and opens it up outward, the
            // way a real capture spiral runs.
            var hubFrac = closedWeb ? 0.07 + R.random_dec() * 0.05 : 0.05 + R.random_dec() * 0.04;
            var spacingPow = 1.12 + R.random_dec() * 0.38;
            var ringT = new Array(nRings + 1);
            for (var j = 0; j < nRings; j++) {
                var u = j / (nRings - 1);
                ringT[j] = hubFrac + (1 - hubFrac) * Math.pow(u, spacingPow);
            }
            ringT[nRings - 1] = 1; // outermost spiral
            ringT[nRings] = 1;     // the frame
            var ringStep = 1 / nRings;

            // How big the round body gets. Sized off a low percentile of the
            // radial reaches, so the body fills the pocket without being
            // dragged out of round by the one long ray into a far corner.
            var sortedReach = reach.slice().sort(function(a, b) { return a - b; });
            var rBody = sortedReach[Math.floor(sortedReach.length * 0.45)] * (0.78 + R.random_dec() * 0.16);

            // Per-vertex radius wobble, plus a per-radial phase offset so the
            // spiral is nowhere near concentric. Both fade to zero on the
            // outermost ring, which has to stay anchored on the frame.
            var radiusJitter = 0.30 + 0.45 * variationT;
            var radialPhase = new Array(nRad);
            for (var k = 0; k < nRad; k++) radialPhase[k] = (R.random_dec() - 0.5);
            var tJit = new Array(nRad);
            for (var k = 0; k < nRad; k++) {
                tJit[k] = new Array(nRings + 1);
                for (var j = 0; j <= nRings; j++) {
                    // Scale the wobble by the gap to the neighbouring rings, not
                    // by an average — near the hub the rings are packed tight,
                    // and a global wobble would shove them straight through
                    // each other.
                    var jLo = Math.max(0, j - 1), jHi = Math.min(nRings - 1, j + 1);
                    var localStep = (ringT[jHi] - ringT[jLo]) / (jHi - jLo || 1);
                    tJit[k][j] = (radialPhase[k] + (R.random_dec() - 0.5)) * localStep * radiusJitter;
                }
            }

            // Sag of each spiral segment between radial k and k+1, at ring j.
            // This is the scallop that makes a web read as a web — it is a
            // pronounced concave droop, not a subtle one.
            var sagBase = 0.13 + 0.10 * variationT;
            var sagAmt = new Array(nRad);
            for (var k = 0; k < nRad; k++) {
                sagAmt[k] = new Array(nRings + 1);
                for (var j = 0; j <= nRings; j++) {
                    // Outermost ring rides the frame — no sag there.
                    sagAmt[k][j] = (j === nRings) ? 0 : sagBase * (0.6 + R.random_dec() * 0.8);
                }
            }

            function ringRadius(k, j) {
                if (j === nRings) return reach[k]; // anchored on the frame
                var t = ringT[j] + tJit[k][j];
                if (t < hubFrac * 0.4) t = hubFrac * 0.4;
                // Where the pocket pinches in, the body is squeezed to fit
                // rather than clipped — same as a web strung in a tight gap.
                var rk = Math.min(rBody, reach[k] * 0.88);
                var r = rk * t;
                var cap = reach[k] * 0.93;
                return r > cap ? cap : r;
            }

            // Forward polyline of the spiral thread spanning radial k -> k+1 at
            // ring j. Faces on both sides of a thread call this with the same
            // (k, j), so the shared edge is vertex-for-vertex identical and the
            // silk left standing between the two cuts has an even width.
            var bandCache = {};
            function ringBand(k, j) {
                var key = k + '_' + j;
                if (bandCache[key]) return bandCache[key];
                var kB = (k + 1) % nRad;
                var aA = angles[k], aB = angles[kB];
                var da = aB - aA;
                if (closedWeb) { while (da <= 1e-9) da += Math.PI * 2; }
                var rA = ringRadius(k, j), rB = ringRadius(kB, j);
                // A thread sags in proportion to how far it has to span, not to
                // how far out it is — otherwise a web with many radials turns
                // into a ring of spikes.
                var s = sagAmt[k][j] * (Math.abs(da) / 0.52);
                if (s > 0.34) s = 0.34;
                var samples = (j === nRings) ? 8 : 6;
                var pts = [];
                for (var m = 0; m <= samples; m++) {
                    var u = m / samples;
                    var a = aA + da * u;
                    var r = (rA + (rB - rA) * u) * (1 - s * Math.sin(Math.PI * u));
                    // Polar interpolation can bulge past a corner — clamp every
                    // sample to the region so nothing escapes the frame.
                    var maxr = rayReachInPolygon(hub, a, region);
                    if (r > maxr) r = maxr;
                    pts.push({x: hub.x + Math.cos(a) * r, y: hub.y + Math.sin(a) * r});
                }
                bandCache[key] = pts;
                return pts;
            }

            // ---- faces ----
            // Walk each ring band, emitting one cell per radial slot. Now and
            // then a cell swallows two slots: that drops the radial thread
            // between them for one band, which is what gives a web its
            // half-finished, mended look. In the outermost band it happens a
            // lot on purpose — only a few anchor threads should carry on out to
            // the frame, the rest stop at the last spiral.
            var mergeChance = 0.06 + 0.18 * variationT;
            var slots = closedWeb ? nRad : nRad - 1;
            // Past the last spiral the spider runs only a few long anchor lines
            // out to the frame, so the outer band is cut as a handful of big
            // cells rather than subdivided like the web body.
            var anchorCount = closedWeb ? R.random_int(4, 7) : R.random_int(2, 4);
            var anchorSpan = Math.max(1, Math.round(slots / anchorCount));
            for (var j = 0; j < nRings; j++) {
                var outerBand = (j === nRings - 1);
                var k = 0;
                while (k < slots) {
                    var span = 1;
                    if (outerBand) {
                        span = Math.max(1, anchorSpan + R.random_int(-1, 1));
                    } else if (R.random_dec() < mergeChance) span = 2;
                    if (span > slots - k) span = slots - k;

                    var inner = [];
                    var outer = [];
                    for (var sp = 0; sp < span; sp++) {
                        inner = inner.concat(ringBand((k + sp) % nRad, j));
                        outer = outer.concat(ringBand((k + sp) % nRad, j + 1));
                    }
                    // inner runs k -> k+span; come back along the outer ring.
                    var poly = dedupePolygon(inner.concat(outer.slice().reverse()));
                    k += span;
                    if (poly.length < 3) continue;
                    poly = ensurePositiveWinding(poly);

                    var area = polygonArea(poly);
                    if (area < 4) continue;
                    var perim = 0;
                    for (var pi2 = 0; pi2 < poly.length; pi2++) {
                        var pa = poly[pi2], pb = poly[(pi2+1) % poly.length];
                        perim += Math.hypot(pb.x - pa.x, pb.y - pa.y);
                    }
                    // Inradius via 2*area/perimeter — the scale the layer loop
                    // uses to decide how far each cell can taper inward.
                    var inradius = Math.max(1, perim > 1e-6 ? 2 * area / perim : 1);

                    var centroid = polygonCentroid(poly);
                    if (!centroid) continue;

                    // Depth: Perlin for organic mottling, blended with the ring
                    // index so cells at a similar radius terrace together and
                    // the web reads as a funnel down toward the hub.
                    var depthNoise = noise.get(centroid.x * prange * 0.6, centroid.y * prange * 0.6);
                    if (depthNoise < 0) depthNoise = 0;
                    if (depthNoise > 1) depthNoise = 1;
                    var ringFrac = (j + 0.5) / nRings;
                    depthNoise = depthNoise * 0.65 + (1 - ringFrac) * 0.35;

                    var depth = minDepth + Math.floor(depthNoise * (maxDepth - minDepth + 1));
                    if (depth > fullMaxDepth) depth = fullMaxDepth;
                    if (depth < 1) depth = 1;

                    var endLayer = topWebLayer - (depth - 1);
                    if (endLayer < 1) endLayer = 1;

                    cells.push({
                        polygon: poly,
                        inradius: inradius,
                        endLayer: endLayer
                    });
                }
            }
        }
        console.log('Web cells: ' + cells.length);



var features = {};
var renderTime;

paper.view.autoUpdate = false;

(async () => {

//---- Draw the Layers

// Warm-up: force paper.js to yield/render once before the first real Clipper
// boolean op, so the first op (the bottom layer's frame) isn't the cold one
// that silently returns empty (which dropped a layer, e.g. 11 instead of 12).
paper.view.update();
await new Promise(resolve => setTimeout(resolve, 0));

for (z = 0; z < stacks; z++) {
    pz=z*prange;
    
    drawFrame(z); // Draw the initial frame
    solid(z);

         //-----Draw each layer
        if(z<stacks-1 && z!=0 ){
            if (z==stacks-2){oset = minOffset}else{oset = ~~(minOffset*(stacks-z-1))}
            var li = R.random_int(12, 12);
            for (l=0;l<li;l++){
                //somelines(z); 
            }
            

        }


        
{
    for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        if (z < cell.endLayer) continue; // this cell terminates above z — keep solid here (shows color)

        // Shrink ratio: 0 on the top web layer, 1 on the cell's deepest cut layer.
        var distFromTop = topWebLayer - z;
        var depthSpan = topWebLayer - cell.endLayer;
        var shrinkRatio = depthSpan > 0 ? (distFromTop / depthSpan) : 0;

        // Scale top-layer gap down for small cells so every cell still gets cut.
        var topInset = Math.min(cellGap, cell.inradius * 0.4);
        var maxInset = cell.inradius * 0.9;
        if (maxInset <= topInset) { maxInset = topInset + 0.5; }

        // Baseline gap between cells on the top layer, then grow inward as z goes down.
        var inset = topInset + shrinkRatio * (maxInset - topInset) * 0.95;

        var insetPoly = offsetPolygonClipper(cell.polygon, -inset);
        if (!insetPoly || insetPoly.length < 3) continue;

        var segs = new Array(insetPoly.length);
        for (var k = 0; k < insetPoly.length; k++) {
            segs[k] = new Point(insetPoly[k].x, insetPoly[k].y);
        }
        var cellPath = new Path({segments: segs, closed: true});
        cut(z, cellPath);
    }
}

    frameIt(z);// finish the layer with a final frame cleanup 

    cutMarks(z);
    hanger(z);// add hanger holes
    if (z == stacks-1) {signature(z);}// sign the top layer
    sheet[z].scale(2.2);
    sheet[z].position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
   
    var group = new Group(sheet[z]);
    
    console.log(z)//Show layer completed in console

    paper.view.update();
    await new Promise(resolve => setTimeout(resolve, 0));

}//end z loop

//--------- Finish up the preview ----------------------- 

    // Build the features and trigger an fxhash preview
    features = {};
    features.Size =  ~~(wide/100/ratio)+" x "+~~(high/100/ratio)+" inches";
    features.Width = ~~(wide/100/ratio);
    features.Height = ~~(high/100/ratio);
    features.Depth = stacks*0.0625;
    features.Layers = stacks;
    features.Style = styleParam;
    features.Webs = webs.length;
    features.Complexity = complexityParam;
    for (l=stacks;l>0;l--){
    var key = "layer: "+(stacks-l+1)
    features[key] = colors[l-1].Name
    }
    console.log(features);
    $fx.features(features);
    //$fx.preview();

//Begin send to studio.shawnkemp.art **************************************************************
     studioAPI.setApiBase('https://studio-shawnkemp-art.vercel.app');
     if(new URLSearchParams(window.location.search).get('skart')){sendAllExports()};
//End send to studio.shawnkemp.art **************************************************************

      var finalTime = new Date().getTime();
    renderTime = (finalTime - initialTime)/1000
    console.log ('Render took : ' +  renderTime.toFixed(2) + ' seconds' );

    paper.view.autoUpdate = true;
    paper.view.update();

})();

async function sendAllExports() {

        paper.view.update();
        // Send canvas as PNG
        await studioAPI.sendCanvas(myCanvas, $fx.hash, $fx.hash+".png");

        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, $fx.hash+".svg");

        // send colors
        var content = JSON.stringify(features,null,2);

        // Send text/JSON
        await studioAPI.sendText(JSON.stringify(colors), $fx.hash, "Colors-"+$fx.hash+".json");

        // 2. Add frame
        floatingframe();
        paper.view.update();
        // 3. Framed PNGs (Black, White, Walnut, Maple)
        var frameOptions = [
            { name: "Black", hex: "#1f1f1f" },
            { name: "White", hex: "#f9f9f9" },
            { name: "Walnut", hex: "#60513D" },
            { name: "Maple", hex: "#ebd9c0" }
        ];
        for (var i = 0; i < frameOptions.length; i++) {
            woodframe.style = { fillColor: frameOptions[i].hex };
            var fileName = "Framed" + frameOptions[i].name + "-" + $fx.hash;
            paper.view.update();

            await studioAPI.sendCanvas(myCanvas,  $fx.hash, fileName+".png");
        }
        // 4. Remove frame
        floatingframe();
        // 5. Blueprint SVG
        for (var z = 0; z < stacks; z++) {
            sheet[z].style = {
                fillColor: null,
                strokeWidth: 0.1,
                strokeColor: lightburn[stacks - z - 1].Hex,
                shadowColor: null,
                shadowBlur: null,
                shadowOffset: null
            };
            sheet[z].selected = true;
        }
        paper.view.update();

        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, "Blueprint-" + $fx.hash+".svg");
        // 6. Plotting SVG
        for (var z = 0; z < stacks; z++) {
            sheet[z].style = {
                fillColor: null,
                strokeWidth: 0.1,
                strokeColor: plottingColors[stacks - z - 1].Hex,
                shadowColor: null,
                shadowBlur: null,
                shadowOffset: null
            };
            sheet[z].selected = true;
        }
        for (var z = 0; z < stacks; z++) {
            if (z < stacks - 1) {
                for (var zs = z + 1; zs < stacks; zs++) {
                    var old = sheet[z];
                    sheet[z] = clipSubtract(sheet[z], sheet[zs]);
                    old.remove();
                }
            }
        }
        paper.view.update();
        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, "Plotting-" + $fx.hash+".svg");

        // Send features
        await studioAPI.sendFeatures($fx.hash, features);

        console.log("All exports sent!");
        studioAPI.signalComplete();
    }


      

//vvvvvvvvvvvvvvv PROJECT FUNCTIONS vvvvvvvvvvvvvvv 
 
function somelines(z){
        p = []
        y = R.random_int(0, high);
        p[0]=new Point(0,y)
        y2 = R.random_int(0, high);
        p[1]=new Point(wide,y2)
        lines = new Path.Line (p[0],p[1]); 
        mesh = PaperOffset.offsetStroke(lines, minOffset,{ cap: 'butt' });
        mesh.flatten(4);
        mesh.smooth();
        lines.remove();
        join(z,mesh); 
        mesh.remove();

    
}




//^^^^^^^^^^^^^ END PROJECT FUNCTIONS ^^^^^^^^^^^^^ 




//--------- Helper functions ----------------------- 

function floatingframe(){
    var frameWide=~~(34*ratio);var frameReveal = ~~(12*ratio);
  if (framegap.isEmpty()){
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(~~(wide+frameReveal*2), ~~(high+frameReveal*2)), framradius)
        var insideframe = new Path.Rectangle(new Point(frameReveal, frameReveal),new Size(wide, high)) 
        framegap = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        framegap.scale(2.2);
        framegap.position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
        framegap.style = {fillColor: '#1A1A1A', strokeColor: "#1A1A1A", strokeWidth: 1*ratio};
    } else {framegap.removeChildren()} 
    
    if (woodframe.isEmpty()){
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide+frameWide*2+frameReveal*2, high+frameWide*2+frameReveal*2), framradius)
        var insideframe = new Path.Rectangle(new Point(frameWide, frameWide),new Size(wide+frameReveal*2, high+frameReveal*2)) 
        woodframe = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        woodframe.scale(2.2);
        woodframe.position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
        var framegroup = new Group(woodframe);
        woodframe.style = {fillColor: frameColor, strokeColor: "#60513D", strokeWidth: 2*ratio,shadowColor: new Color(0,0,0,[0.5]),shadowBlur: 20,shadowOffset: new Point(10*2.2, 10*2.2)};
    } else {woodframe.removeChildren()} 
    //fileName = "Framed-"+$fx.hash;
}

function rangeInt(range,x,y,z){
    var v = ~~(range-(noise.get(x,y,z)*range*2));
    return (v);
}

// Add shape s to sheet z
function join(z,s){
    var old = sheet[z];
    sheet[z] = clipUnite(s, sheet[z]);
    old.remove();
    s.remove();
}

// Subtract shape s from sheet z
function cut(z,s){
    var old = sheet[z];
    sheet[z] = clipSubtract(sheet[z], s);
    old.remove();
    s.remove();
}

function drawFrame(z){
    var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
    var insideframe = new Path.Rectangle(new Point(framewidth, framewidth),new Size(wide-framewidth*2, high-framewidth*2)) 
    //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
    //var insideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2-framewidth);


    sheet[z] = clipSubtract(outsideframe, insideframe);
    outsideframe.remove();insideframe.remove();
}


function solid(z){
    outsideframe = new Path.Rectangle(new Point(1,1),new Size(wide-1, high-1), framradius)
    //outsideframe = new Path.Circle(new Point(wide/2),wide/2)
    var old = sheet[z];
    sheet[z] = clipUnite(sheet[z], outsideframe);
    old.remove();
    outsideframe.remove();
}



function frameIt(z){
        //Trim to size
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
        //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
        var old = sheet[z];
        sheet[z] = clipIntersect(outsideframe, sheet[z]);
        old.remove();
        outsideframe.remove();

        //Make sure there is still a solid frame
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
        var insideframe = new Path.Rectangle(new Point(framewidth, framewidth),new Size(wide-framewidth*2, high-framewidth*2))
        //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
        //var insideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2-framewidth);

        var frame = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        var old = sheet[z];
        sheet[z] = clipUnite(sheet[z], frame);
        old.remove();
        frame.remove();
         
        
        sheet[z].style = {fillColor: colors[z].Hex, strokeColor: linecolor.Hex, strokeWidth: 1*ratio,shadowColor: new Color(0,0,0,[0.3]),shadowBlur: 20,shadowOffset: new Point((stacks-z)*2.3, (stacks-z)*2.3)};
}

function cutMarks(z){
    if (z<stacks-1 && z!=0) {
          for (etch=0;etch<stacks-z;etch++){
                var layerEtch = new Path.Circle(new Point(50+etch*10,25),2)
                cut(z,layerEtch)
            } 
        }
}

function signature(z){
    shawn = new CompoundPath(sig);
    shawn.strokeColor = 'green';
    shawn.fillColor = 'green';
    shawn.strokeWidth = 1;
    shawn.scale(ratio*.9)
    shawn.position = new Point(wide-framewidth-~~(shawn.bounds.width/2), high-framewidth+~~(shawn.bounds.height));
    cut(z,shawn)
}

function hanger (z){
    if (z < stacks-2 && scale>0){
        var r = 30*ratio;
        rt = 19*ratio;
        if (z<3){r = 19*ratio}
        layerEtch = new Path.Rectangle(new Point(framewidth/2, framewidth),new Size(r*2, r*3), r)
        layerEtch.position = new Point(framewidth/2,framewidth);   
        cut(z,layerEtch)

        layerEtch = new Path.Rectangle(new Point(wide-framewidth/2, framewidth),new Size(r*2, r*3), r)
        layerEtch.position = new Point(wide-framewidth/2,framewidth);   
        cut(z,layerEtch)

        layerEtch = new Path.Rectangle(new Point(wide/2, framewidth/2),new Size(r*4, r*2), r)
        layerEtch.position = new Point(wide/2,framewidth/2);   
        cut(z,layerEtch)
    }
}




//--------- Interaction functions -----------------------
var interactiontext = "Interactions\nB = Blueprint mode\nV = Export SVG\nP = Export PNG\nC = Export colors as TXT\nE = Show layers\nF = Add floating frame\nL = Format for plotting"

view.onDoubleClick = function(event) {
    alert(interactiontext);
    console.log(project.exportJSON());
    //canvas.toBlob(function(blob) {saveAs(blob, tokenData.hash+'.png');});
};

document.addEventListener('keypress', (event) => {

       //Save as SVG 
       if(event.key == "v") {
            var url = "data:image/svg+xml;utf8," + encodeURIComponent(paper.project.exportSVG({asString:true}));
            var key = [];for (l=stacks;l>0;l--){key[stacks-l] = colors[l-1].Name;}; 
            var svg1 = "<!--"+key+"-->" + paper.project.exportSVG({asString:true})
            var url = "data:image/svg+xml;utf8," + encodeURIComponent(svg1);
            var link = document.createElement("a");
            link.download = fileName;
            link.href = url;
            link.click();
            }


        if(event.key == "f") {
            floatingframe();
            
        }
        
        if(event.key == "1") {
            frameColor = {"Hex":"#4C46380", "Name":"Black"};
            fileName = "FramedBlack-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "2") {
            frameColor = {"Hex":"#f9f9f9","Name":"White"};
            fileName = "FramedWhite-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "3") {
            frameColor = {"Hex":"#60513D","Name":"Walnut"};
            fileName = "FramedWalnut-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "4") {
            frameColor = {"Hex":"#ebd9c0","Name":"Maple"};
            fileName = "FramedMaple-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
            
        if(event.key == "V") {
            fileName = "Vector-"+$fx.hash;
        }  


       //Format for Lightburn
       if(event.key == "b") {
        fileName = "blueprint-"+$fx.hash;
            for (z=0;z<stacks;z++){
                sheet[z].style = {fillColor: null,strokeWidth: .1,strokeColor: lightburn[stacks-z-1].Hex,shadowColor: null,shadowBlur: null,shadowOffset: null}
                sheet[z].selected = true;}
            }

       //Format for plotting
       if(event.key == "l") {
            fileName = "Plotting-"+$fx.hash;

            for (z=0;z<stacks;z++){
            sheet[z].style = {fillColor: null,strokeWidth: .1,strokeColor: plottingColors[stacks-z-1].Hex,shadowColor: null,shadowBlur: null,shadowOffset: null}
            sheet[z].selected = true;
            }
        
            for (z=0;z<stacks;z++){
                if (z<stacks-1){
                    for (zs=z+1;zs<stacks;zs++){
                        var old = sheet[z];
                        sheet[z] = clipSubtract(sheet[z], sheet[zs]);
                        old.remove();
                    }
                }
                console.log("optimizing")
            }
        }

        //new hash
        if(event.key == " ") {
            setquery("fxhash",null);
            location.reload();
            }

        //help
       if(event.key == "h" || event.key == "/") {
            alert(interactiontext);
            }
             
        //Save as PNG
        if(event.key == "p") {
            canvas.toBlob(function(blob) {saveAs(blob, fileName+'.png');});
            }

        //Export colors as txt
        if(event.key == "c") {
            content = JSON.stringify(features,null,2);
            console.log(content);
            var filename = "Colors-"+$fx.hash + ".txt";
            var blob = new Blob([content], {type: "text/plain;charset=utf-8"});
            saveAs(blob, filename);
            }

        //send to studio.shawnkemp.art
        if(event.key == "s") {
            sendAllExports()
            }  

       //Explode the layers     
       if(event.key == "e") {   
            //floatingframe();  
            h=0;t=0;maxwidth=3000;
               for (z=0; z<sheet.length; z++) { 
               sheet[z].scale(1000/2300)   
               sheet[z].position = new Point(wide/2,high/2);        
                    sheet[z].position.x += wide*h;
                    sheet[z].position.y += high*t;
                    sheet[z].selected = true;
                    if (wide*(h+2) > panelWide) {maxwidth=wide*(h+1);h=0;t++;} else{h++};
                    }  
            paper.view.viewSize.width = maxwidth;
            paper.view.viewSize.height = high*(t+1);
           }
 
}, false); 
}