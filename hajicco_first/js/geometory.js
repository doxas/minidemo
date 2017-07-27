// geometory

/* tiledPlanePoint
 * @param {number} res - resolution
 * @return {object}
 *  {vec3} position,
 *  {vec4} color,
 *  {vec2} texCoord,
 *  {vec4} type,
 *  {vec4} random
 */
function tiledPlanePoint(res){
    var i, j, k, l, m, n;
    var x, y, z, r, g, b, a;
    var pos = [];            // position.xyz
    var col = [];            // horizon line alpha, cross line alpha
    var tex = [];            // texCoord.st
    var typ = [];            // xindex, yindex, totalindex
    var rnd = [];            // random float
    var idxHorizonLine = [];
    var idxCrossLine = [];
    n = 0;
    for(i = 0; i <= res; ++i){
        k = (i / res * 2.0 - 1.0);
        m = 1.0 - i / res;
        for(j = 0; j <= res; ++j){
            l = (j / res * 2.0 - 1.0);
            pos.push(l, k, 0.0);
            tex.push(j / res, m);
            typ.push(i, j, n, 0.0);
            rnd.push(Math.random(), Math.random(), Math.random(), Math.random());
            // horizon line index(gl.LINES)
            r = 0.0;
            if(j !== 0 && j < res){
                r = 1.0;
                idxHorizonLine.push(n, n + 1);
            }else if(j === 0){
                r = 0.0;
                idxHorizonLine.push(n, n + 1);
            }else{
                r = 0.0;
                idxHorizonLine.push(n, n - res);
            }
            // cross line index(gl.LINES)
            g = 1.0;
            if(j === 0 && i < res){
                // idxCrossLine.push(n, n + res + 1, n, n + res + 2, n, n + 1);
                idxCrossLine.push(n, n + res + 1, n, n + 1);
            }else if(j === res && i < res){
                idxCrossLine.push(n, n + res + 1);
                // idxCrossLine.push(n, n + res, n, n + res + 1);
            }else if(j < res && i === res){
                idxCrossLine.push(n, n + 1);
            }else if(j < res && i < res){
                // idxCrossLine.push(n, n + res, n, n + res + 1, n, n + res + 2, n, n + 1);
                idxCrossLine.push(n, n + res + 1, n, n + 1);
            }
            b = 0.0;
            a = 0.0;
            col.push(r, g, b, a);
            n++;
        }
    }
    return {
        position: pos,
        color: col,
        texCoord: tex,
        type: typ,
        random: rnd,
        indexHorizon: idxHorizonLine,
        indexCross: idxCrossLine
    };
}

