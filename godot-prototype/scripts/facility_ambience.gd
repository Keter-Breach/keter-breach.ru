extends Node
## Procedural facility ambience: low electrical hum, distant air movement and rare metallic strain.
## Generated in real time so the project needs no external audio files.
var player: AudioStreamPlayer
var playback: AudioStreamGeneratorPlayback
var sample_clock: float = 0.0
var event_clock: float = 7.0
var event_strength: float = 0.0
var event_phase: float = 0.0
var event_frequency: float = 91.0
var noise_state: int = 73129

func _ready() -> void:
	add_to_group("facility_audio")
	player = AudioStreamPlayer.new()
	player.name = "ProceduralFacilityAmbience"
	var generator := AudioStreamGenerator.new()
	generator.mix_rate = 22050.0
	generator.buffer_length = 0.35
	player.stream = generator
	player.volume_db = -21.0
	add_child(player)
	player.play()
	playback = player.get_stream_playback() as AudioStreamGeneratorPlayback

func trigger_metal_event(strength: float = 1.0) -> void:
	event_strength = maxf(event_strength, clampf(strength, 0.0, 1.0))
	event_phase = 0.0
	event_frequency = randf_range(48.0, 135.0)

func _process(delta: float) -> void:
	if playback == null:
		return
	event_clock -= delta
	if event_clock <= 0.0:
		event_clock = randf_range(9.0, 21.0)
		if randf() < 0.62:
			trigger_metal_event(randf_range(0.18, 0.48))
	var frames := playback.get_frames_available()
	for i in range(frames):
		var t := sample_clock
		# Several close frequencies make a worn transformer hum rather than a clean tone.
		var slow_breath := 0.72 + 0.28 * sin(t * TAU * 0.11)
		var hum := sin(t * TAU * 43.0) * 0.12
		hum += sin(t * TAU * 47.4) * 0.065
		hum += sin(t * TAU * 86.0) * 0.022
		# Quiet air duct hiss, shaped from inharmonic oscillators to avoid per-sample random allocation.
		var air := sin(t * TAU * 173.0 + sin(t * TAU * 0.19) * 2.4) * 0.018
		air += sin(t * TAU * 227.0 + sin(t * TAU * 0.07) * 3.1) * 0.012
		var event := 0.0
		if event_strength > 0.001:
			var envelope := exp(-event_phase * 3.8)
			event = (sin(event_phase * TAU * event_frequency) * 0.7 + sin(event_phase * TAU * event_frequency * 1.71) * 0.3) * envelope * event_strength * 0.18
			event_phase += 1.0 / 22050.0
			event_strength *= 0.99991
			if event_strength < 0.002:
				event_strength = 0.0
		var sample := clampf((hum * slow_breath + air + event), -0.8, 0.8)
		playback.push_frame(Vector2(sample, sample))
		sample_clock += 1.0 / 22050.0
