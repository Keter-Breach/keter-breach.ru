extends AudioStreamPlayer3D
## Lightweight generated room tone; no external audio assets required.
@export var hum_gain: float = 0.65
var playback: AudioStreamGeneratorPlayback
var phase_a: float = 0.0
var phase_b: float = 0.0
var phase_mod: float = 0.0
const RATE: float = 22050.0

func _ready() -> void:
	var generator := stream as AudioStreamGenerator
	if generator == null:
		return
	generator.mix_rate = RATE
	if not playing:
		play()
	playback = get_stream_playback() as AudioStreamGeneratorPlayback

func _process(_delta: float) -> void:
	if playback == null:
		return
	var frames := mini(playback.get_frames_available(), 2048)
	if frames <= 0:
		return
	var samples := PackedVector2Array()
	samples.resize(frames)
	for i in range(frames):
		var modulation := 0.72 + 0.28 * sin(phase_mod)
		var low := sin(phase_a) * 0.62
		var high := sin(phase_b) * 0.18
		var sample := (low + high) * modulation * hum_gain * 0.12
		samples[i] = Vector2(sample, sample)
		phase_a = fposmod(phase_a + TAU * 47.0 / RATE, TAU)
		phase_b = fposmod(phase_b + TAU * 61.5 / RATE, TAU)
		phase_mod = fposmod(phase_mod + TAU * 0.21 / RATE, TAU)
	playback.push_buffer(samples)
