extends CharacterBody3D

@export var walk_speed: float = 4.2
@export var mouse_sensitivity: float = 0.0018
@export var gravity: float = 18.0
var look_pitch: float = 0.0
var can_look: bool = true
var camera: Camera3D
var flashlight: SpotLight3D
var flashlight_charge: float = 100.0
var flashlight_drain_rate: float = 0.16
var stamina: float = 100.0
var exhausted: bool = false
var base_fov: float = 75.0
var stamina_drain_rate: float = 22.0
var stamina_recovery_rate: float = 14.0
var is_moving: bool = false
var is_sprinting: bool = false
var bob_time: float = 0.0

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	camera = Camera3D.new()
	camera.name = "PlayerCamera"
	camera.position = Vector3(0, 1.62, 0)
	camera.current = true
	camera.fov = base_fov
	add_child(camera)
	flashlight = SpotLight3D.new()
	flashlight.name = "PlayerFlashlight"
	flashlight.position = Vector3(0.18, -0.12, -0.25)
	flashlight.light_color = Color(0.82, 0.88, 1.0)
	flashlight.light_energy = 5.2
	flashlight.spot_range = 28.0
	flashlight.spot_angle = 44.0
	flashlight.shadow_enabled = true
	flashlight.shadow_bias = 0.08
	camera.add_child(flashlight)
	_add_action("move_forward", KEY_W)
	_add_action("move_back", KEY_S)
	_add_action("move_left", KEY_A)
	_add_action("move_right", KEY_D)
	_add_action("sprint", KEY_SHIFT)
	_add_action("toggle_flashlight", KEY_F)
	_add_action("release_mouse", KEY_ESCAPE)

func _add_action(action: String, keycode: Key) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	var event := InputEventKey.new()
	event.physical_keycode = keycode
	if not InputMap.action_has_event(action, event):
		InputMap.action_add_event(action, event)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	elif event is InputEventKey and event.pressed and event.keycode == KEY_F:
		if flashlight_charge > 0.0:
			flashlight.visible = not flashlight.visible
		else:
			flashlight.visible = false
	elif event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * mouse_sensitivity)
		look_pitch = clampf(look_pitch - event.relative.y * mouse_sensitivity, deg_to_rad(-82), deg_to_rad(82))
		camera.rotation.x = look_pitch

func _process(delta: float) -> void:
	if flashlight != null and flashlight.visible:
		flashlight_charge = maxf(0.0, flashlight_charge - flashlight_drain_rate * delta)
		if flashlight_charge <= 0.0:
			flashlight.visible = false
		elif flashlight_charge < 15.0:
			flashlight.light_energy = 5.2 * (0.25 if randf() < 0.07 else 1.0)
		else:
			flashlight.light_energy = 5.2
	var target_fov := base_fov + (7.0 if is_sprinting else 0.0)
	camera.fov = lerpf(camera.fov, target_fov, minf(1.0, delta * 8.0))
	var bob := 0.0
	if is_moving:
		bob_time += delta * (13.0 if is_sprinting else 9.0)
		bob = sin(bob_time) * 0.035
	camera.position.y = lerpf(camera.position.y, 1.62 + bob, minf(1.0, delta * 14.0))

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta
	else:
		velocity.y = 0.0
	var input_dir := Vector2.ZERO
	input_dir.y = float(Input.is_action_pressed("move_back")) - float(Input.is_action_pressed("move_forward"))
	input_dir.x = float(Input.is_action_pressed("move_right")) - float(Input.is_action_pressed("move_left"))
	input_dir = input_dir.normalized()
	var moving := input_dir.length_squared() > 0.01
	var wants_sprint := Input.is_action_pressed("sprint") and moving
	if exhausted and stamina > 25.0:
		exhausted = false
	is_sprinting = wants_sprint and not exhausted and stamina > 0.0
	if is_sprinting:
		stamina = maxf(0.0, stamina - stamina_drain_rate * delta)
		if stamina <= 0.0:
			exhausted = true
	else:
		stamina = minf(100.0, stamina + stamina_recovery_rate * delta)
	is_moving = moving and is_on_floor()
	var speed := walk_speed * (1.65 if is_sprinting else 1.0)
	var direction := (global_transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
	if direction:
		velocity.x = direction.x * speed
		velocity.z = direction.z * speed
	else:
		velocity.x = move_toward(velocity.x, 0.0, speed * 5.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, speed * 5.0 * delta)
	move_and_slide()
