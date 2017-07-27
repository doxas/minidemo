/* ----------------------------------------------------------------------------
 * gaussian shader
 * ---------------------------------------------------------------------------- */
precision mediump float;

uniform vec2 resolution;
uniform bool horizontal;
uniform float weight[20];
uniform sampler2D texture;
void main(){
    vec2 tFrag = 1.0 / resolution;
    vec2 fc = gl_FragCoord.st;
    vec4 destColor = texture2D(texture, fc * tFrag) * weight[0];
    if(horizontal){
        for(int i = 1; i < 20; ++i){
            destColor += texture2D(texture, (fc + vec2( float(i), 0.0)) * tFrag) * weight[i];
            destColor += texture2D(texture, (fc + vec2(-float(i), 0.0)) * tFrag) * weight[i];
        }
    }else{
        for(int i = 1; i < 20; ++i){
            destColor += texture2D(texture, (fc + vec2(0.0,  float(i))) * tFrag) * weight[i];
            destColor += texture2D(texture, (fc + vec2(0.0, -float(i))) * tFrag) * weight[i];
        }
        destColor.rgb *= 2.0;
    }
    gl_FragColor = destColor;
}
