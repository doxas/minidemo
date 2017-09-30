
/**
 * TODO:
 * lighting (environment mapping)
 * background shader plane
 * post process glare
 */

(() => {
    // variable ===============================================================
    let gl, ext, run, mat4, qtn, count, nowTime;
    let canvas, framebuffer, canvasWidth, canvasHeight;

    // shader
    let basePrg, noisePrg;

    // callback
    let renderedCallback = null;

    // const and flags
    const DEBUG_MODE                 = true;
    const POST_PROCESS               = false;
    const TEXTURE_SAMPLE_IMAGE_UNIT  = 0;
    const TEXTURE_FRAMEBUFFER_UNIT   = 1;
    const GLOBAL_TILE_SCALE          = 0.95;

    // onload =================================================================
    window.addEventListener('load', () => {
        // initialize ---------------------------------------------------------
        gl3.init(document.getElementById('canvas'));
        if(!gl3.ready){
            console.log('initialize error');
            return;
        }
        run           = true;
        canvas        = gl3.canvas;
        gl            = gl3.gl;
        mat4          = gl3.Math.Mat4;
        qtn           = gl3.Math.Qtn;
        canvasWidth   = window.innerWidth;
        canvasHeight  = window.innerHeight;
        canvas.width  = canvasWidth;
        canvas.height = canvasHeight;
        ext = gl.getExtension('ANGLE_instanced_arrays');

        // event --------------------------------------------------------------
        window.addEventListener('keydown', (eve) => {
            if(eve.keyCode === 27){
                run = false;
            }
        }, false);
        if(POST_PROCESS === true){
            window.addEventListener('resize', () => {
                if(framebuffer == null){return;}
                renderedCallback = () => {
                    canvasWidth   = window.innerWidth;
                    canvasHeight  = window.innerHeight;
                    canvas.width  = canvasWidth;
                    canvas.height = canvasHeight;
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
                    gl.activeTexture(gl.TEXTURE0 + TEXTURE_FRAMEBUFFER_UNIT);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                    gl.deleteRenderbuffer(framebuffer.depthRenderbuffer);
                    gl.deleteTexture(framebuffer.texture);
                    gl.deleteFramebuffer(framebuffer.framebuffer);
                    framebuffer = gl3.createFramebuffer(canvasWidth, canvasHeight, TEXTURE_FRAMEBUFFER_UNIT);
                    gl.bindTexture(gl.TEXTURE_2D, framebuffer.texture);
                };
            }, false);
        }

        // controls -----------------------------------------------------------
        if(DEBUG_MODE){
            let wrapper = new gl3.Gui.Wrapper().getElement();
            document.body.appendChild(wrapper);

            let slider = new gl3.Gui.Slider('test', 50, 0, 100, 1);
            slider.add('input', (eve, self) => {console.log(self.getValue());});
            wrapper.appendChild(slider.getElement());

            let check = new gl3.Gui.Checkbox('hoge', false);
            check.add('change', (eve, self) => {console.log(self.getValue());});
            wrapper.appendChild(check.getElement());

            let select = new gl3.Gui.Select('fuga', ['foo', 'baa'], 0);
            select.add('change', (eve, self) => {console.log(self.getValue());});
            wrapper.appendChild(select.getElement());

            let spin = new gl3.Gui.Spin('hoge', 0.0, -1.0, 1.0, 0.1);
            spin.add('input', (eve, self) => {console.log(self.getValue());});
            wrapper.appendChild(spin.getElement());

            let color = new gl3.Gui.Color('fuga', '#0a2c4e');
            color.add('change', (eve, self) => {console.log(self.getValue());});
            wrapper.appendChild(color.getElement());
        }

        gl3.createTextureFromFile('image/sample.jpg', TEXTURE_SAMPLE_IMAGE_UNIT, shaderLoader);
    }, false);

    function shaderLoader(){
        // base texture program
        basePrg = gl3.createProgramFromFile(
            'shader/base.vert',
            'shader/base.frag',
            ['position', 'normal', 'instPosition', 'instScale'],
            [4, 3, 2, 2],
            [
                'mMatrix', 'mvpMatrix', 'normalMatrix',
                'globalScale',
                'eyePosition',
                'lightPosition',
                'ambient',
                'specularPower',
                'globalAlpha',
                'texture'
            ],
            [
                'matrix4fv', 'matrix4fv', 'matrix4fv',
                '1f',
                '3fv',
                '3fv',
                '3fv',
                '1f',
                '1f',
                '1i'
            ],
            shaderLoadCheck
        );
        noisePrg = gl3.createProgramFromFile(
            'shader/noise.vert',
            'shader/noise.frag',
            ['position'],
            [3],
            ['textureUnit', 'resolution', 'time'],
            ['1i', '2fv', '1f'],
            shaderLoadCheck
        );
        function shaderLoadCheck(){
            if(
                basePrg.prg != null &&
                noisePrg.prg != null &&
                true
            ){
                init();
            }
        }
    }

    // initialize and rendering ===============================================
    function init(){
        // block tile
        let blockPosition = [];
        let blockNormal   = [];
        let blockIndex    = [];
        ((size, scale, height) => {
            let w = size / 2.0;
            let s = w * scale;
            let t = w - s;
            blockPosition.push(
                -w,  w,    0.0, 0.0,  -w,  w,    0.0, 0.0,
                 w,  w,    0.0, 0.0,   w,  w,    0.0, 0.0,
                -w, -w,    0.0, 0.0,  -w, -w,    0.0, 0.0,
                 w, -w,    0.0, 0.0,   w, -w,    0.0, 0.0,
                -s,  s, height,   t,  -s,  s, height,   t,
                 s,  s, height,   t,   s,  s, height,   t,
                -s, -s, height,   t,  -s, -s, height,   t,
                 s, -s, height,   t,   s, -s, height,   t,
                -s,  s, height,   t,
                 s,  s, height,   t,
                -s, -s, height,   t,
                 s, -s, height,   t
            );
            let v = gl3.Math.Vec3.normalize([0.0, -t, height]);
            let e     = [  0.0,  v[2], -v[1]];
            let up    = [ e[0],  e[1],  e[2]];
            let right = [ e[1],  e[0],  e[2]];
            let down  = [ e[0], -e[1],  e[2]];
            let left  = [-e[1],  e[0],  e[2]];
            blockNormal.push(
                 left[0],  left[1],  left[2],    up[0],    up[1],    up[2],
                   up[0],    up[1],    up[2], right[0], right[1], right[2],
                 down[0],  down[1],  down[2],  left[0],  left[1],  left[2],
                right[0], right[1], right[2],  down[0],  down[1],  down[2],
                 left[0],  left[1],  left[2],    up[0],    up[1],    up[2],
                   up[0],    up[1],    up[2], right[0], right[1], right[2],
                 down[0],  down[1],  down[2],  left[0],  left[1],  left[2],
                right[0], right[1], right[2],  down[0],  down[1],  down[2],
                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0
            );
            blockIndex.push(
                 1,  9,  2,  2,  9, 10,
                 3, 11,  6,  6, 11, 14,
                 7, 15,  4,  4, 15, 12,
                 5, 13,  0,  0, 13,  8,
                16, 18, 17, 17, 18, 19
            );
        })(2.0, 0.8, 0.1);

        // tile floor
        let floorPosition = [];
        let floorScale = [];
        ((width, size) => {
            let hw = width / 2.0;
            let bw = width / size;
            let bw2 = bw / 2.0;
            let bw4 = bw / 4.0;
            for(let i = 0; i < size; ++i){
                let x = -hw + i * bw;
                for(let j = 0; j < size; ++j){
                    let y = -hw + j * bw;
                    let type = Math.max(Math.floor(Math.random() * 10) - 3, 0);
                    switch(type){
                        case 0: // plane
                            floorPosition.push(x + bw2, y + bw2);
                            floorScale.push(1.0, 1.0);
                            break;
                        case 1: // vsplit
                            floorPosition.push(x + bw4, y + bw2, x + bw2 + bw4, y + bw2);
                            floorScale.push(0.5, 1.0, 0.5, 1.0);
                            break;
                        case 2: // hsplit
                            floorPosition.push(x + bw2, y + bw4, x + bw2, y + bw2 + bw4);
                            floorScale.push(1.0, 0.5, 1.0, 0.5);
                            break;
                        case 3: // vsplit left block hsplit
                            floorPosition.push(
                                x + bw4,       y + bw4,
                                x + bw4,       y + bw2 + bw4,
                                x + bw2 + bw4, y + bw2
                            );
                            floorScale.push(
                                0.5, 0.5,
                                0.5, 0.5,
                                0.5, 1.0
                            );
                            break;
                        case 4: // vsplit right block hsplit
                            floorPosition.push(
                                x + bw4,       y + bw2,
                                x + bw2 + bw4, y + bw4,
                                x + bw2 + bw4, y + bw2 + bw4
                            );
                            floorScale.push(
                                0.5, 1.0,
                                0.5, 0.5,
                                0.5, 0.5
                            );
                            break;
                        case 5: // hsplit top block vsplit
                            floorPosition.push(
                                x + bw4,       y + bw4,
                                x + bw2 + bw4, y + bw4,
                                x + bw2,       y + bw2 + bw4
                            );
                            floorScale.push(
                                0.5, 0.5,
                                0.5, 0.5,
                                1.0, 0.5
                            );
                            break;
                        case 6: // hsplit bottom block vsplit
                            floorPosition.push(
                                x + bw2,       y + bw4,
                                x + bw4,       y + bw2 + bw4,
                                x + bw2 + bw4, y + bw2 + bw4
                            );
                            floorScale.push(
                                1.0, 0.5,
                                0.5, 0.5,
                                0.5, 0.5
                            );
                            break;
                        default: // full split
                            floorPosition.push(
                                x + bw4,       y + bw4,
                                x + bw2 + bw4, y + bw4,
                                x + bw4,       y + bw2 + bw4,
                                x + bw2 + bw4, y + bw2 + bw4
                            );
                            floorScale.push(
                                0.5, 0.5,
                                0.5, 0.5,
                                0.5, 0.5,
                                0.5, 0.5
                            );
                            break;
                    }
                }
            }
        })(20.0, 10);

        // block and tile
        let blockVBO = [
            gl3.createVbo(blockPosition),
            gl3.createVbo(blockNormal)
        ];
        let instancePositionVBO = gl3.createVbo(floorPosition);
        let instanceScaleVBO = gl3.createVbo(floorScale);
        let blockIBO = gl3.createIbo(blockIndex);
        let instanceCount = floorPosition.length / 2;

        // plane
        let planePosition = [
            -1.0,  1.0,  0.0,
             1.0,  1.0,  0.0,
            -1.0, -1.0,  0.0,
             1.0, -1.0,  0.0
        ];
        let planeIndex = [
            0, 2, 1,
            1, 2, 3
        ];
        let planeVBO = [
            gl3.createVbo(planePosition)
        ];
        let planeIBO = gl3.createIbo(planeIndex);

        // matrix
        let mMatrix         = mat4.identity(mat4.create());
        let vMatrix         = mat4.identity(mat4.create());
        let pMatrix         = mat4.identity(mat4.create());
        let vpMatrix        = mat4.identity(mat4.create());
        let mvpMatrix       = mat4.identity(mat4.create());
        let normalMatrix    = mat4.identity(mat4.create());
        let invMatrix       = mat4.identity(mat4.create());
        let transposeMatrix = mat4.identity(mat4.create());

        // framebuffer
        framebuffer = gl3.createFramebuffer(canvasWidth, canvasHeight, TEXTURE_FRAMEBUFFER_UNIT);

        // texture
        gl3.textures.map((v, i) => {
            if(v != null && v.texture != null){
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, v.texture);
            }
        });

        // flags
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

        // variables
        let beginTime = Date.now();
        let nowTime = 0;
        let cameraPosition = [0.0, 0.0, 20.0];
        let centerPoint    = [0.0, 0.0, 0.0];
        let upDirection    = [0.0, 1.0, 0.0];
        let lightPosition  = [2.5, 5.0, 5.0];
        let ambientColor   = [1.0, 1.0, 1.0];
        let specularPower  = 0.1;
        let globalAlpha    = 1.0;

        render();
        function render(){
            nowTime = Date.now() - beginTime;
            nowTime /= 1000;
            count++;

            // animation
            if(run){requestAnimationFrame(render);}

            // canvas
            canvasWidth   = window.innerWidth;
            canvasHeight  = window.innerHeight;
            canvas.width  = canvasWidth;
            canvas.height = canvasHeight;

            // view x proj
            mat4.vpFromCameraProperty(
                cameraPosition,
                centerPoint,
                upDirection,
                60,
                canvasWidth / canvasHeight,
                0.1,
                50.0,
                vMatrix, pMatrix, vpMatrix
            );

            // render to framebuffer ==========================================
            if(POST_PROCESS === true){gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.framebuffer);}
            gl3.sceneView(0, 0, canvasWidth, canvasHeight);
            gl3.sceneClear([0.955, 0.975, 0.995, 1.0], 1.0);

            // block rendering
            basePrg.useProgram();
            basePrg.setAttribute(blockVBO, blockIBO);
            gl.bindBuffer(gl.ARRAY_BUFFER, instancePositionVBO);
            gl.enableVertexAttribArray(basePrg.attL[2]);
            gl.vertexAttribPointer(basePrg.attL[2], basePrg.attS[2], gl.FLOAT, false, 0, 0);
            ext.vertexAttribDivisorANGLE(basePrg.attL[2], 1);
            gl.bindBuffer(gl.ARRAY_BUFFER, instanceScaleVBO);
            gl.enableVertexAttribArray(basePrg.attL[3]);
            gl.vertexAttribPointer(basePrg.attL[3], basePrg.attS[3], gl.FLOAT, false, 0, 0);
            ext.vertexAttribDivisorANGLE(basePrg.attL[3], 1);
            mat4.identity(mMatrix);
            mat4.multiply(vpMatrix, mMatrix, mvpMatrix);
            mat4.inverse(mMatrix, invMatrix);
            mat4.transpose(invMatrix, normalMatrix);
            mat4.transpose(mMatrix, transposeMatrix);
            basePrg.pushShader([
                mMatrix,
                mvpMatrix,
                normalMatrix,
                GLOBAL_TILE_SCALE,
                cameraPosition,
                lightPosition,
                ambientColor,
                specularPower,
                globalAlpha,
                TEXTURE_SAMPLE_IMAGE_UNIT
            ]);
            ext.drawElementsInstancedANGLE(gl.TRIANGLES, blockIndex.length, gl.UNSIGNED_SHORT, 0, instanceCount);

            if(POST_PROCESS === true){
                // render to canvas
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl3.sceneView(0, 0, canvasWidth, canvasHeight);
                gl3.sceneClear([0.0, 0.0, 0.0, 1.0], 1.0);

                // program
                noisePrg.useProgram();
                noisePrg.setAttribute(planeVBO, planeIBO);
                noisePrg.pushShader([TEXTURE_FRAMEBUFFER_UNIT, [canvasWidth, canvasHeight], nowTime]);
                gl3.drawElements(gl.TRIANGLES, planeIndex.length);
            }

            // final
            gl.flush();

            // callback
            if(renderedCallback != null){
                renderedCallback();
                renderedCallback = null;
            }
        }
    }

    class DrawCircleToCanvas {
        constructor(size){
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.canvas.height = size;
            this.ctx = this.canvas.getContext('2d');
        }
        drawGradationShadow(colorRGB){
            let center = [this.canvas.width / 2, this.canvas.height / 2];
            let radius = Math.min(center[0], center[1]) * 0.9;
            let colorFill = 'rgba(' + colorRGB.join(',') + ', 0.0)';
            let colorShadow = 'rgba(' + colorRGB.join(',') + ', 0.5)';
            let gradient = this.ctx.createRadialGradient(
                center[0], center[1], radius,
                center[0], center[1], 0,
            );
            gradient.addColorStop(0, colorFill);
            gradient.addColorStop(1, colorShadow);
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        getElement(){
            return this.canvas;
        }
    }
})();

