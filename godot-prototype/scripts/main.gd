extends Node3D

const PlayerScript = preload("res://scripts/player.gd")
const FACILITY_LAYOUT_PATH := "res://scripts/facility_layout.gd"
const EnhancementsScript = preload("res://scripts/game_enhancements.gd")
const FacilityAmbienceScript = preload("res://scripts/facility_ambience.gd")
var player_ref: CharacterBody3D
var map_panel: ColorRect
var map_dot: ColorRect
var facility_ref: Node3D
var interaction_hint: Label
var status_label: Label
var objective_label: Label
var battery_label: Label
var inventory_label: Label
var has_l1: bool = false
var has_l2: bool = false
var archive_read: bool = false
var reactor_disabled: bool = false
var comms_restored: bool = false
var opened_doors: Dictionary = {}
var loop_count: int = 0
var triggered_events: Dictionary = {}
var evidence_found: Dictionary = {}
var battery_packs_found: Dictionary = {}
var game_started: bool = false
var menu_layer: CanvasLayer
var menu_root: Control
var intro_root: Control
var hud_layer: CanvasLayer
var intro_page: int = 0
var intro_tween: Tween
var loading_root: Control
var loading_progress: ProgressBar
var loading_status: Label
var menu_camera: Camera3D
var menu_alarm_light: OmniLight3D

func _ready() -> void:
	_build_environment()
	var ambience := Node.new()
	ambience.name = "FacilityAmbience"
	ambience.set_script(FacilityAmbienceScript)
	add_child(ambience)
	_build_facility()
	_load_game_state()
	_apply_loaded_state()
	_build_player()
	_build_hud()
	hud_layer.visible = false
	player_ref.set_physics_process(false)
	player_ref.set_process(false)
	_build_menu()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var enhancements := Node.new()
	enhancements.name = "GameEnhancements"
	enhancements.set_script(EnhancementsScript)
	add_child(enhancements)

func _load_game_state() -> void:
	var config := ConfigFile.new()
	if config.load("user://keter_breach_save.cfg") != OK:
		return
	has_l1 = bool(config.get_value("progress", "has_l1", false))
	has_l2 = bool(config.get_value("progress", "has_l2", false))
	archive_read = bool(config.get_value("progress", "archive_read", false))
	reactor_disabled = bool(config.get_value("progress", "reactor_disabled", false))
	comms_restored = bool(config.get_value("progress", "comms_restored", false))
	loop_count = int(config.get_value("progress", "loop_count", 0))
	opened_doors = config.get_value("progress", "opened_doors", {}) as Dictionary
	triggered_events = config.get_value("events", "triggered", {}) as Dictionary
	evidence_found = config.get_value("evidence", "found", {}) as Dictionary
	battery_packs_found = config.get_value("items", "battery_packs_found", {}) as Dictionary

func _save_game_state() -> void:
	var config := ConfigFile.new()
	config.set_value("progress", "has_l1", has_l1)
	config.set_value("progress", "has_l2", has_l2)
	config.set_value("progress", "archive_read", archive_read)
	config.set_value("progress", "reactor_disabled", reactor_disabled)
	config.set_value("progress", "comms_restored", comms_restored)
	config.set_value("progress", "loop_count", loop_count)
	config.set_value("progress", "opened_doors", opened_doors)
	config.set_value("events", "triggered", triggered_events)
	config.set_value("evidence", "found", evidence_found)
	config.set_value("items", "battery_packs_found", battery_packs_found)
	if player_ref != null:
		config.set_value("player", "flashlight_charge", float(player_ref.get("flashlight_charge")))
	config.save("user://keter_breach_save.cfg")

func _apply_loaded_state() -> void:
	if has_l1:
		_remove_saved_item("card_l1", "L1 card visual")
	if has_l2:
		_remove_saved_item("card_l2", "L2 card visual")
	if archive_read:
		_remove_saved_item("archive_log", "Archive terminal")
	if reactor_disabled:
		_remove_saved_item("reactor", "Emergency generator")
	if comms_restored:
		_activate_comms_terminal()
	if evidence_found.has("incident_memo"):
		_remove_saved_item("incident_memo", "Incident memo paper")
	if evidence_found.has("camera_tape"):
		_remove_saved_item("camera_tape", "Channel 7 recovered tape")
	if evidence_found.has("sample_label"):
		_remove_saved_item("sample_label", "KETER-19 sample label")
	for item_id in battery_packs_found.keys():
		var battery_visual_name := "Battery visual" if str(item_id) == "battery_pack" else "D-class spare battery"
		_remove_saved_item(str(item_id), battery_visual_name)
	if opened_doors.has("L1 security door"):
		_set_door_open("L1 security door")
	if opened_doors.has("L2 security door"):
		_set_door_open("L2 security door")
	if opened_doors.has("Surface exit door"):
		_set_door_open("Surface exit door")

func _remove_saved_item(interaction_id: String, visual_name: String) -> void:
	var target := facility_ref.find_child("Interact_" + interaction_id, true, false)
	if target:
		target.queue_free()
	var visual := facility_ref.find_child(visual_name, true, false) as Node3D
	if visual:
		visual.visible = false

func _activate_comms_terminal() -> void:
	var terminal := facility_ref.find_child("Interact_comms", true, false) as Area3D
	if terminal:
		terminal.set_meta("interaction_title", "Терминал связи: канал 7 [АКТИВЕН]")
	var screen := facility_ref.find_child("Channel 7 screen", true, false) as MeshInstance3D
	if screen:
		var screen_material := screen.material_override as StandardMaterial3D
		if screen_material:
			screen_material.albedo_color = Color(0.04, 0.28, 0.18)
			screen_material.emission_enabled = true
			screen_material.emission = Color(0.02, 0.35, 0.16)
			screen_material.emission_energy_multiplier = 0.7

func _set_door_open(door_name: String, animate: bool = false) -> void:
	var door := facility_ref.find_child(door_name, true, false) as StaticBody3D
	if door == null:
		return
	# The door is a StaticBody3D: its mesh and collision shape move together vertically.
	door.visible = true
	var target_y := 3.65
	if animate:
		var tween := create_tween()
		tween.set_trans(Tween.TRANS_QUART)
		tween.set_ease(Tween.EASE_IN_OUT)
		tween.tween_property(door, "position:y", target_y, 1.15)
	else:
		door.position.y = target_y

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
	# Load the facility script at runtime so a missing/invalid resource reports
	# its own path instead of surfacing as a misleading preload error at the top.
	var layout_script := load(FACILITY_LAYOUT_PATH) as Script
	if layout_script == null:
		push_error("Keter Breach: не удалось загрузить скрипт планировки: " + FACILITY_LAYOUT_PATH)
		_show_status("ОШИБКА ЗАГРУЗКИ: не найден или содержит ошибку scripts/facility_layout.gd.")
		return
	var facility := Node3D.new()
	facility.name = "FacilityD12"
	facility.set_script(layout_script)
	add_child(facility)
	facility_ref = facility

func _process(_delta: float) -> void:
	if menu_camera != null and not game_started:
		var t := float(Time.get_ticks_msec()) * 0.001
		menu_camera.position = Vector3(sin(t * 0.18) * 0.22, 2.22 + sin(t * 0.31) * 0.035, 31.0 + cos(t * 0.13) * 0.12)
		menu_camera.look_at(Vector3(sin(t * 0.11) * 0.12, 1.55, 58.0), Vector3.UP)
		if menu_alarm_light != null:
			menu_alarm_light.light_energy = 0.35 + absf(sin(t * 1.7)) * 0.85
	if not game_started or player_ref == null or map_panel == null or map_dot == null:
		return
	var p := player_ref.global_position
	var px := 8.0 + clampf((p.x + 40.0) / 80.0, 0.0, 1.0) * (map_panel.size.x - 16.0)
	var py := 25.0 + clampf((p.z + 10.0) / 140.0, 0.0, 1.0) * (map_panel.size.y - 34.0)
	map_dot.position = Vector2(px - map_dot.size.x * 0.5, py - map_dot.size.y * 0.5)
	var target := _get_interaction_target()
	if interaction_hint:
		interaction_hint.text = "[E]  " + str(target.get_meta("interaction_title", "Взаимодействовать")) if target != null else ""
	if battery_label:
		battery_label.text = "ФОНАРЬ: %d%%" % roundi(float(player_ref.get("flashlight_charge")))
	if inventory_label:
		var access_l1 := "L1 ✓" if has_l1 else "L1 —"
		var access_l2 := "L2 ✓" if has_l2 else "L2 —"
		inventory_label.text = "КАРТЫ: %s   %s     БАТАРЕИ: %d/2   УЛИКИ: %d/3" % [access_l1, access_l2, battery_packs_found.size(), evidence_found.size()]
	_check_story_triggers()
	if opened_doors.has("Surface exit door") and player_ref.global_position.z > 125.0:
		_trigger_mirror_loop()

func _check_story_triggers() -> void:
	if player_ref == null:
		return
	var p := player_ref.global_position
	var events := [
		{"id":"radio_intercept","position":Vector3(0,0,18.5),"radius":2.5,"message":"РАДИОПЕРЕХВАТ: «…эвакуация отменена. Персонал не покидал комплекс. Повторяю: персонал не покидал…»"},
		{"id":"archive_04","position":Vector3(-22,0,27),"radius":2.8,"message":"АРХИВ 04: терминал печатает отчёт сам по себе. В записи указано: «НЕ СМОТРЕТЬ В КАМЕРУ 6»."},
		{"id":"workshop_arc","position":Vector3(-11,0,33),"radius":2.8,"message":"МАСТЕРСКАЯ: щиток выбивает дугой. На секунду лампы гаснут — в темноте кто-то проходит за спиной."},
		{"id":"isolation_bangs","position":Vector3(-11,0,39.5),"radius":2.8,"message":"ИЗОЛЯТОР: за дверью слышны три удара. Затем кто-то шепчет ваше имя по внутренней связи."},
		{"id":"keter_motion","position":Vector3(0,0,51.5),"radius":3.0,"message":"ПРОТОКОЛ KETER: датчик фиксирует движение внутри пустой камеры. Свет в секторе гаснет на секунду."},
		{"id":"sample_reaction","position":Vector3(13.8,0,33.0),"radius":2.8,"message":"ЛАБОРАТОРИЯ: образец меняет положение внутри герметичной колбы. На стекле изнутри появляется отпечаток ладони."},
		{"id":"mirror_mismatch","position":Vector3(0,0,116.0),"radius":2.8,"message":"ПРОТОКОЛ «ЗЕРКАЛО»: табличка указывает на сектор D-12, но стрелка направлена в стену. За стеной слышен звук лифта."}
	]
	for event in events:
		var event_id: String = event["id"]
		if triggered_events.has(event_id):
			continue
		var event_pos: Vector3 = event["position"]
		if Vector2(p.x, p.z).distance_to(Vector2(event_pos.x, event_pos.z)) <= float(event["radius"]):
			triggered_events[event_id] = true
			_show_status(str(event["message"]))
			_save_game_state()
			if event_id == "workshop_arc" or event_id == "keter_motion" or event_id == "sample_reaction" or event_id == "mirror_mismatch":
				_flash_alarm()
			if event_id == "mirror_mismatch":
				_spawn_mirror_apparition()


func _trigger_power_failure() -> void:
	# The reactor shutdown changes the actual facility lights, not just the objective text.
	if facility_ref == null:
		return
	for child in facility_ref.get_children():
		if not child is OmniLight3D:
			continue
		var light := child as OmniLight3D
		var z := light.position.z
		if z < 26.0 or z > 56.0:
			continue
		if light.light_color.r > light.light_color.g * 1.8:
			# Keep emergency-red fixtures alive, but make them pulse more visibly.
			var emergency_tween := create_tween().set_loops()
			emergency_tween.tween_property(light, "light_energy", 0.22, 0.42)
			emergency_tween.tween_property(light, "light_energy", 0.82, 0.18)
		else:
			var tween := create_tween()
			tween.set_trans(Tween.TRANS_SINE)
			tween.set_ease(Tween.EASE_IN_OUT)
			tween.tween_property(light, "light_energy", 0.06, randf_range(0.35, 1.1))
			light.set_meta("reactor_power_cut", true)
	var ambience := get_tree().get_first_node_in_group("facility_audio")
	if ambience and ambience.has_method("trigger_metal_event"):
		ambience.trigger_metal_event(1.0)

func _spawn_mirror_apparition() -> void:
	# A fleeting silhouette appears ahead in the wrong corridor, then dissolves.
	var apparition := Node3D.new()
	apparition.name = "MirrorProtocolApparition"
	apparition.position = player_ref.global_position + (-player_ref.global_transform.basis.z * 5.5)
	facility_ref.add_child(apparition)
	var shadow_mat := StandardMaterial3D.new()
	shadow_mat.albedo_color = Color(0.006, 0.008, 0.009, 0.0)
	shadow_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	shadow_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	var body_mesh := CapsuleMesh.new()
	body_mesh.radius = 0.28
	body_mesh.height = 1.55
	var body_visual := MeshInstance3D.new()
	body_visual.name = "Human silhouette"
	body_visual.mesh = body_mesh
	body_visual.material_override = shadow_mat
	body_visual.position.y = 0.93
	apparition.add_child(body_visual)
	var head_mesh := SphereMesh.new()
	head_mesh.radius = 0.19
	head_mesh.height = 0.38
	var head_visual := MeshInstance3D.new()
	head_visual.name = "Featureless head"
	head_visual.mesh = head_mesh
	head_visual.material_override = shadow_mat
	head_visual.position.y = 1.82
	apparition.add_child(head_visual)
	var eye_mat := StandardMaterial3D.new()
	eye_mat.albedo_color = Color(0.34, 0.012, 0.008)
	eye_mat.emission_enabled = true
	eye_mat.emission = Color(0.5, 0.012, 0.004)
	eye_mat.emission_energy_multiplier = 0.45
	for x in [-0.075, 0.075]:
		var eye := MeshInstance3D.new()
		var eye_mesh := SphereMesh.new()
		eye_mesh.radius = 0.025
		eye_mesh.height = 0.05
		eye.mesh = eye_mesh
		eye.material_override = eye_mat
		eye.position = Vector3(x, 1.84, -0.17)
		apparition.add_child(eye)
	var fade := create_tween()
	fade.tween_interval(0.22)
	fade.tween_property(shadow_mat, "albedo_color:a", 0.92, 0.18)
	fade.tween_interval(0.45)
	fade.tween_property(shadow_mat, "albedo_color:a", 0.0, 0.42)
	fade.parallel().tween_property(apparition, "position:y", 0.22, 1.05)
	fade.tween_callback(apparition.queue_free)

func _flash_alarm() -> void:
	var layer := get_node_or_null("HUD") as CanvasLayer
	if layer == null:
		return
	var flash := ColorRect.new()
	flash.name = "AlarmFlash"
	flash.color = Color(0.65, 0.015, 0.01, 0.0)
	flash.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	flash.z_index = 100
	layer.add_child(flash)
	var tween := create_tween()
	tween.tween_property(flash, "color:a", 0.28, 0.07)
	tween.tween_property(flash, "color:a", 0.0, 0.24)
	tween.tween_callback(flash.queue_free)

func _unhandled_input(event: InputEvent) -> void:
	if not game_started:
		if event is InputEventKey and event.pressed and not event.echo and (event.keycode == KEY_ENTER or event.keycode == KEY_SPACE):
			if intro_root != null and intro_root.visible:
				_enter_game()
		return
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
			_remove_saved_item("card_l1", "L1 card visual")
			_show_status("КАРТА L1 ДОБАВЛЕНА В ИНВЕНТАРЬ. На считывателе загорелся зелёный индикатор.")
		"card_l2":
			has_l2 = true
			_remove_saved_item("card_l2", "L2 card visual")
			_show_status("КАРТА L2 ДОБАВЛЕНА В ИНВЕНТАРЬ. Доступ к эвакуационному уровню разрешён.")
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
				target.queue_free()
				if evidence_found.size() >= 3:
					_show_status("ДОСЬЕ KETER-19 ПОЛНОЕ: все три улики подтверждают пространственную аномалию. ШЛЮЗ ОТКРЫТ — ПРОТОКОЛ «ЗЕРКАЛО» АКТИВЕН. Ты знаешь, что произошло, но коридор всё равно повторяется…")
				else:
					_show_status("ШЛЮЗ ОТКРЫТ. За ним коридор повторяется… ПРОТОКОЛ «ЗЕРКАЛО» АКТИВЕН. В досье не хватает улик: %d/3." % evidence_found.size())
		"archive_log":
			archive_read = true
			target.queue_free()
			_show_status("ЖУРНАЛ СМЕНЫ / 03:17 — камеры пусты, датчики фиксируют движение. Доктор Гирс приказал не открывать камеру KETER-19. Последняя запись: «коридор за воротами не совпадает с планом».")
		"reactor":
			reactor_disabled = true
			target.queue_free()
			_trigger_power_failure()
			_show_status("ГЕНЕРАТОР ОТКЛЮЧЁН. Свет в соседних секторах гаснет по цепочке; аварийные контуры переходят на резервное питание.")
		"comms":
			if comms_restored:
				_show_status("КАНАЛ 7 / АРХИВ: последнее сообщение Гирса сохранено. «Не верь двери с табличкой ВЫХОД. Я уже проходил её. Дважды».")
			else:
				comms_restored = true
				_activate_comms_terminal()
				_show_status("КАНАЛ 7 ВОССТАНОВЛЕН. ВХОДЯЩЕЕ: «Если слышишь это, не верь двери с табличкой ВЫХОД. Я уже проходил её. Дважды». — Гирс")
		"battery_pack", "battery_pack_start":
			var charge := float(player_ref.get("flashlight_charge"))
			if charge >= 100.0:
				_show_status("БАТАРЕЯ НЕ НУЖНА: фонарь уже полностью заряжен.")
				return
			player_ref.set("flashlight_charge", minf(100.0, charge + 40.0))
			battery_packs_found[interaction_id] = true
			var battery_visual_name := "Battery visual" if interaction_id == "battery_pack" else "D-class spare battery"
			_remove_saved_item(interaction_id, battery_visual_name)
			_show_status("БАТАРЕЯ ПОДОБРАНА И УБРАНА В СНАРЯЖЕНИЕ. Заряд фонаря: %d%%." % roundi(float(player_ref.get("flashlight_charge"))))
		"incident_memo":
			evidence_found["incident_memo"] = true
			target.queue_free()
			var memo_visual := facility_ref.find_child("Incident memo paper", true, false) as Node3D
			if memo_visual: memo_visual.visible = false
			_show_status("ДОКАЗАТЕЛЬСТВО / СЛУЖЕБНАЯ ЗАПИСКА: «В 03:17 наблюдение показало коридор на 12 метров длиннее чертежа. При повторном замере длина вернулась к норме. Запись удалить по приказу Гирса»." )
		"camera_tape":
			evidence_found["camera_tape"] = true
			target.queue_free()
			var tape_visual := facility_ref.find_child("Channel 7 recovered tape", true, false) as Node3D
			if tape_visual: tape_visual.visible = false
			_show_status("КАССЕТА №6: на записи пустой коридор. На последнем кадре отражение оператора поворачивает голову раньше самого оператора." )
		"sample_label":
			evidence_found["sample_label"] = true
			target.queue_free()
			var sample_visual := facility_ref.find_child("KETER-19 sample label", true, false) as Node3D
			if sample_visual: sample_visual.visible = false
			_show_status("МАРКИРОВКА KETER-19: «Образец не должен отражать свет. Если отражение появилось — немедленно закрыть контейнер»." )
		_:
			_show_status("Объект пока не реагирует.")
	_save_game_state()

func _open_door(door_name: String) -> void:
	if opened_doors.has(door_name):
		return
	opened_doors[door_name] = true
	var ambience := get_tree().get_first_node_in_group("facility_audio")
	if ambience and ambience.has_method("trigger_metal_event"):
		ambience.trigger_metal_event(0.85)
	_set_door_open(door_name, true)
	_save_game_state()

func _show_status(message: String) -> void:
	if status_label:
		status_label.text = message
	_refresh_objective()
	_save_game_state()

func _trigger_mirror_loop() -> void:
	loop_count += 1
	player_ref.global_position = Vector3(0, 0.1, -7.8)
	player_ref.velocity = Vector3.ZERO
	player_ref.rotation.y = PI
	var camera := player_ref.get_node_or_null("PlayerCamera") as Camera3D
	if camera:
		camera.rotation.x = 0.0
	_show_status("ОШИБКА ПРОСТРАНСТВА / ЦИКЛ %02d — ты снова в грузовом лифте. Состояние комплекса не совпадает с воспоминаниями." % loop_count)
	_save_game_state()

func _refresh_objective() -> void:
	if objective_label == null:
		return
	if loop_count > 0:
		objective_label.text = "ЗАДАЧА: ПРОТОКОЛ «ЗЕРКАЛО» — НАЙТИ ПРИЧИНУ ПОВТОРА КОРИДОРА"
	elif not has_l1:
		objective_label.text = "ЗАДАЧА: НАЙТИ КАРТУ L1 В АДМИНИСТРАЦИИ"
	elif not archive_read:
		objective_label.text = "ЗАДАЧА: ПРОЙТИ ШЛЮЗ L1 И ПРОЧИТАТЬ ЖУРНАЛ В АРХИВЕ"
	elif not has_l2:
		objective_label.text = "ЗАДАЧА: НАЙТИ КАРТУ L2 В УЗЛЕ ДАННЫХ"
	elif not reactor_disabled:
		objective_label.text = "ЗАДАЧА: ОТКЛЮЧИТЬ АВАРИЙНЫЙ ГЕНЕРАТОР В МАСТЕРСКОЙ"
	elif not comms_restored:
		objective_label.text = "ЗАДАЧА: ВОССТАНОВИТЬ СВЯЗЬ НА КАНАЛЕ 7"
	elif evidence_found.size() < 3:
		objective_label.text = "ЗАДАЧА: ОТКРЫТЬ ШЛЮЗ  •  ДОП. ЦЕЛЬ: СОБРАТЬ УЛИКИ %d/3" % evidence_found.size()
	else:
		objective_label.text = "ЗАДАЧА: ОТКРЫТЬ ЭВАКУАЦИОННЫЙ ШЛЮЗ — ДОСЬЕ ПОЛНОЕ"

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
	env.ambient_light_color = Color(0.42, 0.45, 0.49)
	env.ambient_light_energy = 0.72
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.adjustment_enabled = true
	env.adjustment_brightness = 0.96
	env.adjustment_contrast = 1.12
	env.adjustment_saturation = 0.82
	env.fog_enabled = true
	env.fog_light_color = Color(0.045, 0.035, 0.04)
	env.fog_density = 0.0038
	env.fog_sun_scatter = 0.12
	env.glow_enabled = true
	env.glow_intensity = 0.3
	env.glow_bloom = 0.055
	world.environment = env
	add_child(world)
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-35, -25, 0)
	light.light_color = Color(0.55, 0.61, 0.72)
	light.light_energy = 0.55
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
	var config := ConfigFile.new()
	if config.load("user://keter_breach_save.cfg") == OK:
		player.set("flashlight_charge", clampf(float(config.get_value("player", "flashlight_charge", 100.0)), 0.0, 100.0))


func _build_menu() -> void:
	# Use the actual facility as the menu backdrop: this is a live 3D camera, not a flat poster.
	menu_camera = Camera3D.new()
	menu_camera.name = "MenuCinematicCamera"
	menu_camera.fov = 66.0
	menu_camera.position = Vector3(0, 2.22, 31.0)
	menu_camera.look_at(Vector3(0, 1.55, 58.0), Vector3.UP)
	add_child(menu_camera)
	menu_camera.current = true
	var player_camera := player_ref.get_node_or_null("PlayerCamera") as Camera3D
	if player_camera:
		player_camera.current = false
	menu_alarm_light = OmniLight3D.new()
	menu_alarm_light.name = "MenuAlarmPulse"
	menu_alarm_light.position = Vector3(0, 2.8, 47.0)
	menu_alarm_light.light_color = Color(0.85, 0.025, 0.018)
	menu_alarm_light.light_energy = 0.6
	menu_alarm_light.omni_range = 10.0
	add_child(menu_alarm_light)
	menu_layer = CanvasLayer.new()
	menu_layer.name = "MainMenu"
	menu_layer.layer = 20
	add_child(menu_layer)
	menu_root = Control.new()
	menu_root.name = "MenuRoot"
	menu_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	menu_layer.add_child(menu_root)
	var shade := ColorRect.new()
	shade.name = "MenuAtmosphereOverlay"
	shade.color = Color(0.004, 0.008, 0.012, 0.34)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	menu_root.add_child(shade)
	var dossier_panel := Panel.new()
	dossier_panel.name = "DossierBackdrop"
	dossier_panel.anchor_left = 0.635
	dossier_panel.anchor_right = 0.975
	dossier_panel.anchor_top = 0.20
	dossier_panel.anchor_bottom = 0.79
	dossier_panel.offset_left = 0
	dossier_panel.offset_right = 0
	dossier_panel.offset_top = 0
	dossier_panel.offset_bottom = 0
	var dossier_style := StyleBoxFlat.new()
	dossier_style.bg_color = Color(0.006, 0.012, 0.016, 0.62)
	dossier_style.border_color = Color(0.22, 0.075, 0.065, 0.72)
	dossier_style.set_border_width_all(1)
	dossier_style.set_content_margin_all(18)
	dossier_panel.add_theme_stylebox_override("panel", dossier_style)
	dossier_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	menu_root.add_child(dossier_panel)
	var menu_panel := Panel.new()
	menu_panel.name = "MenuPanel"
	menu_panel.anchor_left = 0.035
	menu_panel.anchor_right = 0.385
	menu_panel.anchor_top = 0.055
	menu_panel.anchor_bottom = 0.945
	menu_panel.offset_left = 0
	menu_panel.offset_right = 0
	menu_panel.offset_top = 0
	menu_panel.offset_bottom = 0
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.008, 0.013, 0.017, 0.82)
	panel_style.border_color = Color(0.58, 0.10, 0.075, 0.98)
	panel_style.set_border_width_all(1)
	panel_style.set_content_margin_all(24)
	menu_panel.add_theme_stylebox_override("panel", panel_style)
	menu_root.add_child(menu_panel)
	var column := VBoxContainer.new()
	column.name = "MenuColumn"
	column.anchor_left = 0.055
	column.anchor_right = 0.365
	column.anchor_top = 0.105
	column.anchor_bottom = 0.895
	column.offset_left = 0
	column.offset_right = 0
	column.offset_top = 0
	column.offset_bottom = 0
	column.add_theme_constant_override("separation", 12)
	menu_root.add_child(column)
	var eyebrow := Label.new()
	eyebrow.text = "ФОНД • ОТДЕЛ KETER • ДОСЬЕ D-12"
	eyebrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	eyebrow.add_theme_font_size_override("font_size", 16)
	eyebrow.add_theme_color_override("font_color", Color(0.76, 0.18, 0.15))
	column.add_child(eyebrow)
	var title := Label.new()
	title.text = "KETER BREACH"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 44)
	title.add_theme_color_override("font_color", Color(0.91, 0.9, 0.86))
	column.add_child(title)
	var title_rule := ColorRect.new()
	title_rule.name = "TitleRule"
	title_rule.color = Color(0.72, 0.075, 0.055, 0.95)
	title_rule.custom_minimum_size = Vector2(160, 2)
	title_rule.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	column.add_child(title_rule)
	var subtitle := Label.new()
	subtitle.text = "ОБЪЕКТ KETER-19  //  ИНЦИДЕНТ 03:17"
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_font_size_override("font_size", 17)
	subtitle.add_theme_color_override("font_color", Color(0.64, 0.67, 0.69))
	column.add_child(subtitle)
	var spacer := Control.new()
	spacer.custom_minimum_size.y = 18
	column.add_child(spacer)
	_add_menu_button(column, "НАЧАТЬ ИГРУ", _start_intro)
	_add_menu_button(column, "ПРОДОЛЖИТЬ", _continue_game)
	_add_menu_button(column, "ДОСЬЕ ИНЦИДЕНТА", _show_dossier)
	var footer := Label.new()
	footer.text = "WASD / SHIFT — ДВИЖЕНИЕ И БЕГ\nF — ФОНАРЬ   •   E — ВЗАИМОДЕЙСТВИЕ"
	footer.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	footer.add_theme_font_size_override("font_size", 12)
	footer.add_theme_color_override("font_color", Color(0.52, 0.55, 0.57))
	column.add_child(footer)
	var camera_feed := Label.new()
	camera_feed.name = "CameraFeedLabel"
	camera_feed.text = "●  LIVE FEED  /  CAM-06\nSECTOR D-12  •  03:17:04"
	camera_feed.anchor_left = 0.66
	camera_feed.anchor_right = 0.975
	camera_feed.anchor_top = 0.045
	camera_feed.anchor_bottom = 0.13
	camera_feed.offset_left = 0
	camera_feed.offset_right = 0
	camera_feed.offset_top = 0
	camera_feed.offset_bottom = 0
	camera_feed.add_theme_font_size_override("font_size", 16)
	camera_feed.add_theme_color_override("font_color", Color(0.92, 0.16, 0.12, 0.9))
	camera_feed.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	menu_root.add_child(camera_feed)
	var incident_stamp := Label.new()
	incident_stamp.name = "IncidentStamp"
	incident_stamp.text = "CONTAINMENT FAILURE\nUNAUTHORIZED MOVEMENT DETECTED"
	incident_stamp.anchor_left = 0.64
	incident_stamp.anchor_right = 0.975
	incident_stamp.anchor_top = 0.84
	incident_stamp.anchor_bottom = 0.94
	incident_stamp.offset_left = 0
	incident_stamp.offset_right = 0
	incident_stamp.offset_top = 0
	incident_stamp.offset_bottom = 0
	incident_stamp.add_theme_font_size_override("font_size", 13)
	incident_stamp.add_theme_color_override("font_color", Color(0.78, 0.25, 0.2, 0.78))
	incident_stamp.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	menu_root.add_child(incident_stamp)
	intro_root = Control.new()
	intro_root.name = "IntroRoot"
	intro_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	intro_root.visible = false
	menu_layer.add_child(intro_root)
	var intro_shade := ColorRect.new()
	intro_shade.color = Color(0.004, 0.006, 0.009, 0.96)
	intro_shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	intro_shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	intro_root.add_child(intro_shade)
	var intro_column := VBoxContainer.new()
	intro_column.name = "IntroColumn"
	intro_column.set_anchors_preset(Control.PRESET_CENTER)
	intro_column.position = Vector2(-430, -230)
	intro_column.size = Vector2(860, 460)
	intro_column.add_theme_constant_override("separation", 22)
	intro_root.add_child(intro_column)
	var intro_header := Label.new()
	intro_header.name = "IntroHeader"
	intro_header.text = "ЗАПИСЬ СИСТЕМЫ НАБЛЮДЕНИЯ // 03:17"
	intro_header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	intro_header.add_theme_font_size_override("font_size", 16)
	intro_header.add_theme_color_override("font_color", Color(0.8, 0.12, 0.1))
	intro_column.add_child(intro_header)
	var intro_text := Label.new()
	intro_text.name = "IntroText"
	intro_text.text = ""
	intro_text.custom_minimum_size = Vector2(820, 240)
	intro_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	intro_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	intro_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	intro_text.add_theme_font_size_override("font_size", 22)
	intro_text.add_theme_color_override("font_color", Color(0.84, 0.83, 0.78))
	intro_column.add_child(intro_text)
	var continue_button := Button.new()
	continue_button.name = "IntroContinue"
	continue_button.text = "ДАЛЕЕ  →"
	continue_button.custom_minimum_size = Vector2(280, 48)
	continue_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	continue_button.pressed.connect(_advance_intro)
	_style_menu_button(continue_button)
	intro_column.add_child(continue_button)
	var skip_button := Button.new()
	skip_button.name = "IntroSkip"
	skip_button.text = "ПРОПУСТИТЬ ИНТРО"
	skip_button.custom_minimum_size = Vector2(220, 36)
	skip_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	skip_button.pressed.connect(_enter_game)
	skip_button.add_theme_font_size_override("font_size", 13)
	intro_column.add_child(skip_button)

	loading_root = Control.new()
	loading_root.name = "LoadingRoot"
	loading_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	loading_root.visible = false
	menu_layer.add_child(loading_root)
	var loading_bg := ColorRect.new()
	loading_bg.color = Color(0.006, 0.009, 0.012, 1.0)
	loading_bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	loading_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	loading_root.add_child(loading_bg)
	var loading_column := VBoxContainer.new()
	loading_column.name = "LoadingColumn"
	loading_column.set_anchors_preset(Control.PRESET_CENTER)
	loading_column.position = Vector2(-360, -115)
	loading_column.size = Vector2(720, 230)
	loading_column.add_theme_constant_override("separation", 18)
	loading_root.add_child(loading_column)
	var loading_tag := Label.new()
	loading_tag.text = "ФОНД • СИСТЕМА АВАРИЙНОГО ДОСТУПА"
	loading_tag.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	loading_tag.add_theme_font_size_override("font_size", 14)
	loading_tag.add_theme_color_override("font_color", Color(0.8, 0.13, 0.1))
	loading_column.add_child(loading_tag)
	var loading_title := Label.new()
	loading_title.text = "ПОДКЛЮЧЕНИЕ К СЕКТОРУ D-12"
	loading_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	loading_title.add_theme_font_size_override("font_size", 28)
	loading_title.add_theme_color_override("font_color", Color(0.88, 0.89, 0.86))
	loading_column.add_child(loading_title)
	loading_status = Label.new()
	loading_status.text = "Проверка шлюзов и состояния комплекса..."
	loading_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	loading_status.add_theme_font_size_override("font_size", 15)
	loading_status.add_theme_color_override("font_color", Color(0.58, 0.62, 0.63))
	loading_column.add_child(loading_status)
	loading_progress = ProgressBar.new()
	loading_progress.min_value = 0.0
	loading_progress.max_value = 100.0
	loading_progress.value = 0.0
	loading_progress.show_percentage = false
	loading_progress.custom_minimum_size = Vector2(620, 12)
	loading_progress.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	var progress_bg := StyleBoxFlat.new()
	progress_bg.bg_color = Color(0.035, 0.045, 0.05, 1.0)
	progress_bg.border_color = Color(0.22, 0.25, 0.26, 1.0)
	progress_bg.set_border_width_all(1)
	loading_progress.add_theme_stylebox_override("background", progress_bg)
	var progress_fill := StyleBoxFlat.new()
	progress_fill.bg_color = Color(0.72, 0.055, 0.04, 1.0)
	loading_progress.add_theme_stylebox_override("fill", progress_fill)
	loading_column.add_child(loading_progress)
	var loading_footer := Label.new()
	loading_footer.text = "KETER-19  //  СТАТУС ПЕРСОНАЛА: НЕИЗВЕСТЕН"
	loading_footer.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	loading_footer.add_theme_font_size_override("font_size", 12)
	loading_footer.add_theme_color_override("font_color", Color(0.42, 0.45, 0.46))
	loading_column.add_child(loading_footer)

func _add_menu_button(parent: VBoxContainer, label_text: String, callback: Callable) -> void:
	var button := Button.new()
	button.text = label_text
	button.custom_minimum_size = Vector2(360, 52)
	button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	button.pressed.connect(callback)
	_style_menu_button(button)
	parent.add_child(button)

func _style_menu_button(button: Button) -> void:
	button.add_theme_font_size_override("font_size", 17)
	button.add_theme_color_override("font_color", Color(0.88, 0.87, 0.83))
	button.add_theme_color_override("font_hover_color", Color(1.0, 0.25, 0.19))
	button.add_theme_color_override("font_pressed_color", Color(1.0, 0.35, 0.24))
	button.add_theme_stylebox_override("normal", _menu_button_style(Color(0.018, 0.026, 0.032, 0.94), Color(0.28, 0.075, 0.065, 0.92)))
	button.add_theme_stylebox_override("hover", _menu_button_style(Color(0.09, 0.025, 0.025, 0.96), Color(0.78, 0.12, 0.09, 1.0)))
	button.add_theme_stylebox_override("pressed", _menu_button_style(Color(0.14, 0.025, 0.02, 1.0), Color(0.9, 0.16, 0.1, 1.0)))

func _menu_button_style(fill: Color, outline: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = outline
	style.set_border_width_all(1)
	style.set_border_width(SIDE_LEFT, 3)
	style.set_content_margin_all(12)
	return style

func _start_intro() -> void:
	if intro_tween != null and intro_tween.is_running():
		intro_tween.kill()
	menu_root.visible = false
	intro_root.visible = true
	intro_page = 0
	_update_intro_page()
	var button := intro_root.find_child("IntroContinue", true, false) as Button
	var skip_button := intro_root.find_child("IntroSkip", true, false) as Button
	if button:
		for connection in button.pressed.get_connections():
			button.pressed.disconnect(connection.callable)
		button.text = "ПРОПУСТИТЬ ИНТРО  →"
		button.pressed.connect(_enter_game)
	if skip_button:
		skip_button.visible = false
	# Each narrative card plays on its own; no manual input is needed.
	intro_tween = create_tween()
	intro_tween.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	for page_index in range(3):
		intro_tween.tween_interval(5.2)
		intro_tween.tween_callback(_auto_advance_intro)

func _update_intro_page() -> void:
	var text_label := intro_root.find_child("IntroText", true, false) as Label
	var header := intro_root.find_child("IntroHeader", true, false) as Label
	var button := intro_root.find_child("IntroContinue", true, false) as Button
	var pages := [
		{"header":"ЗАПИСЬ СИСТЕМЫ НАБЛЮДЕНИЯ // 03:17","text":"СЕКТОР D-12. ПРОТОКОЛ СОДЕРЖАНИЯ НАРУШЕН.\n\nСвязь с персоналом потеряна. Камеры показывают пустые коридоры, но датчики продолжают фиксировать движение."},
		{"header":"ЛИЧНОЕ ДЕЛО // D-CLASS","text":"Вы очнулись в грузовом лифте. Последние 47 минут стёрты из памяти. На форме нет имени — только номер испытуемого.\n\nПо внутренней связи доктор Гирс повторяет: «Не открывайте камеру KETER-19»."},
		{"header":"ПРИОРИТЕТЫ // ЭВАКУАЦИЯ","text":"Найдите карту L1, изучите журнал смены, получите доступ к техническим секторам и восстановите связь. Не доверяйте маршруту эвакуации.\n\nЕсли увидите коридор, которого нет на плане, не входите в него."}
	]
	var page: Dictionary = pages[intro_page]
	header.text = str(page["header"])
	text_label.text = str(page["text"])
	button.text = "ПРОПУСТИТЬ ИНТРО  →"

func _advance_intro() -> void:
	# Kept as a safe fallback for any legacy button connection.
	_enter_game()

func _auto_advance_intro() -> void:
	if intro_root == null or not intro_root.visible:
		return
	if intro_page < 2:
		intro_page += 1
		_update_intro_page()
	else:
		intro_tween = null
		_enter_game()

func _continue_game() -> void:
	_enter_game()

func _show_dossier() -> void:
	if intro_tween != null and intro_tween.is_running():
		intro_tween.kill()
	intro_tween = null
	menu_root.visible = false
	intro_root.visible = true
	var header := intro_root.find_child("IntroHeader", true, false) as Label
	var text_label := intro_root.find_child("IntroText", true, false) as Label
	var button := intro_root.find_child("IntroContinue", true, false) as Button
	var skip_button := intro_root.find_child("IntroSkip", true, false) as Button
	header.text = "ДОСЬЕ ИНЦИДЕНТА // KETER-19"
	text_label.text = "03:17 — аварийный сигнал зафиксирован в секторе D-12.\n\nДоктор Гирс сообщил о расхождении показаний камер и датчиков движения. Последняя запись смены содержит предупреждение о коридоре, которого нет на плане комплекса.\n\nДоступ к полному досье засекречен."
	button.text = "ВЕРНУТЬСЯ В МЕНЮ"
	for connection in button.pressed.get_connections():
		button.pressed.disconnect(connection.callable)
	button.pressed.connect(_return_to_menu)
	if skip_button:
		skip_button.visible = false

func _return_to_menu() -> void:
	if intro_tween != null and intro_tween.is_running():
		intro_tween.kill()
	intro_tween = null
	intro_root.visible = false
	menu_root.visible = true
	var button := intro_root.find_child("IntroContinue", true, false) as Button
	var skip_button := intro_root.find_child("IntroSkip", true, false) as Button
	if button:
		for connection in button.pressed.get_connections():
			button.pressed.disconnect(connection.callable)
		button.pressed.connect(_advance_intro)
		button.text = "ДАЛЕЕ  →"
	if skip_button:
		skip_button.visible = true
	_update_intro_page()

func _enter_game() -> void:
	if loading_root == null or loading_root.visible:
		return
	if intro_tween != null and intro_tween.is_running():
		intro_tween.kill()
	intro_tween = null
	menu_root.visible = false
	intro_root.visible = false
	loading_root.visible = true
	loading_progress.value = 0.0
	loading_status.text = "Проверка шлюзов и состояния комплекса..."
	var tween := create_tween()
	tween.tween_property(loading_progress, "value", 34.0, 0.65)
	tween.tween_callback(func(): loading_status.text = "Синхронизация систем наблюдения...")
	tween.tween_property(loading_progress, "value", 72.0, 0.8)
	tween.tween_callback(func(): loading_status.text = "Восстановление данных сектора D-12...")
	tween.tween_property(loading_progress, "value", 100.0, 0.55)
	tween.tween_callback(_finish_enter_game)

func _finish_enter_game() -> void:
	game_started = true
	loading_root.visible = false
	hud_layer.visible = true
	player_ref.set_process(true)
	player_ref.set_physics_process(true)
	var player_camera := player_ref.get_node_or_null("PlayerCamera") as Camera3D
	if player_camera:
		player_camera.current = true
	if menu_camera:
		menu_camera.current = false
	if menu_alarm_light:
		menu_alarm_light.visible = false
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	_show_status("03:17 — грузовой лифт остановился. Последние 47 минут отсутствуют в памяти. Найди карту L1 в администрации.")

func _add_map_room(room_name: String, x1: float, z1: float, x2: float, z2: float, tint: Color) -> void:
	if map_panel == null:
		return
	var room := ColorRect.new()
	room.name = "MapRoom_" + room_name.replace(" ", "")
	room.color = tint
	var left := 8.0 + ((x1 + 40.0) / 80.0) * 156.0
	var right := 8.0 + ((x2 + 40.0) / 80.0) * 156.0
	var top := 25.0 + ((z1 + 10.0) / 140.0) * 183.0
	var bottom := 25.0 + ((z2 + 10.0) / 140.0) * 183.0
	room.position = Vector2(left, top)
	room.size = Vector2(maxf(2.0, right - left), maxf(2.0, bottom - top))
	room.mouse_filter = Control.MOUSE_FILTER_IGNORE
	map_panel.add_child(room)

func _build_hud() -> void:
	var layer := CanvasLayer.new()
	layer.name = "HUD"
	layer.layer = 5
	add_child(layer)
	hud_layer = layer
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
	inventory_label = Label.new()
	inventory_label.name = "Inventory"
	inventory_label.position = Vector2(24, 80)
	inventory_label.add_theme_font_size_override("font_size", 14)
	inventory_label.add_theme_color_override("font_color", Color(0.78, 0.82, 0.76, 0.95))
	layer.add_child(inventory_label)
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
	# Schematic rooms are drawn from the same world coordinates as facility_layout.gd.
	_add_map_room("Main spine", -4.0, -10.0, 4.0, 130.0, Color(0.20, 0.24, 0.26, 0.95))
	_add_map_room("Start lift", -14.0, -10.0, -4.0, 2.0, Color(0.32, 0.35, 0.36, 0.95))
	_add_map_room("Administration", -15.0, 4.0, -5.0, 16.0, Color(0.34, 0.30, 0.22, 0.95))
	_add_map_room("Archive", -37.0, 6.0, -13.0, 30.0, Color(0.29, 0.27, 0.23, 0.95))
	_add_map_room("West service wing", -17.0, 24.0, -5.0, 44.0, Color(0.30, 0.31, 0.32, 0.95))
	_add_map_room("Laboratory", 5.0, 27.0, 15.0, 39.0, Color(0.18, 0.34, 0.29, 0.95))
	_add_map_room("Medical block", 15.0, 25.0, 37.0, 51.0, Color(0.28, 0.34, 0.38, 0.95))
	_add_map_room("Containment", -16.0, 44.0, 16.0, 60.0, Color(0.42, 0.19, 0.17, 0.95))
	_add_map_room("Reactor", -37.0, 49.0, -16.0, 75.0, Color(0.43, 0.23, 0.13, 0.95))
	_add_map_room("Security post", -14.0, 63.0, -4.0, 77.0, Color(0.36, 0.28, 0.20, 0.95))
	_add_map_room("Observation gallery", 13.0, 58.0, 37.0, 82.0, Color(0.20, 0.30, 0.34, 0.95))
	_add_map_room("Personnel", -35.0, 79.0, -15.0, 97.0, Color(0.31, 0.30, 0.27, 0.95))
	_add_map_room("Channel 7", -15.0, 83.0, 15.0, 105.0, Color(0.18, 0.34, 0.29, 0.95))
	_add_map_room("Mirror corridor", -4.0, 105.0, 4.0, 130.0, Color(0.40, 0.10, 0.10, 0.95))
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
