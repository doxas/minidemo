attribute vec4  position;
attribute vec3  normal;
attribute vec2  instPosition;
attribute vec2  instScale;
uniform   mat4  mMatrix;
uniform   mat4  mvpMatrix;
uniform   mat4  normalMatrix;
uniform   float globalScale;
varying   vec4  vPosition;
varying   vec3  vNormal;
void main(){
    vec2 offsetScale = instScale - position.w * (1.0 - instScale);
    vec4 p = vec4(position.xy * offsetScale, position.z, 1.0);
    vec2 s = 1.0 - (1.0 - globalScale) / instScale;
    p = p * vec4(s, 1.0, 1.0) + vec4(instPosition, 0.0, 0.0);
    vPosition = mMatrix * p;
    vNormal = (normalMatrix * vec4(normalize(normal), 0.0)).xyz;
    gl_Position = mvpMatrix * p;
}
