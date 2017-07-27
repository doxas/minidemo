attribute vec3 position;
attribute vec4 color;
attribute vec2 texCoord;
attribute vec4 type;
attribute vec4 random;
uniform mat4 mvpMatrix;
uniform sampler2D positionTexture;
uniform float time;
varying vec4 vColor;
varying vec2 vTexCoord;
void main(){
    vColor = color;
    vTexCoord = texCoord;
    vec4 dummy = type + random + time;
    vec4 p = texture2D(positionTexture, texCoord);
    gl_Position = mvpMatrix * vec4(position + p.xyz, 1.0);
    gl_PointSize = 5.0;
}
