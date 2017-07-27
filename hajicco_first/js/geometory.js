
/**
 * @param {number} res - resolution
 */
function geo(res){
    let x, y, index = 0, r = Math.random;
    let pos = []; // position.xyz
    let rnd = []; // random float
    let idx = []; // index
    for(let i = 0; i <= res; ++i){
        y = (i / res) * 2.0 - 1.0;
        for(let j = 0; j <= res; ++j){
            x = (j / res) * 2.0 - 1.0;
            pos.push(x, y, -0.1, x, y, 0.1);
            rnd.push(r(), r(), r(), r(), r(), r(), r(), r());
            idx.push(index, index + 1);
            index += 2;
        }
    }
    return {
        position: pos,
        random: rnd,
        index: idx
    };
}

