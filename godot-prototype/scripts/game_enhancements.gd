extends Node
## QoL layer: pause menu, settings, stamina HUD and subtle screen effects.
## Installed by main.gd after the base scene has been built.

const SAVE_PATH := "user://keter_breach_save.cfg"
const SETTINGS_PATH := "user://keter_settings.cfg"
const FX_SHADER := preload("res://shaders/screen_fx.gdshader")

var main: Node
var settings := {"volume": 0.8, "sensitivity": 1.0, "fov": 75.0, "quality": 2, "fx": true, "fullscreen": false}
var fx_rect: ColorRect
var pause_layer: CanvasLayer
var pause_root: Control
var settings_root: Control
var stamina_bar: ProgressBar
var stamina_fill: StyleBoxFlat

func _ready() -> void:
	main = get_parent()
	process_mode = Node.PROCESS_MODE_ALWAYS
	_load_settings()
	_build_fx()
	_build_stamina_bar()
	_build_pause_ui()
	_patch_main_menu()
	_apply_settings()
	if Engine.has_meta("keter_new_game"):
		Engine.remove_meta("keter_new_game")
		main.call_deferred("_start_intro")

func _load_settings() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SETTINGS_PATH) != OK:
		return
	for key in settings.keys():
		settings[key] = cfg.get_value("settings", key, settings[key])

func _save_settings() -> void:
	var cfg := ConfigFile.new()
	for key in settings.keys():
		cfg.set_value("settings", key, settings[key])
	var err := cfg.save(SETTINGS_PATH)
	if err != OK:
		push_warning("Keter Breach: settings could not be saved (error %d)." % err)

func _apply_settings() -> void:
	AudioServer.set_bus_volume_db(0, linear_to_db(maxf(float(settings["volume"]), 0.0001)))
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if bool(settings["fullscreen"]) else DisplayServer.WINDOW_MODE_WINDOWED)
	if is_instance_valid(fx_rect):
		fx_rect.visible = bool(settings["fx"])
	var quality := clampi(int(settings["quality"]), 0, 2)
	get_viewport().msaa_3d = Viewport.MSAA_4X if quality >= 2 else Viewport.MSAA_DISABLED
	var player = main.player_ref
	if player != null and is_instance_valid(player):
		player.set("mouse_sensitivity", 0.0018 * float(settings["sensitivity"]))
		player.set("base_fov", float(settings["fov"]))
		var flash = player.get("flashlight")
		if flash is SpotLight3D:
			flash.shadow_enabled = quality >= 1
	for child in main.get_children():
		if child is WorldEnvironment and child.environment != null:
			child.environment.glow_enabled = quality >= 1

func _format(key: String) -> String:
	var v := float(settings[key])
	match key:
		"volume":
			return "%d%%" % roundi(v * 100.0)
		"sensitivity":
			return "%.2fx" % v
		"fov":
			return "%d°" % roundi(v)
	return str(v)

func _build_fx() -> void:
	var layer := CanvasLayer.new()
	layer.name = "ScreenFX"
	layer.layer = 50
	add_child(layer)
	fx_rect = ColorRect.new()
	fx_rect.name = "ScreenFXRect"
	fx_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	fx_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var mat := ShaderMaterial.new()
	mat.shader = FX_SHADER
	fx_rect.material = mat
	layer.add_child(fx_rect)

func _build_stamina_bar() -> void:
	stamina_bar = ProgressBar.new()
	stamina_bar.name = "StaminaBar"
	stamina_bar.min_value = 0.0
	stamina_bar.max_value = 100.0
	stamina_bar.value = 100.0
	stamina_bar.show_percentage = false
	stamina_bar.anchor_top = 1.0
	stamina_bar.anchor_bottom = 1.0
	stamina_bar.offset_left = 24
	stamina_bar.offset_right = 204
	stamina_bar.offset_top = -34
	stamina_bar.offset_bottom = -26
	stamina_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0.03, 0.04, 0.045, 0.85)
	stamina_bar.add_theme_stylebox_override("background", bg)
	stamina_fill = StyleBoxFlat.new()
	stamina_fill.bg_color = Color(0.82, 0.8, 0.74)
	stamina_bar.add_theme_stylebox_override("fill", stamina_fill)
	main.hud_layer.add_child(stamina_bar)

func _process(_delta: float) -> void:
	var player = main.player_ref
	if player == null or not is_instance_valid(player):
		return
	stamina_bar.value = float(player.get("stamina"))
	stamina_fill.bg_color = Color(0.85, 0.12, 0.1) if bool(player.get("exhausted")) else Color(0.82, 0.8, 0.74)
	if main.battery_label != null:
		var low := float(player.get("flashlight_charge")) < 20.0
		main.battery_label.add_theme_color_override("font_color", Color(0.95, 0.25, 0.2) if low else Color(0.45, 0.9, 0.58))

func _has_progress() -> bool:
	return main.has_l1 or main.has_l2 or main.archive_read or main.reactor_disabled or main.comms_restored \
		or main.loop_count > 0 or main.opened_doors.size() > 0 or main.triggered_events.size() > 0 or main.evidence_found.size() > 0

func _patch_main_menu() -> void:
	var column = main.menu_root.find_child("MenuColumn", true, false)
	if column == null:
		return
	for child in column.get_children():
		if child is Button and child.text == "НАЧАТЬ ИГРУ":
			for connection in child.pressed.get_connections():
				child.pressed.disconnect(connection.callable)
			child.pressed.connect(_on_new_game)
		elif child is Button and child.text == "ПРОДОЛЖИТЬ":
			child.disabled = not _has_progress()
	var settings_button := Button.new()
	settings_button.text = "НАСТРОЙКИ"
	settings_button.custom_minimum_size = Vector2(390, 48)
	settings_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	settings_button.pressed.connect(_open_settings)
	main._style_menu_button(settings_button)
	column.add_child(settings_button)
	column.move_child(settings_button, maxi(0, column.get_child_count() - 2))

func _on_new_game() -> void:
	if not _has_progress():
		main._start_intro()
		return
	var absolute_save_path := ProjectSettings.globalize_path(SAVE_PATH)
	if FileAccess.file_exists(absolute_save_path):
		var err := DirAccess.remove_absolute(absolute_save_path)
		if err != OK:
			push_warning("Keter Breach: could not remove old save (error %d)." % err)
			main._show_status("НЕ УДАЛОСЬ СБРОСИТЬ СОХРАНЕНИЕ. Проверьте доступ к файлу.")
			return
	Engine.set_meta("keter_new_game", true)
	get_tree().paused = false
	get_tree().reload_current_scene()

func _build_pause_ui() -> void:
	pause_layer = CanvasLayer.new()
	pause_layer.name = "PauseLayer"
	pause_layer.layer = 60
	add_child(pause_layer)

	pause_root = Control.new()
	pause_root.name = "PauseRoot"
	pause_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	pause_root.visible = false
	pause_layer.add_child(pause_root)
	_add_shade(pause_root)
	var pause_column := _centered_column(pause_root, Vector2(420, 300))
	pause_column.add_child(_label("ПАУЗА", 40, Color(0.91, 0.9, 0.86)))
	pause_column.add_child(_label("СЕКТОР D-12  //  ПРОТОКОЛ ЗАМОРОЖЕН", 13, Color(0.76, 0.18, 0.15)))
	_add_button(pause_column, "ПРОДОЛЖИТЬ", func() -> void: _set_paused(false))
	_add_button(pause_column, "НАСТРОЙКИ", _open_settings)
	_add_button(pause_column, "В ГЛАВНОЕ МЕНЮ", func() -> void:
		get_tree().paused = false
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		get_tree().reload_current_scene()
	)

	settings_root = Control.new()
	settings_root.name = "SettingsRoot"
	settings_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	settings_root.visible = false
	pause_layer.add_child(settings_root)
	_add_shade(settings_root)
	var col := _centered_column(settings_root, Vector2(460, 520))
	col.add_child(_label("НАСТРОЙКИ", 34, Color(0.91, 0.9, 0.86)))
	_add_slider(col, "Громкость", "volume", 0.0, 1.0, 0.05)
	_add_slider(col, "Чувствительность мыши", "sensitivity", 0.4, 2.0, 0.05)
	_add_slider(col, "Поле зрения", "fov", 60.0, 100.0, 1.0)
	var quality_row := HBoxContainer.new()
	quality_row.add_child(_label("Качество графики", 15, Color(0.84, 0.83, 0.78)))
	var option := OptionButton.new()
	for quality_name in ["Низкое", "Среднее", "Высокое"]:
		option.add_item(quality_name)
	option.select(clampi(int(settings["quality"]), 0, 2))
	option.item_selected.connect(func(index: int) -> void:
		settings["quality"] = index
		_apply_settings()
		_save_settings()
	)
	quality_row.add_child(option)
	col.add_child(quality_row)
	_add_check(col, "Эффекты экрана (зерно, виньетка)", "fx")
	_add_check(col, "Полный экран", "fullscreen")
	_add_button(col, "НАЗАД", _close_settings)

func _add_shade(parent: Control) -> void:
	var shade := ColorRect.new()
	shade.color = Color(0.004, 0.006, 0.009, 0.82)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_STOP
	parent.add_child(shade)

func _centered_column(parent: Control, size: Vector2) -> VBoxContainer:
	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_CENTER)
	col.position = -size * 0.5
	col.size = size
	col.add_theme_constant_override("separation", 14)
	parent.add_child(col)
	return col

func _label(text_value: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text_value
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	return label

func _add_button(parent: Control, text_value: String, callback: Callable) -> void:
	var button := Button.new()
	button.text = text_value
	button.custom_minimum_size = Vector2(320, 46)
	button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	button.pressed.connect(callback)
	main._style_menu_button(button)
	parent.add_child(button)

func _add_slider(parent: Control, title: String, key: String, lo: float, hi: float, step: float) -> void:
	var row := VBoxContainer.new()
	row.add_theme_constant_override("separation", 3)
	var label := _label("%s: %s" % [title, _format(key)], 15, Color(0.84, 0.83, 0.78))
	var slider := HSlider.new()
	slider.min_value = lo
	slider.max_value = hi
	slider.step = step
	slider.value = clampf(float(settings[key]), lo, hi)
	slider.custom_minimum_size = Vector2(380, 24)
	slider.value_changed.connect(func(value: float) -> void:
		settings[key] = value
		label.text = "%s: %s" % [title, _format(key)]
		_apply_settings()
		_save_settings()
	)
	row.add_child(label)
	row.add_child(slider)
	parent.add_child(row)

func _add_check(parent: Control, text_value: String, key: String) -> void:
	var check := CheckBox.new()
	check.text = text_value
	check.button_pressed = bool(settings[key])
	check.toggled.connect(func(enabled: bool) -> void:
		settings[key] = enabled
		_apply_settings()
		_save_settings()
	)
	parent.add_child(check)

func _open_settings() -> void:
	settings_root.visible = true

func _close_settings() -> void:
	settings_root.visible = false

func _set_paused(paused: bool) -> void:
	get_tree().paused = paused
	pause_root.visible = paused
	if not paused:
		settings_root.visible = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if paused else Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE):
		return
	if settings_root.visible:
		_close_settings()
	elif main.game_started:
		_set_paused(not get_tree().paused)
	get_viewport().set_input_as_handled()
