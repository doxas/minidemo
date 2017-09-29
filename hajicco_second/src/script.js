
/**
 * TODO:
 */

(() => {
    // variable ===============================================================
    let gl, run, mat4, qtn, count, nowTime, camera;
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
        camera        = new InteractionCamera();
        canvasWidth   = window.innerWidth;
        canvasHeight  = window.innerHeight;
        canvas.width  = canvasWidth;
        canvas.height = canvasHeight;

        // event --------------------------------------------------------------
        window.addEventListener('keydown', (eve) => {
            if(eve.keyCode === 27){
                run = false;
            }
        }, false);
        canvas.addEventListener('mousedown', camera.startEvent, false);
        canvas.addEventListener('mousemove', camera.moveEvent, false);
        canvas.addEventListener('mouseup', camera.endEvent, false);
        canvas.addEventListener('wheel', camera.wheelEvent, false);
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
            ['position', 'normal', 'color', 'texCoord'],
            [3, 3, 4, 2],
            [
                'mMatrix', 'mvpMatrix', 'normalMatrix',
                'eyePosition',
                'lightPosition',
                'ambient',
                'specularPower',
                'globalAlpha',
                'texture'
            ],
            [
                'matrix4fv', 'matrix4fv', 'matrix4fv',
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
        // sphere
        let sphereData = gl3.Mesh.sphere(64, 128, 1.0, [1.0, 1.0, 1.0, 1.0]);
        let sphereVBO = [
            gl3.createVbo(sphereData.position),
            gl3.createVbo(sphereData.normal),
            gl3.createVbo(sphereData.color),
            gl3.createVbo(sphereData.texCoord)
        ];
        let sphereIBO = gl3.createIbo(sphereData.index);

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
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

        // variables
        let beginTime = Date.now();
        let nowTime = 0;
        let cameraPosition = [0.0, 0.0, 3.0];
        let centerPoint    = [0.0, 0.0, 0.0];
        let upDirection    = [0.0, 1.0, 0.0];
        let lightPosition  = [2.5, 5.0, 5.0];
        let ambientColor   = [0.075, 0.085, 0.1];
        let specularPower  = 0.1;
        let globalAlpha    = 0.25;

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
                60 * camera.scale,
                canvasWidth / canvasHeight,
                0.1,
                10.0,
                vMatrix, pMatrix, vpMatrix
            );

            // render to framebuffer ==========================================
            if(POST_PROCESS === true){gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.framebuffer);}
            gl3.sceneView(0, 0, canvasWidth, canvasHeight);
            gl3.sceneClear([0.955, 0.975, 0.995, 1.0], 1.0);

            // sphere rendering
            basePrg.useProgram();
            basePrg.setAttribute(sphereVBO, sphereIBO);
            mat4.identity(mMatrix);
            camera.update();
            mMatrix = qtn.toMatIV(camera.qtn, mMatrix);
            mat4.rotate(mMatrix, nowTime * -0.1, [0.0, 1.0, 0.0], mMatrix);
            mat4.multiply(vpMatrix, mMatrix, mvpMatrix);
            mat4.inverse(mMatrix, invMatrix);
            mat4.transpose(invMatrix, normalMatrix);
            mat4.transpose(mMatrix, transposeMatrix);
            basePrg.pushShader([
                mMatrix,
                mvpMatrix,
                normalMatrix,
                cameraPosition,
                lightPosition,
                ambientColor,
                specularPower,
                globalAlpha,
                TEXTURE_SAMPLE_IMAGE_UNIT
            ]);
            gl3.drawElements(gl.TRIANGLES, sphereData.index.length);

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

    /**
     * @class InteractionCamera
     * @example
     * let camera = new InteractionCamera();
     * window.addEventListener('mousedown', camera.startEvent, false);
     * window.addEventListener('mousemove', camera.moveEvent, false);
     * window.addEventListener('mouseup', camera.endEvent, false);
     * camera.update();
     * mMatrix = gl3.Math.Qtn.toMat4(camera.qtn, mMatrix);
     */
    class InteractionCamera {
        /**
         * @constructor
         */
        constructor(){
            this.qtn               = qtn.identity(qtn.create());
            this.dragging          = false;
            this.prevMouse         = [0, 0];
            this.rotationScale     = Math.min(window.innerWidth, window.innerHeight);
            this.rotation          = 0.0;
            this.rotateAxis        = [0.0, 0.0, 0.0];
            this.rotatePower       = 1.5;
            this.rotateAttenuation = 0.9;
            this.scale             = 1.0;
            this.scalePower        = 0.0;
            this.scaleAttenuation  = 0.8;
            this.scaleMin          = 0.5;
            this.scaleMax          = 1.5;
            this.startEvent        = this.startEvent.bind(this);
            this.moveEvent         = this.moveEvent.bind(this);
            this.endEvent          = this.endEvent.bind(this);
            this.wheelEvent        = this.wheelEvent.bind(this);
        }
        /**
         * mouse down event
         * @param {Event} eve - event object
         */
        startEvent(eve){
            this.dragging = true;
            this.prevMouse = [eve.pageX, eve.pageY];
        }
        /**
         * mouse move event
         * @param {Event} eve - event object
         */
        moveEvent(eve){
            if(this.dragging !== true){return;}
            let x = this.prevMouse[0] - eve.pageX;
            let y = this.prevMouse[1] - eve.pageY;
            this.rotation = Math.sqrt(x * x + y * y) / this.rotationScale * this.rotatePower;
            this.rotateAxis[0] = y;
            this.rotateAxis[1] = x;
            this.prevMouse = [eve.pageX, eve.pageY];
        }
        /**
         * mouse up event
         */
        endEvent(){
            this.dragging = false;
        }
        /**
         * wheel event
         * @param {Event} eve - event object
         */
        wheelEvent(eve){
            let w = eve.wheelDelta;
            if(w > 0){
                this.scalePower = 0.01;
            }else if(w < 0){
                this.scalePower = -0.01;
            }
        }
        /**
         * quaternion update
         */
        update(){
            this.scalePower *= this.scaleAttenuation;
            this.scale = Math.max(this.scaleMin, Math.min(this.scaleMax, this.scale + this.scalePower));
            if(this.rotation === 0.0){return;}
            this.rotation *= this.rotateAttenuation;
            let q = qtn.identity(qtn.create());
            q = qtn.rotate(this.rotation, this.rotateAxis);
            this.qtn = qtn.multiply(this.qtn, q);
        }
    }
})();

