var _ = require('../helper/util');


function Color(channels, alpha, lineno){
    this.type = 'color';
    if(typeof channels === 'string'){
        var string = channels.charAt(0) === '#'? channels.slice(1) : channels;
        if (string.length === 6) {
            channels = [
                parseInt(string.substr(0, 2), 16), 
                parseInt(string.substr(2, 2), 16), 
                parseInt(string.substr(4, 2), 16) 
            ];
        }else {
            var r = string.substr(0, 1);
            var g = string.substr(1, 1);
            var b = string.substr(2, 1);
            channels = [
                parseInt(r + r, 16), 
                parseInt(g + g, 16), 
                parseInt(b + b, 16)
            ];
        }
    }
    this[0] = channels[0];
    this[1] = channels[1];
    this[2] = channels[2];
    Color.limit(this);
    this.alpha = alpha == null? 1: alpha;
    this.lineno = lineno;
}

var c = Color.prototype;


c.toHSL = function(){
    return Color.rgb2hsl(this);
}


c.toCSS = function(argb){
    var r = Math.round(this[0]),
        g = Math.round(this[1]),
        b = Math.round(this[2]);
    if(this.alpha == null || this.alpha === 1|| argb){
        var rs = r.toString(16),
            gs = g.toString(16),
            bs = b.toString(16),
            as = Math.floor(this.alpha*255).toString(16);
        if(rs.length === 1) rs = '0' + rs;
        if(gs.length === 1) gs = '0' + gs;
        if(bs.length === 1) bs = '0' + bs;
        if(as.length === 1) as = '0' + as;
        if(!argb && rs[0] == rs[1] && gs[0] == gs[1] && bs[0] == bs[1]){
            gs = gs[0]
            bs = bs[0]
            rs = rs[0]
        }
        return '#' + (this.alpha == 1? '' : as) + rs + gs + bs;
    }else{
        return 'rgba(' + r + ',' + g + ',' + b + ',' + this.alpha +')';
    }
}

c.clone = function(){
    return new Color(this, this.alpha, this.lineno);
}

//@copyright
//https://github.com/bgrins/TinyColor
Color.rgb2hsl = function(rv, hv){
    hv = hv || [];
    var r = rv[0]/ 255,
        g = rv[1]/ 255,
        b = rv[2]/ 255,
        max = Math.max(r, g, b), 
        min = Math.min(r, g, b),
        h, s, l = (max + min) / 2,
        d;

    if(max == min) {
        h = 0; 
        s = 0;
    }
    else {
        var d = max - min;
        s = l >= 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    hv[0] = h * 360;
    hv[1] = s * 100;
    hv[2] = l * 100;
    return hv;
}

//@copyright
//https://github.com/bgrins/TinyColor
Color.hsl2rgb = function(hv, rv){
    rv = rv || [];
    var r, g, b,
        h = hv[0]/360,
        s = hv[1]/100,
        l = hv[2]/100;

    function hue2rgb(p, q, t) {
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1/6) return p + (q - p) * 6 * t;
        if(t < 1/2) return q;
        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }

    if(s === 0) {
        r = g = b = l; // achromatic
    }
    else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    rv[0] = r * 255;
    rv[1] = g * 255;
    rv[2] = b * 255;
    return rv;
}

Color.limit= function(values){
    values[0] = _.limit(values[0],0, 255);
    values[1] = _.limit(values[1],0, 255);
    values[2] = _.limit(values[2],0, 255);
    if(values.alpha) values.alpha = _.limit(values.alpha,0, 1);
}

Color.hsl = function(channels, a){
    return new Color(Color.hsl2rgb(channels), a);    
}

// Color keyword
// ---------
// http://www.w3.org/TR/2011/REC-css3-color-20110607/#svg-color
Color.maps = {
    aliceblue: [240,248,255],
    antiquewhite: [250,235,215],
    aqua: [0,255,255],
    aquamarine: [127,255,212],
    azure: [240,255,255],
    beige: [245,245,220],
    bisque: [255,228,196],
    black: [0,0,0],
    blanchedalmond: [255,235,205],
    blue: [0,0,255],
    blueviolet: [138,43,226],
    brown: [165,42,42],
    burlywood: [222,184,135],
    cadetblue: [95,158,160],
    chartreuse: [127,255,0],
    chocolate: [210,105,30],
    coral: [255,127,80],
    cornflowerblue: [100,149,237],
    cornsilk: [255,248,220],
    crimson: [220,20,60],
    cyan: [0,255,255],
    darkblue: [0,0,139],
    darkcyan: [0,139,139],
    darkgoldenrod: [184,134,11],
    darkgray: [169,169,169],
    darkgreen: [0,100,0],
    darkgrey: [169,169,169],
    darkkhaki: [189,183,107],
    darkmagenta: [139,0,139],
    darkolivegreen: [85,107,47],
    darkorange: [255,140,0],
    darkorchid: [153,50,204],
    darkred: [139,0,0],
    darksalmon: [233,150,122],
    darkseagreen: [143,188,143],
    darkslateblue: [72,61,139],
    darkslategray: [47,79,79],
    darkslategrey: [47,79,79],
    darkturquoise: [0,206,209],
    darkviolet: [148,0,211],
    deeppink: [255,20,147],
    deepskyblue: [0,191,255],
    dimgray: [105,105,105],
    dimgrey: [105,105,105],
    dodgerblue: [30,144,255],
    firebrick: [178,34,34],
    floralwhite: [255,250,240],
    forestgreen: [34,139,34],
    fuchsia: [255,0,255],
    gainsboro: [220,220,220],
    ghostwhite: [248,248,255],
    gold: [255,215,0],
    goldenrod: [218,165,32],
    gray: [128,128,128],
    green: [0,128,0],
    greenyellow: [173,255,47],
    grey: [128,128,128],
    honeydew: [240,255,240],
    hotpink: [255,105,180],
    indianred: [205,92,92],
    indigo: [75,0,130],
    ivory: [255,255,240],
    khaki: [240,230,140],
    lavender: [230,230,250],
    lavenderblush: [255,240,245],
    lawngreen: [124,252,0],
    lemonchiffon: [255,250,205],
    lightblue: [173,216,230],
    lightcoral: [240,128,128],
    lightcyan: [224,255,255],
    lightgoldenrodyellow: [250,250,210],
    lightgray: [211,211,211],
    lightgreen: [144,238,144],
    lightgrey: [211,211,211],
    lightpink: [255,182,193],
    lightsalmon: [255,160,122],
    lightseagreen: [32,178,170],
    lightskyblue: [135,206,250],
    lightslategray: [119,136,153],
    lightslategrey: [119,136,153],
    lightsteelblue: [176,196,222],
    lightyellow: [255,255,224],
    lime: [0,255,0],
    limegreen: [50,205,50],
    linen: [250,240,230],
    magenta: [255,0,255],
    maroon: [128,0,0],
    mediumaquamarine: [102,205,170],
    mediumblue: [0,0,205],
    mediumorchid: [186,85,211],
    mediumpurple: [147,112,219],
    mediumseagreen: [60,179,113],
    mediumslateblue: [123,104,238],
    mediumspringgreen: [0,250,154],
    mediumturquoise: [72,209,204],
    mediumvioletred: [199,21,133],
    midnightblue: [25,25,112],
    mintcream: [245,255,250],
    mistyrose: [255,228,225],
    moccasin: [255,228,181],
    navajowhite: [255,222,173],
    navy: [0,0,128],
    oldlace: [253,245,230],
    olive: [128,128,0],
    olivedrab: [107,142,35],
    orange: [255,165,0],
    orangered: [255,69,0],
    orchid: [218,112,214],
    palegoldenrod: [238,232,170],
    palegreen: [152,251,152],
    paleturquoise: [175,238,238],
    palevioletred: [219,112,147],
    papayawhip: [255,239,213],
    peachpuff: [255,218,185],
    peru: [205,133,63],
    pink: [255,192,203],
    plum: [221,160,221],
    powderblue: [176,224,230],
    purple: [128,0,128],
    red: [255,0,0],
    rosybrown: [188,143,143],
    royalblue: [65,105,225],
    saddlebrown: [139,69,19],
    salmon: [250,128,114],
    sandybrown: [244,164,96],
    seagreen: [46,139,87],
    seashell: [255,245,238],
    sienna: [160,82,45],
    silver: [192,192,192],
    skyblue: [135,206,235],
    slateblue: [106,90,205],
    slategray: [112,128,144],
    slategrey: [112,128,144],
    snow: [255,250,250],
    springgreen: [0,255,127],
    steelblue: [70,130,180],
    tan: [210,180,140],
    teal: [0,128,128],
    thistle: [216,191,216],
    tomato: [255,99,71],
    turquoise: [64,224,208],
    violet: [238,130,238],
    wheat: [245,222,179],
    white: [255,255,255],
    whitesmoke: [245,245,245],
    yellow: [255,255,0],
    yellowgreen: [154,205,50]
}
module.exports = Color;
