/* ----------------------------------------------------------------------------
 * plane point draw shader
 * ---------------------------------------------------------------------------- */
precision highp float;
uniform vec4 globalColor;
varying vec4 vColor;
varying vec2 vTexCoord;
void main(){
   gl_FragColor = globalColor;
}
