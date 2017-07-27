/* ----------------------------------------------------------------------------
 * final shader
 * ---------------------------------------------------------------------------- */
precision mediump float;
uniform vec4 globalColor;
uniform sampler2D texture;
uniform float time;
uniform vec2 resolution;
varying vec2 vTexCoord;
void main(){
    vec2 p = gl_FragCoord.xy / resolution * 2.0 - 1.0;
    float l = min(1.0, 1.5 - length(p * 0.5));
    vec4 smp = texture2D(texture, vTexCoord) * globalColor;
    float t = smoothstep(0.0, 2.0, time);
    gl_FragColor = vec4(smp.rgb * t * l, smp.a) * globalColor;
}
