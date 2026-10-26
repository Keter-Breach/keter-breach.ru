extends CharacterBody3D

@export var walk_speed: float = 4.2
@export var mouse_sensitivity: float = 0.0018
@export var gravity: float = 18.0
var look_pitch: float = 0.0
var can_look: bool = true
var camera: Camera3D

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	camera = Camera3D.new()
	camera.name = "PlayerCamera"
	camera.position = Vector3(0, 1.62, 0)
	camera.current = true
	add_child(camera)
	_add_action("move_forward", KEY_W)
	_add_action("move_back", KEY_S)
	_add_action("move_left", KEY_A)
	_add_action("move_right", KEY_D)
	_add_action("sprint", KEY_SHIFT)
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
	elif event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	elif event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * mouse_sensitivity)
		look_pitch = clampf(look_pitch - event.relative.y * mouse_sensitivity, deg_to_rad(-82), deg_to_rad(82))
		camera.rotation.x = look_pitch

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta
	else:
		velocity.y = 0.0
	var input_dir := Vector2.ZERO
	input_dir.y = float(Input.is_action_pressed("move_back")) - float(Input.is_action_pressed("move_forward"))
	input_dir.x = float(Input.is_action_pressed("move_right")) - float(Input.is_action_pressed("move_left"))
	input_dir = input_dir.normalized()
	var speed := walk_speed * (1.65 if Input.is_action_pressed("sprint") else 1.0)
	var direction := (global_transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
	if direction:
		velocity.x = direction.x * speed
		velocity.z = direction.z * speed
	else:
		velocity.x = move_toward(velocity.x, 0.0, speed * 5.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, speed * 5.0 * delta)
	move_and_slide()
