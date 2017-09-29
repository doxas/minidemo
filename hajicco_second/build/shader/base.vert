attribute vec3 position;
attribute vec3 normal;
uniform   mat4 mMatrix;
uniform   mat4 mvpMatrix;
uniform   mat4 normalMatrix;
varying   vec4 vPosition;
varying   vec3 vNormal;
void main(){
    vPosition = mMatrix * vec4(position, 1.0);
    vNormal = (normalMatrix * vec4(normalize(normal), 0.0)).xyz;
    gl_Position = mvpMatrix * vec4(position, 1.0);
}
