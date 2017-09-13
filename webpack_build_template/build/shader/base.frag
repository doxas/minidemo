/* ----------------------------------------------------------------------------
 * base texture shader
 * ---------------------------------------------------------------------------- */
precision mediump float;
uniform vec3      eyePosition;
uniform vec3      lightPosition;
uniform vec3      ambient;
uniform float     specularPower;
uniform float     globalAlpha;
uniform sampler2D texture;
varying vec4      vPosition;
varying vec3      vNormal;
varying vec4      vColor;
varying vec2      vTexCoord;
void main(){
    vec3 light = normalize(lightPosition - vPosition.xyz);
    vec3 eye = reflect(normalize(vPosition.xyz - eyePosition), vNormal);
    float diffuse = max(dot(light, vNormal) * 0.5 + 0.5, 0.25);
    float specular = pow(max(dot(eye, vNormal), 0.0), 10.0) * specularPower;
    vec4 samplerColor = texture2D(texture, vTexCoord);
    vec4 destColor = vec4(
        vColor.rgb * samplerColor.rgb * min(diffuse + specular, 1.0) + ambient,
        vColor.a * samplerColor.a * globalAlpha
    );
    gl_FragColor = destColor;
}
