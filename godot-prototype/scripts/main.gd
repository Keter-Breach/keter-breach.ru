extends Node3D

const PlayerScript = preload("res://scripts/player.gd")
const FacilityLayout = preload("res://scripts/facility_layout.gd")
var player_ref: CharacterBody3D
var map_panel: ColorRect
var map_dot: ColorRect

func _ready() -> void:
	_build_environment()
	_build_facility()
	_build_player()
	_build_hud()

func _material(color: Color, metallic: float = 0.0, roughness: float = 0.82) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.metallic = metallic
	m.roughness = roughness
	return m

func _box(parent: Node3D, name: String, size: Vector3, pos: Vector3, material: Material, solid: bool = true) -> Node3D:
	var body: Node3D
	if solid:
		body = StaticBody3D.new()
	else:
		body = MeshInstance3D.new()
	body.name = name
	body.position = pos
	var mesh := BoxMesh.new()
	mesh.size = size
	if body is StaticBody3D:
		var instance := MeshInstance3D.new()
		instance.mesh = mesh
		instance.material_override = material
		body.add_child(instance)
		var shape := CollisionShape3D.new()
		var box_shape := BoxShape3D.new()
		box_shape.size = size
		shape.shape = box_shape
		body.add_child(shape)
	else:
		var visual := body as MeshInstance3D
		visual.mesh = mesh
		visual.material_override = material
	parent.add_child(body)
	return body

func _build_facility() -> void:
	var facility := Node3D.new()
	facility.name = "FacilityD12"
	facility.set_script(FacilityLayout)
	add_child(facility)

func _process(_delta: float) -> void:
	if player_ref == null or map_panel == null or map_dot == null:
		return
	var p := player_ref.global_position
	var px := 8.0 + clampf((p.x + 40.0) / 80.0, 0.0, 1.0) * (map_panel.size.x - 16.0)
	var py := 25.0 + clampf((p.z + 10.0) / 110.0, 0.0, 1.0) * (map_panel.size.y - 34.0)
	map_dot.position = Vector2(px - map_dot.size.x * 0.5, py - map_dot.size.y * 0.5)

func _build_environment() -> void:
	var world := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.008, 0.012, 0.02)
	sky_mat.sky_horizon_color = Color(0.025, 0.018, 0.02)
	sky_mat.ground_bottom_color = Color(0.006, 0.006, 0.008)
	sky_mat.ground_horizon_color = Color(0.02, 0.015, 0.016)
	sky.sky_material = sky_mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.16, 0.18, 0.22)
	env.ambient_light_energy = 0.35
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_light_color = Color(0.06, 0.045, 0.05)
	env.fog_density = 0.018
	world.environment = env
	add_child(world)
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-35, -25, 0)
	light.light_color = Color(0.55, 0.61, 0.72)
	light.light_energy = 0.16
	add_child(light)

func _build_corridor() -> void:
	var concrete := _material(Color(0.17, 0.18, 0.19))
	var floor_mat := _material(Color(0.075, 0.08, 0.085), 0.35, 0.3)
	var ceiling_mat := _material(Color(0.095, 0.10, 0.11), 0.15)
	var trim := _material(Color(0.055, 0.06, 0.065), 0.7, 0.36)
	var warning := _material(Color(0.48, 0.018, 0.025), 0.15, 0.4)
	_box(self, "Floor", Vector3(6, 0.35, 34), Vector3(0, -0.18, -12), floor_mat)
	_box(self, "Ceiling", Vector3(6, 0.3, 34), Vector3(0, 3.5, -12), ceiling_mat)
	_box(self, "Left wall", Vector3(0.3, 3.7, 34), Vector3(-3.0, 1.65, -12), concrete)
	_box(self, "Right wall", Vector3(0.3, 3.7, 34), Vector3(3.0, 1.65, -12), concrete)
	_box(self, "End bulkhead", Vector3(6, 3.7, 0.35), Vector3(0, 1.65, -29), concrete)
	for z in range(-27, 4, 3):
		_box(self, "Wall reinforcement", Vector3(0.12, 3.2, 0.16), Vector3(-2.79, 1.55, z), trim, false)
		_box(self, "Wall reinforcement", Vector3(0.12, 3.2, 0.16), Vector3(2.79, 1.55, z), trim, false)
	for z in range(-26, 2, 7):
		_box(self, "Red warning strip", Vector3(0.06, 0.08, 1.4), Vector3(-2.77, 3.0, z), warning, false)
		_box(self, "Red warning strip", Vector3(0.06, 0.08, 1.4), Vector3(2.77, 3.0, z), warning, false)
		var lamp := OmniLight3D.new()
		lamp.position = Vector3(0, 3.05, z)
		lamp.light_color = Color(1.0, 0.055, 0.035)
		lamp.light_energy = 1.4
		lamp.omni_range = 7.0
		lamp.omni_attenuation = 1.6
		add_child(lamp)
		_box(self, "Ceiling light housing", Vector3(0.9, 0.08, 0.45), Vector3(0, 3.28, z - 1.3), trim, false)
		var cold := OmniLight3D.new()
		cold.position = Vector3(0, 3.12, z - 1.3)
		cold.light_color = Color(0.55, 0.68, 0.85)
		cold.light_energy = 0.7
		cold.omni_range = 5.5
		add_child(cold)
	_box(self, "D12 sign backing", Vector3(1.2, 0.42, 0.08), Vector3(0, 2.55, -28.75), trim, false)
	var sign := Label3D.new()
	sign.text = "KETER  /  SECTOR D-12"
	sign.font_size = 48
	sign.pixel_size = 0.006
	sign.modulate = Color(0.9, 0.06, 0.045)
	sign.position = Vector3(0, 2.55, -28.68)
	sign.rotation.y = PI
	add_child(sign)
	_box(self, "Start floor marking", Vector3(1.2, 0.012, 0.08), Vector3(0, 0.012, 0.8), warning, false)

func _build_player() -> void:
	var player := CharacterBody3D.new()
	player.name = "Player"
	player.set_script(PlayerScript)
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.34
	capsule.height = 1.8
	shape.shape = capsule
	shape.position.y = 0.9
	player.add_child(shape)
	player.position = Vector3(0, 0.1, -7.8)
	player.rotation.y = PI
	add_child(player)
	player_ref = player

func _build_hud() -> void:
	var layer := CanvasLayer.new()
	layer.name = "HUD"
	add_child(layer)
	var crosshair := Label.new()
	crosshair.text = "+"
	crosshair.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	crosshair.position = Vector2(-5, -12)
	crosshair.add_theme_font_size_override("font_size", 20)
	crosshair.add_theme_color_override("font_color", Color(0.85, 0.82, 0.78, 0.8))
	layer.add_child(crosshair)
	var info := Label.new()
	info.text = "KETER BREACH  //  D-12\nWASD — движение   SHIFT — бег\nМышь — осмотр   ESC — отпустить мышь"
	info.position = Vector2(24, 22)
	info.add_theme_font_size_override("font_size", 15)
	info.add_theme_color_override("font_color", Color(0.78, 0.78, 0.76, 0.9))
	layer.add_child(info)
	var objective := Label.new()
	objective.text = "ЗАДАЧА: ВЫЙТИ ИЗ ЛИФТА И ИССЛЕДОВАТЬ СЕКТОР D-12"
	objective.anchor_left = 0.5
	objective.anchor_right = 0.5
	objective.anchor_top = 1.0
	objective.anchor_bottom = 1.0
	objective.offset_left = -230
	objective.offset_right = 230
	objective.offset_top = -48
	objective.offset_bottom = -20
	objective.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	objective.add_theme_font_size_override("font_size", 14)
	objective.add_theme_color_override("font_color", Color(0.85, 0.12, 0.1))
	layer.add_child(objective)
	map_panel = ColorRect.new()
	map_panel.name = "FacilityMinimap"
	map_panel.color = Color(0.025, 0.035, 0.04, 0.92)
	map_panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	map_panel.offset_left = -194
	map_panel.offset_top = 22
	map_panel.offset_right = -22
	map_panel.offset_bottom = 238
	map_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(map_panel)
	var map_title := Label.new()
	map_title.text = "D-12 / MAP"
	map_title.position = Vector2(8, 5)
	map_title.add_theme_font_size_override("font_size", 12)
	map_title.add_theme_color_override("font_color", Color(0.78, 0.22, 0.18))
	map_panel.add_child(map_title)
	var route := ColorRect.new()
	route.color = Color(0.28, 0.32, 0.33, 0.8)
	route.position = Vector2(82, 25)
	route.size = Vector2(3, 178)
	map_panel.add_child(route)
	for marker_pos in [Vector2(78, 52), Vector2(92, 78), Vector2(80, 108), Vector2(72, 145), Vector2(80, 177)]:
		var marker := ColorRect.new()
		marker.color = Color(0.55, 0.16, 0.12, 0.85)
		marker.position = marker_pos
		marker.size = Vector2(12, 3)
		map_panel.add_child(marker)
	map_dot = ColorRect.new()
	map_dot.name = "PlayerPosition"
	map_dot.color = Color(0.2, 1.0, 0.55)
	map_dot.size = Vector2(8, 8)
	map_panel.add_child(map_dot)
