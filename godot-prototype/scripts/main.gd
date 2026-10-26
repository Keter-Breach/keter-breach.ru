extends Node3D

const PlayerScript = preload("res://scripts/player.gd")
const FacilityLayout = preload("res://scripts/facility_layout.gd")
var player_ref: CharacterBody3D
var map_panel: ColorRect
var map_dot: ColorRect
var facility_ref: Node3D
var interaction_hint: Label
var status_label: Label
var objective_label: Label
var battery_label: Label
var has_l1: bool = false
var has_l2: bool = false
var archive_read: bool = false
var reactor_disabled: bool = false
var comms_restored: bool = false
var opened_doors: Dictionary = {}

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
	facility_ref = facility

func _process(_delta: float) -> void:
	if player_ref == null or map_panel == null or map_dot == null:
		return
	var p := player_ref.global_position
	var px := 8.0 + clampf((p.x + 40.0) / 80.0, 0.0, 1.0) * (map_panel.size.x - 16.0)
	var py := 25.0 + clampf((p.z + 10.0) / 110.0, 0.0, 1.0) * (map_panel.size.y - 34.0)
	map_dot.position = Vector2(px - map_dot.size.x * 0.5, py - map_dot.size.y * 0.5)
	var target := _get_interaction_target()
	if interaction_hint:
		interaction_hint.text = "[E]  " + str(target.get_meta("interaction_title", "Взаимодействовать")) if target != null else ""
	if battery_label:
		battery_label.text = "ФОНАРЬ: %d%%" % roundi(float(player_ref.get("flashlight_charge")))

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_E:
		_interact()

func _get_interaction_target() -> Area3D:
	if player_ref == null or not is_instance_valid(player_ref):
		return null
	var camera := player_ref.get_node_or_null("PlayerCamera") as Camera3D
	if camera == null:
		return null
	var origin := camera.global_position
	var finish := origin + (-camera.global_transform.basis.z * 3.2)
	var query := PhysicsRayQueryParameters3D.create(origin, finish, 2)
	query.collide_with_areas = true
	query.collide_with_bodies = false
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return null
	var collider = hit.get("collider")
	if collider is Area3D and collider.has_meta("interaction_id"):
		return collider as Area3D
	return null

func _interact() -> void:
	var target := _get_interaction_target()
	if target == null:
		_show_status("Нет доступных объектов для взаимодействия.")
		return
	var interaction_id := str(target.get_meta("interaction_id", ""))
	match interaction_id:
		"card_l1":
			has_l1 = true
			target.queue_free()
			_show_status("ПОЛУЧЕНА КАРТА L1. Доступ к первому шлюзу разрешён.")
		"card_l2":
			has_l2 = true
			target.queue_free()
			_show_status("ПОЛУЧЕНА КАРТА L2. Доступ к эвакуационному уровню разрешён.")
		"door_l1":
			if has_l1:
				_open_door("L1 security door")
				_show_status("ШЛЮЗ L1 ОТКРЫТ. Впереди узел данных и лаборатория.")
			else:
				_show_status("ОТКАЗ ДОСТУПА: требуется ключ-карта L1. Проверь администрацию.")
		"door_l2":
			if has_l2:
				_open_door("L2 security door")
				_show_status("ШЛЮЗ L2 ОТКРЫТ. Эвакуационный маршрут активен.")
			else:
				_show_status("ОТКАЗ ДОСТУПА: требуется ключ-карта L2.")
		"exit_door":
			if not has_l2:
				_show_status("ЭВАКУАЦИЯ ЗАБЛОКИРОВАНА: отсутствует карта L2.")
			elif not archive_read:
				_show_status("ПРОТОКОЛ «ЗЕРКАЛО»: сначала изучи журнал смены в архиве.")
			elif not reactor_disabled:
				_show_status("ПРОТОКОЛ «ЗЕРКАЛО»: сначала отключи аварийный генератор в мастерской.")
			elif not comms_restored:
				_show_status("Канал 7 молчит. Проверь терминал связи перед выходом.")
			else:
				_open_door("Surface exit door")
				_show_status("ШЛЮЗ ОТКРЫТ. За ним коридор повторяется… ЦИКЛ 01 ЗАВЕРШЁН.")
		"archive_log":
			archive_read = true
			target.queue_free()
			_show_status("ЖУРНАЛ СМЕНЫ / 03:17 — камеры пусты, датчики фиксируют движение. Доктор Гирс приказал не открывать камеру KETER-19. Последняя запись: «коридор за воротами не совпадает с планом».")
		"reactor":
			reactor_disabled = true
			target.queue_free()
			_show_status("ГЕНЕРАТОР ОТКЛЮЧЁН. Аварийное питание снято; в секторе стало подозрительно тихо.")
		"comms":
			comms_restored = true
			target.queue_free()
			_show_status("КАНАЛ 7 / ВХОДЯЩЕЕ: «Если слышишь это, не верь двери с табличкой ВЫХОД. Я уже проходил её. Дважды». — Гирс")
		"battery_pack":
			var charge := float(player_ref.get("flashlight_charge"))
			player_ref.set("flashlight_charge", minf(100.0, charge + 40.0))
			target.queue_free()
			_show_status("НАЙДЕНА ЗАПАСНАЯ БАТАРЕЯ. Заряд фонаря восстановлен на 40%.")
		_:
			_show_status("Объект пока не реагирует.")

func _open_door(door_name: String) -> void:
	if opened_doors.has(door_name):
		return
	opened_doors[door_name] = true
	var door := facility_ref.find_child(door_name, true, false) as Node3D
	if door:
		door.visible = false
		var shape := door.find_child("CollisionShape3D", true, false) as CollisionShape3D
		if shape:
			shape.disabled = true

func _show_status(message: String) -> void:
	if status_label:
		status_label.text = message
	_refresh_objective()

func _refresh_objective() -> void:
	if objective_label == null:
		return
	if not has_l1:
		objective_label.text = "ЗАДАЧА: НАЙТИ КАРТУ L1 В АДМИНИСТРАЦИИ"
	elif not archive_read:
		objective_label.text = "ЗАДАЧА: ПРОЙТИ ШЛЮЗ L1 И ПРОЧИТАТЬ ЖУРНАЛ В АРХИВЕ"
	elif not has_l2:
		objective_label.text = "ЗАДАЧА: НАЙТИ КАРТУ L2 В УЗЛЕ ДАННЫХ"
	elif not reactor_disabled:
		objective_label.text = "ЗАДАЧА: ОТКЛЮЧИТЬ АВАРИЙНЫЙ ГЕНЕРАТОР В МАСТЕРСКОЙ"
	elif not comms_restored:
		objective_label.text = "ЗАДАЧА: ВОССТАНОВИТЬ СВЯЗЬ НА КАНАЛЕ 7"
	else:
		objective_label.text = "ЗАДАЧА: ОТКРЫТЬ ЭВАКУАЦИОННЫЙ ШЛЮЗ"

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
	info.text = "KETER BREACH  //  D-12\nWASD — движение   SHIFT — бег\nF — фонарь   Мышь — осмотр\nESC — отпустить мышь"
	info.position = Vector2(24, 22)
	info.add_theme_font_size_override("font_size", 15)
	info.add_theme_color_override("font_color", Color(0.78, 0.78, 0.76, 0.9))
	layer.add_child(info)
	battery_label = Label.new()
	battery_label.name = "FlashlightBattery"
	battery_label.position = Vector2(24, 105)
	battery_label.add_theme_font_size_override("font_size", 14)
	battery_label.add_theme_color_override("font_color", Color(0.45, 0.9, 0.58))
	layer.add_child(battery_label)
	objective_label = Label.new()
	objective_label.name = "Objective"
	objective_label.anchor_left = 0.5
	objective_label.anchor_right = 0.5
	objective_label.anchor_top = 1.0
	objective_label.anchor_bottom = 1.0
	objective_label.offset_left = -300
	objective_label.offset_right = 300
	objective_label.offset_top = -48
	objective_label.offset_bottom = -20
	objective_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	objective_label.add_theme_font_size_override("font_size", 14)
	objective_label.add_theme_color_override("font_color", Color(0.85, 0.12, 0.1))
	layer.add_child(objective_label)
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
	interaction_hint = Label.new()
	interaction_hint.name = "InteractionHint"
	interaction_hint.anchor_left = 0.5
	interaction_hint.anchor_right = 0.5
	interaction_hint.anchor_top = 1.0
	interaction_hint.anchor_bottom = 1.0
	interaction_hint.offset_left = -210
	interaction_hint.offset_right = 210
	interaction_hint.offset_top = -88
	interaction_hint.offset_bottom = -60
	interaction_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	interaction_hint.add_theme_font_size_override("font_size", 17)
	interaction_hint.add_theme_color_override("font_color", Color(0.95, 0.72, 0.3))
	layer.add_child(interaction_hint)
	status_label = Label.new()
	status_label.name = "StoryStatus"
	status_label.position = Vector2(24, 130)
	status_label.size = Vector2(700, 110)
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status_label.add_theme_font_size_override("font_size", 14)
	status_label.add_theme_color_override("font_color", Color(0.9, 0.78, 0.63))
	layer.add_child(status_label)
	_show_status("03:17 — грузовой лифт остановился. Последние 47 минут отсутствуют в памяти. Найди карту L1 в администрации.")
