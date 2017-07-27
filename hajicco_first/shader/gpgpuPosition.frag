/* ----------------------------------------------------------------------------
 * gpgpu position update shader
 * ---------------------------------------------------------------------------- */
precision highp float;
uniform float time;
uniform sampler2D noiseTexture;
uniform sampler2D previousTexture;
uniform sampler2D velocityTexture;
varying vec2 vTexCoord;
const float speed = 0.05;
void main(){
    float tmp = time;
    vec4 n = texture2D(noiseTexture, mod(vTexCoord + time * 0.05, 1.0));
    vec4 p = texture2D(previousTexture, vTexCoord);
    vec4 v = texture2D(velocityTexture, vTexCoord);
    // gl_FragColor = vec4(p.xyz + normalize(v.xyz) * speed, 1.0);
    gl_FragColor = vec4(n.xyz * 2.0 - 1.0, 1.0);
}
