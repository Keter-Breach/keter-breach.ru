shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture, filter_linear;
uniform float vignette_strength : hint_range(0.0, 0.6) = 0.28;
uniform float grain_strength : hint_range(0.0, 0.08) = 0.022;
uniform float scanline_strength : hint_range(0.0, 0.06) = 0.012;

void fragment() {
	vec2 uv = SCREEN_UV;
	vec3 color = texture(screen_texture, uv).rgb;
	float distance_from_center = distance(uv, vec2(0.5));
	float vignette = smoothstep(0.22, 0.78, distance_from_center);
	color *= 1.0 - vignette * vignette_strength;

	float noise_value = fract(sin(dot(FRAGCOORD.xy + vec2(TIME * 19.0, TIME * 7.0), vec2(12.9898, 78.233))) * 43758.5453);
	color += (noise_value - 0.5) * grain_strength;

	float scanline = sin(uv.y * 720.0) * scanline_strength;
	color *= 1.0 - scanline;
	COLOR = vec4(color, 1.0);
}
