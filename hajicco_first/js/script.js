// ----------------------------------------------------------------------------
//
// hajicco first
//
// ----------------------------------------------------------------------------

/*global gl3*/

/* textures
 * 0: draw target framebuffer
 * 1: gauss horizon
 * 2: gauss vertical
 * 3: noise buffer
 * 4: position buffer
 * 5: position swap buffer
 * 6: velocity buffer
 * 7: velocity swap buffer
 */

/* shaders
 * scenePrg   : base scene program
 * finalPrg   : final scene program
 * noisePrg   : noise program
 * gaussPrg   : gauss blur program
 * positionPrg: gpgpu position update program
 * velocityPrg: gpgpu velocity update program
 */

(() => {
    // variable ===============================================================
    let canvas, gl, ext, run, mat4, qtn;
    let scenePrg, finalPrg, noisePrg, gaussPrg, positionPrg, velocityPrg;
    let gWeight, nowTime;
    let canvasWidth, canvasHeight, bufferSize, gpgpuBufferSize;

    // variable initialize ====================================================
    run = true;
    mat4 = gl3.mat4;
    qtn = gl3.qtn;
    bufferSize = 1024;
    gpgpuBufferSize = 64;

    // const variable =========================================================
    let DEFAULT_CAM_POSITION = [0.0, 0.0, 3.0];
    let DEFAULT_CAM_CENTER   = [0.0, 0.0, 0.0];
    let DEFAULT_CAM_UP       = [0.0, 1.0, 0.0];

    // onload =================================================================
    window.addEventListener('load', () => {
        // gl3 initialize
        gl3.initGL('canvas');
        if(!gl3.ready){console.log('initialize error'); return;}
        canvas = gl3.canvas; gl = gl3.gl;
        canvas.width  = canvasWidth = window.innerWidth;
        canvas.height = canvasHeight = window.innerHeight;

        // extension
        ext = {};
        ext.elementIndexUint = gl.getExtension('OES_element_index_uint');
        ext.textureFloat = gl.getExtension('OES_texture_float');
        ext.drawBuffers = gl.getExtension('WEBGL_draw_buffers');

        // event
        window.addEventListener('keydown', (eve) => {
            run = (eve.keyCode !== 27);
            console.log(nowTime);
        }, true);

        shaderLoader();
    }, false);

    function shaderLoader(){
        // programs
        scenePrg = gl3.program.create_from_file(
            'shader/planePoint.vert',
            'shader/planePoint.frag',
            ['position', 'color', 'texCoord', 'type', 'random'],
            [3, 4, 2, 4, 4],
            ['mvpMatrix', 'positionTexture', 'time', 'globalColor'],
            ['matrix4fv', '1i', '1f', '4fv'],
            shaderLoadCheck
        );

        // final program
        finalPrg = gl3.program.create_from_file(
            'shader/final.vert',
            'shader/final.frag',
            ['position'],
            [3],
            ['globalColor', 'texture', 'time', 'resolution'],
            ['4fv', '1i', '1f', '2fv'],
            shaderLoadCheck
        );

        // noise program
        noisePrg = gl3.program.create_from_file(
            'shader/noise.vert',
            'shader/noise.frag',
            ['position'],
            [3],
            ['resolution'],
            ['2fv'],
            shaderLoadCheck
        );

        // gauss program
        gaussPrg = gl3.program.create_from_file(
            'shader/gaussian.vert',
            'shader/gaussian.frag',
            ['position'],
            [3],
            ['resolution', 'horizontal', 'weight', 'texture'],
            ['2fv', '1i', '1fv', '1i'],
            shaderLoadCheck
        );

        // gpgpu position program
        positionPrg = gl3.program.create_from_file(
            'shader/gpgpuPosition.vert',
            'shader/gpgpuPosition.frag',
            ['position', 'texCoord'],
            [3, 2],
            ['time', 'noiseTexture', 'previousTexture', 'velocityTexture'],
            ['1f', '1i', '1i', '1i'],
            shaderLoadCheck
        );

        // gpgpu velocity program
        velocityPrg = gl3.program.create_from_file(
            'shader/gpgpuVelocity.vert',
            'shader/gpgpuVelocity.frag',
            ['position', 'texCoord'],
            [3, 2],
            ['time', 'noiseTexture', 'previousTexture'],
            ['1f', '1i', '1i'],
            shaderLoadCheck
        );

        function shaderLoadCheck(){
            if(scenePrg.prg    != null &&
               finalPrg.prg    != null &&
               noisePrg.prg    != null &&
               gaussPrg.prg    != null &&
               positionPrg.prg != null &&
               velocityPrg.prg != null &&
            true){
                init();
            }
        }
    }

    function init(){
        let resetBufferFunction = null;
        window.addEventListener('resize', () => {
            resetBufferFunction = generateScreenBuffer;
            run = false;
        }, false);

        // application setting
        canvasWidth   = window.innerWidth;
        canvasHeight  = window.innerHeight;
        canvas.width  = canvasWidth;
        canvas.height = canvasHeight;
        gWeight = gaussWeight(20, 100.0);

        // tiled plane point mesh
        let tiledPlanePointData = tiledPlanePoint(gpgpuBufferSize);
        let tiledPlanePointVBO = [
            gl3.create_vbo(tiledPlanePointData.position),
            gl3.create_vbo(tiledPlanePointData.color),
            gl3.create_vbo(tiledPlanePointData.texCoord),
            gl3.create_vbo(tiledPlanePointData.type),
            gl3.create_vbo(tiledPlanePointData.random)
        ];
        let tiledPlaneHorizonLineIBO = gl3.create_ibo_int(tiledPlanePointData.indexHorizon);
        let tiledPlaneCrossLineIBO = gl3.create_ibo_int(tiledPlanePointData.indexCross);
        let tiledPlanePointLength = tiledPlanePointData.position.length / 3;

        // plane mesh
        let planePosition = [
            -1.0,  1.0,  0.0,
             1.0,  1.0,  0.0,
            -1.0, -1.0,  0.0,
             1.0, -1.0,  0.0
        ];
        let planeTexCoord = [
            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,
            1.0, 1.0
        ];
        let planeIndex = [
            0, 2, 1, 1, 2, 3
        ];
        let planeVBO = [gl3.create_vbo(planePosition)];
        let planeTexCoordVBO = [
            gl3.create_vbo(planePosition),
            gl3.create_vbo(planeTexCoord)
        ];
        let planeIBO = gl3.create_ibo_int(planeIndex);

        // matrix
        let mMatrix = mat4.identity(mat4.create());
        let vMatrix = mat4.identity(mat4.create());
        let pMatrix = mat4.identity(mat4.create());
        let vpMatrix = mat4.identity(mat4.create());
        let mvpMatrix = mat4.identity(mat4.create());
        let invMatrix = mat4.identity(mat4.create());

        // frame buffer
        let frameBuffer, hGaussBuffer, vGaussBuffer;
        generateScreenBuffer();
        function generateScreenBuffer(){
            if(frameBuffer != null){
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                let arr = [frameBuffer, hGaussBuffer, vGaussBuffer];
                for(let i = 0; i < 3; ++i){
                    gl.activeTexture(gl.TEXTURE0 + i);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                    gl.deleteTexture(arr[i].texture);
                    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
                    gl.deleteRenderbuffer(arr[i].depthRenderbuffer);
                    gl.deleteFramebuffer(arr[i].framebuffer);
                }
            }
            frameBuffer  = gl3.create_framebuffer(canvasWidth, canvasHeight, 0);
            hGaussBuffer = gl3.create_framebuffer(canvasWidth, canvasHeight, 1);
            vGaussBuffer = gl3.create_framebuffer(canvasWidth, canvasHeight, 2);
            for(let i = 0; i < 3; ++i){
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, gl3.textures[i].texture);
            }
        }
        let noiseBuffer = gl3.create_framebuffer(bufferSize, bufferSize, 3);
        let positionBuffer = [];
        positionBuffer[0] = gl3.create_framebuffer_float(gpgpuBufferSize, gpgpuBufferSize, 4);
        positionBuffer[1] = gl3.create_framebuffer_float(gpgpuBufferSize, gpgpuBufferSize, 5);
        let velocityBuffer = [];
        velocityBuffer[0] = gl3.create_framebuffer_float(gpgpuBufferSize, gpgpuBufferSize, 6);
        velocityBuffer[1] = gl3.create_framebuffer_float(gpgpuBufferSize, gpgpuBufferSize, 7);

        // texture setting
        (() => {
            let i;
            for(i = 0; i < 8; ++i){
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, gl3.textures[i].texture);
            }
        })();

        // noise texture
        noisePrg.set_program();
        noisePrg.set_attribute(planeVBO, planeIBO);
        gl.bindFramebuffer(gl.FRAMEBUFFER, noiseBuffer.framebuffer);
        gl3.scene_clear([0.0, 0.0, 0.0, 1.0]);
        gl3.scene_view(null, 0, 0, bufferSize, bufferSize);
        noisePrg.push_shader([[bufferSize, bufferSize]]);
        gl3.draw_elements_int(gl.TRIANGLES, planeIndex.length);

        // gl flags
        gl.disable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.BLEND);

        // rendering
        let count = 0;
        let beginTime = Date.now();
        let targetBufferNum = 0;
        render();

        function render(){
            let i;
            nowTime = Date.now() - beginTime;
            nowTime /= 1000;
            count++;
            targetBufferNum = count % 2;

            // canvas
            canvasWidth   = window.innerWidth;
            canvasHeight  = window.innerHeight;
            canvas.width  = canvasWidth;
            canvas.height = canvasHeight;

            // perspective projection
            let cameraPosition    = DEFAULT_CAM_POSITION;
            let centerPoint       = DEFAULT_CAM_CENTER;
            let cameraUpDirection = DEFAULT_CAM_UP;
            let camera = gl3.camera.create(
                cameraPosition,
                centerPoint,
                cameraUpDirection,
                45, canvasWidth / canvasHeight, 0.1, 10.0
            );
            mat4.vpFromCamera(camera, vMatrix, pMatrix, vpMatrix);

            // gpgpu update ---------------------------------------------------
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
            gl.bindFramebuffer(gl.FRAMEBUFFER, velocityBuffer[targetBufferNum].framebuffer);
            gl3.scene_view(null, 0, 0, gpgpuBufferSize, gpgpuBufferSize);
            velocityPrg.set_program();
            velocityPrg.set_attribute(planeTexCoordVBO, planeIBO);
            velocityPrg.push_shader([nowTime, 3, 6 + 1 - targetBufferNum]);
            gl3.draw_elements_int(gl.TRIANGLES, planeIndex.length);
            gl.bindFramebuffer(gl.FRAMEBUFFER, positionBuffer[targetBufferNum].framebuffer);
            gl3.scene_view(null, 0, 0, gpgpuBufferSize, gpgpuBufferSize);
            positionPrg.set_program();
            positionPrg.set_attribute(planeTexCoordVBO, planeIBO);
            positionPrg.push_shader([nowTime, 3, 4 + 1 - targetBufferNum, 6 + targetBufferNum]);
            gl3.draw_elements_int(gl.TRIANGLES, planeIndex.length);

            // render to frame buffer -----------------------------------------
            gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer.framebuffer);
            gl3.scene_clear([0.0, 0.0, 0.1, 1.0], 1.0);
            gl3.scene_view(camera, 0, 0, canvasWidth, canvasHeight);

            // temp plane point draw
            scenePrg.set_program();
            // scenePrg.set_attribute(tiledPlanePointVBO, null);
            scenePrg.set_attribute(tiledPlanePointVBO, tiledPlaneCrossLineIBO);
            mat4.identity(mMatrix);
            mat4.rotate(mMatrix, Math.sin(nowTime), [1, 1, 0], mMatrix);
            mat4.multiply(vpMatrix, mMatrix, mvpMatrix);
            scenePrg.push_shader([mvpMatrix, 4 + targetBufferNum, nowTime, [0.8, 0.75, 1.0, 0.5]]);
            gl3.draw_arrays(gl.POINTS, tiledPlanePointLength);
            gl3.draw_elements_int(gl.LINES, tiledPlanePointData.indexCross.length);

            // horizon gauss render to fBuffer --------------------------------
            gaussPrg.set_program();
            gaussPrg.set_attribute(planeVBO, planeIBO);
            gl.bindFramebuffer(gl.FRAMEBUFFER, hGaussBuffer.framebuffer);
            gl3.scene_clear([0.0, 0.0, 0.0, 1.0], 1.0);
            gl3.scene_view(null, 0, 0, canvasWidth, canvasHeight);
            gaussPrg.push_shader([[canvasWidth, canvasHeight], true, gWeight, 0]);
            gl3.draw_elements_int(gl.TRIANGLES, planeIndex.length);

            // vertical gauss render to fBuffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, vGaussBuffer.framebuffer);
            gl3.scene_clear([0.0, 0.0, 0.0, 1.0], 1.0);
            gl3.scene_view(null, 0, 0, canvasWidth, canvasHeight);
            gaussPrg.push_shader([[canvasWidth, canvasHeight], false, gWeight, 1]);
            gl3.draw_elements_int(gl.TRIANGLES, planeIndex.length);

            // final scene ----------------------------------------------------
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
            finalPrg.set_program();
            finalPrg.set_attribute(planeVBO, planeIBO);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl3.scene_clear([0.01, 0.02, 0.08, 1.0], 1.0);
            gl3.scene_view(null, 0, 0, canvasWidth, canvasHeight);
            finalPrg.push_shader([[1.0, 1.0, 1.0, 1.0], 0, nowTime, [canvasWidth, canvasHeight]]);
            gl3.draw_elements_int(gl.TRIANGLES, planeIndex.length);
            finalPrg.push_shader([[1.0, 1.0, 1.0, 1.0], 2, nowTime, [canvasWidth, canvasHeight]]);
            gl3.draw_elements_int(gl.TRIANGLES, planeIndex.length);

            if(run){
                requestAnimationFrame(render);
            }else{
                if(resetBufferFunction != null){
                    resetBufferFunction();
                    resetBufferFunction = null;
                    run = true;
                    requestAnimationFrame(render);
                }
            }
        }
    }

    function gaussWeight(resolution, power){
        let t = 0.0;
        let weight = [];
        for(let i = 0; i < resolution; i++){
            let r = 1.0 + 2.0 * i;
            let w = Math.exp(-0.5 * (r * r) / power);
            weight[i] = w;
            if(i > 0){w *= 2.0;}
            t += w;
        }
        for(i = 0; i < weight.length; i++){
            weight[i] /= t;
        }
        return weight;
    }
})(this);

