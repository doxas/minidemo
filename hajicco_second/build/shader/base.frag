precision mediump float;
uniform vec3      eyePosition;
uniform vec3      lightPosition;
uniform vec3      ambient;
uniform float     specularPower;
uniform float     globalAlpha;
uniform sampler2D texture;
varying vec4      vPosition;
varying vec3      vNormal;
void main(){
    vec3 light = normalize(lightPosition - vPosition.xyz);
    vec3 eye = reflect(normalize(vPosition.xyz - eyePosition), vNormal);
    float diffuse = max(dot(light, vNormal) * 0.5 + 0.5, 0.25);
    float specular = pow(max(dot(eye, vNormal), 0.0), 10.0) * specularPower;
    vec4 samplerColor = texture2D(texture, vec2(0.0));
    gl_FragColor = vec4(ambient * diffuse + specular, globalAlpha);
}
