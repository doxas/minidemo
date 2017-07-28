attribute vec3 position;
attribute vec4 random;
uniform mat4 mvpMatrix;
uniform sampler2D positionTexture;
uniform float time;
varying vec4 vColor;
varying vec2 vTexCoord;
void main(){
    vTexCoord = (position.xy * 0.1) * 0.5 + 0.5;
    vec4 dummy = random + time;
    vec4 p = texture2D(positionTexture, vTexCoord);
    float s = step(0.0, position.z);
    float t = 1.0 - s;
    vec3 pos = vec3(p.xy * 0.15 * p.z * s + p.yz * 0.05 * p.x * t, 0.0);
    gl_Position = mvpMatrix * vec4(position + pos, 1.0);
}
