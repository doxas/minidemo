attribute vec3 position;
varying vec2 vTexCoord;
void main(){
    vTexCoord = (position.xy + 1.0) * 0.5;
    gl_Position = vec4(position, 1.0);
}
