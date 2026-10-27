extends Node3D
## Геометрия по координатам исходного Three.js build10ZonesMap().

var wall_mat: StandardMaterial3D
var floor_mat: StandardMaterial3D
var metal_mat: StandardMaterial3D
var door_mat: StandardMaterial3D
var red_mat: StandardMaterial3D
var unstable_lights: Array[OmniLight3D] = []
var flicker_clock: float = 0.2
var flicker_active_until: float = 0.0
var flicker_target: OmniLight3D
var flicker_target_energy: float = 0.0

func _process(delta: float) -> void:
	flicker_clock -= delta
	if flicker_target != null:
		flicker_active_until -= delta
		if flicker_active_until <= 0.0:
			if is_instance_valid(flicker_target):
				flicker_target.light_energy = flicker_target_energy
			flicker_target = null
	if flicker_clock <= 0.0:
		flicker_clock = randf_range(0.18, 0.62)
		if flicker_target == null and not unstable_lights.is_empty() and randf() < 0.24:
			flicker_target = unstable_lights[randi_range(0, unstable_lights.size() - 1)]
			flicker_target_energy = flicker_target.light_energy
			flicker_target.light_energy = 0.025
			flicker_active_until = randf_range(0.045, 0.14)

func _ready() -> void:
 wall_mat = _mat(Color(0.76,0.78,0.77),0.08,0.92)
 floor_mat = _mat(Color(0.68,0.70,0.71),0.18,0.78)
 metal_mat = _mat(Color(0.73,0.76,0.77),0.58,0.52)
 door_mat = _mat(Color(0.78,0.79,0.76),0.28,0.62)
 red_mat = _mat(Color(0.55,0.025,0.02),0.18,0.45)
 var concrete_texture := load("res://assets/textures/keter-concrete.svg") as Texture2D
 var floor_texture := load("res://assets/textures/keter-industrial-floor.svg") as Texture2D
 var metal_texture := load("res://assets/textures/keter-painted-metal.svg") as Texture2D
 if concrete_texture: wall_mat.albedo_texture = concrete_texture
 if floor_texture: floor_mat.albedo_texture = floor_texture
 if metal_texture: metal_mat.albedo_texture = metal_texture
 if metal_texture: door_mat.albedo_texture = metal_texture
 var concrete_normal := load("res://assets/textures/keter-concrete-normal.svg") as Texture2D
 var metal_normal := load("res://assets/textures/keter-metal-normal.svg") as Texture2D
 if concrete_normal:
  wall_mat.normal_enabled = true
  wall_mat.normal_texture = concrete_normal
  wall_mat.normal_scale = 0.32
 if metal_normal:
  metal_mat.normal_enabled = true
  metal_mat.normal_texture = metal_normal
  metal_mat.normal_scale = 0.26
  door_mat.normal_enabled = true
  door_mat.normal_texture = metal_normal
  door_mat.normal_scale = 0.34
 # Scale the tiling so large architectural surfaces retain visible material detail.
 wall_mat.uv1_scale = Vector3(5.0, 3.0, 1.0)
 floor_mat.uv1_scale = Vector3(10.0, 10.0, 1.0)
 metal_mat.uv1_scale = Vector3(3.5, 3.5, 1.0)
 door_mat.uv1_scale = Vector3(1.6, 2.0, 1.0)
 wall_mat.roughness = 0.92
 floor_mat.roughness = 0.78
 metal_mat.roughness = 0.52
 door_mat.roughness = 0.62
 _box("Facility floor",Vector3(180,0.3,240),Vector3(0,-0.18,30),floor_mat)
 _box("Facility ceiling",Vector3(180,0.28,240),Vector3(0,3.34,30),metal_mat)
 _build_elevator()
 _build_walls()
 _build_restricted_observation_room()
 _build_props()
 _build_detail_pass()
 _build_room_dressing()
 _build_door_details()
 _build_ambient_audio()
 _build_lights()
 _build_labels()

func _mat(c: Color, metallic: float=0.0, roughness: float=0.82) -> StandardMaterial3D:
 var m:=StandardMaterial3D.new()
 m.albedo_color=c
 m.metallic=metallic
 m.roughness=roughness
 return m

func _box(n: String,s: Vector3,p: Vector3,m: Material,solid: bool=true) -> Node3D:
 var node: Node3D
 if solid:
  node=StaticBody3D.new()
  var cs:=CollisionShape3D.new()
  var shape:=BoxShape3D.new()
  shape.size=s
  cs.shape=shape
  node.add_child(cs)
 else:
  node=MeshInstance3D.new()
 node.name=n
 node.position=p
 var mesh:=BoxMesh.new()
 mesh.size=s
 if node is StaticBody3D:
  var visual:=MeshInstance3D.new()
  visual.mesh=mesh
  visual.material_override=m
  node.add_child(visual)
 else:
  var visual:=node as MeshInstance3D
  visual.mesh=mesh
  visual.material_override=m
 add_child(node)
 return node

func _wall_line(axis: String,c: float,a1: float,a2: float,gaps: Array=[]) -> void:
 var gs:=gaps.duplicate()
 gs.sort_custom(func(a,b): return float(a[0])<float(b[0]))
 var cur:=a1
 for g in gs:
  var a: float=g[0]
  var b: float=g[1]
  if a>cur: _wall_segment(axis,c,cur,a)
  if axis=="z":
   _box("Door lintel",Vector3(b-a,0.65,0.48),Vector3((a+b)*0.5,2.88,c),wall_mat)
  else:
   _box("Door lintel",Vector3(0.48,0.65,b-a),Vector3(c,2.88,(a+b)*0.5),wall_mat)
  cur=b
 if cur<a2: _wall_segment(axis,c,cur,a2)

func _wall_segment(axis: String,c: float,a: float,b: float) -> void:
 if axis=="z":
  _box("Concrete wall",Vector3(b-a,3.2,0.5),Vector3((a+b)*0.5,1.6,c),wall_mat)
 else:
  _box("Concrete wall",Vector3(0.5,3.2,b-a),Vector3(c,1.6,(a+b)*0.5),wall_mat)

func _build_elevator() -> void:
 _box("Lift left wall",Vector3(0.18,3,4.5),Vector3(-2,1.5,-7.65),metal_mat)
 _box("Lift right wall",Vector3(0.18,3,4.5),Vector3(2,1.5,-7.65),metal_mat)
 _box("Lift rear wall",Vector3(4,3,0.18),Vector3(0,1.5,-9.85),metal_mat)
 _box("Lift ceiling",Vector3(4,0.12,4.5),Vector3(0,3.08,-7.65),metal_mat)
 _box("Lift door left",Vector3(0.88,2.65,0.12),Vector3(-1.48,1.32,-5.42),door_mat)
 _box("Lift door right",Vector3(0.88,2.65,0.12),Vector3(1.48,1.32,-5.42),door_mat)
 for x in [-1.25,-0.62,0.0,0.62,1.25]:
  _box("Lift panel seam",Vector3(0.018,2.65,0.012),Vector3(x,1.45,-9.74),metal_mat,false)
 _box("Lift call panel",Vector3(0.28,0.56,0.06),Vector3(1.87,1.38,-7.45),metal_mat,false)
 _box("Lift red indicator",Vector3(0.12,0.08,0.025),Vector3(1.83,1.55,-7.4),red_mat,false)

func _build_walls() -> void:
 _wall_line("z",-10,-4,4)
 _wall_line("x",-4,-10,2,[[-5,-1]])
 _wall_line("x",4,-10,2)
 _wall_line("z",-9,-14,-4)
 _wall_line("z",1,-14,-4)
 _wall_line("x",-14,-9,1)
 _wall_line("z",2,-5,5,[[-1.5,1.5]])
 _wall_line("x",-5,2,24,[[8,12]])
 _wall_line("x",5,2,24,[[8,12]])
 _wall_line("z",24,-5,5,[[-1,1]])
 _wall_line("z",4,-15,-5)
 _wall_line("z",16,-15,-5)
 _wall_line("x",-15,4,16)
 _wall_line("z",4,5,15)
 _wall_line("z",16,5,15)
 _wall_line("x",15,4,16)
 _wall_line("x",-5,24,44,[[25,28],[31,34],[38,41]])
 _wall_line("x",5,24,44,[[31,35]])
 _wall_line("z",27,5,15)
 _wall_line("z",39,5,15)
 # Shared boundary of the lab wing and medical block is defined by the medical-room wall below.
 _wall_line("z",44,-16,16,[[-1.5,1.5]])
 _wall_line("x",-16,44,75,[[55,63]])
 _wall_line("x",16,44,60,[[55,60]])
 _wall_line("z",60,-16,16,[[-1,1]])
 _wall_line("x",-4,60,80,[[66,70]])
 _wall_line("x",4,60,80)
 _wall_line("z",63,-14,-4)
 _wall_line("z",77,-14,-4)
 _wall_line("x",-14,63,77)
 _wall_line("z",80,-4,4,[[-1,1]])
 # Боковое крыло: архив, мастерская, изолятор.
 _wall_line("x",-17,24,44)
 _wall_line("z",24,-17,-5)
 _wall_line("z",44,-17,-5)
 _wall_line("z",30,-17,-5,[[-8,-6]])
 _wall_line("z",36,-17,-5,[[-8,-6]])
 # Дополнительные комнаты: повторяем открытый фасад и глухую заднюю стену исходной room().
 # Архив-09: центр (-25,18), 24x24; вход со стороны меньшего Z.
 _wall_line("x",-37,6,30)
 _wall_line("x",-13,6,30,[[24,29]])
 _wall_line("z",30,-37,-13)
 # Медблок: центр (25,38), 24x26.
 _wall_line("x",15,25,51,[[30,36]])
 _wall_line("x",37,25,51)
 _wall_line("z",51,15,37)
 # Технический уровень/реактор: центр (-25,62), 24x26.
 _wall_line("x",-37,49,75)
 # Reactor access is handled by the shared X=-16 wall above.
 _wall_line("z",75,-37,-16)
 # Галерея наблюдения: центр (25,70), 24x24.
 _wall_line("x",13,58,82,[[58,63]])
 _wall_line("x",37,58,82)
 _wall_line("z",82,13,37)
 # Комната персонала: центр (-25,88), 20x18.
 _wall_line("x",-35,79,97)
 _wall_line("x",-15,79,97,[[86,92]])
 _wall_line("z",97,-35,-15)
 # Узел связи: центр (0,94), 30x22.
 _wall_line("x",-15,83,105)
 _wall_line("x",15,83,105)
 _wall_line("z",105,-15,15,[[-4,4]])
 # За эвакуационным шлюзом начинается визуально повторённый коридор Протокола «Зеркало».
 _wall_line("x",-4,105,130)
 _wall_line("x",4,105,130)

func _build_restricted_observation_room() -> void:
 # Internal observation booth inside the east gallery; it does not intrude into the main corridor.
 _wall_line("z",65,16,26)
 _wall_line("z",75,16,26)
 _wall_line("x",16,65,75,[[68,72]])
 _wall_line("x",26,65,75)
 var dark_panel := _mat(Color(0.045, 0.06, 0.065), 0.55, 0.42)
 var monitor_mat := _mat(Color(0.018, 0.16, 0.14), 0.12, 0.28)
 monitor_mat.emission_enabled = true
 monitor_mat.emission = Color(0.015, 0.28, 0.22)
 monitor_mat.emission_energy_multiplier = 0.7
 _box("Observation control desk", Vector3(2.8, 0.82, 0.82), Vector3(21.0, 0.41, 72.4), dark_panel)
 _box("Observation console screen", Vector3(1.45, 0.62, 0.06), Vector3(21.0, 1.18, 71.95), monitor_mat, false)
 _box("Observation file cabinet", Vector3(0.72, 1.65, 0.62), Vector3(18.0, 0.825, 67.5), metal_mat)
 _box("Observation window frame", Vector3(0.08, 1.1, 2.0), Vector3(25.72, 1.75, 70.0), metal_mat, false)
 var glass_mat := _mat(Color(0.025, 0.095, 0.11, 0.78), 0.35, 0.18)
 _box("Observation reinforced glass", Vector3(0.035, 0.88, 1.72), Vector3(25.66, 1.75, 70.0), glass_mat, false)
 _box("Observation warning beacon", Vector3(0.18, 0.12, 0.18), Vector3(21.0, 1.0, 72.0), red_mat, false)
 var room_label := Label3D.new()
 room_label.name = "Observation room sign"
 room_label.text = "OBSERVATION / 03"
 room_label.font_size = 28
 room_label.pixel_size = 0.008
 room_label.modulate = Color(0.88, 0.12, 0.08)
 room_label.position = Vector3(25.68, 2.55, 70.0)
 room_label.rotation.y = -PI / 2.0
 add_child(room_label)
 _add_light(Vector3(19.2, 2.65, 70.5), Color(0.72, 0.045, 0.025), 0.72, 7.0)

func _cylinder(n: String,radius: float,height: float,p: Vector3,m: Material,solid: bool=true) -> Node3D:
 var node: Node3D
 var mesh:=CylinderMesh.new()
 mesh.top_radius=radius
 mesh.bottom_radius=radius
 mesh.height=height
 if solid:
  node=StaticBody3D.new()
  var cs:=CollisionShape3D.new()
  var shape:=CylinderShape3D.new()
  shape.radius=radius
  shape.height=height
  cs.shape=shape
  node.add_child(cs)
  var visual:=MeshInstance3D.new()
  visual.mesh=mesh
  visual.material_override=m
  node.add_child(visual)
 else:
  node=MeshInstance3D.new()
  var visual:=node as MeshInstance3D
  visual.mesh=mesh
  visual.material_override=m
 node.name=n
 node.position=p
 add_child(node)
 return node

func _table(p: Vector3) -> void:
 _box("Table top",Vector3(2.4,0.1,1.2),p+Vector3(0,0.75,0),metal_mat)
 for dx in [-1.1,1.1]:
  for dz in [-0.5,0.5]:
   _box("Table leg",Vector3(0.1,0.75,0.1),p+Vector3(dx,0.375,dz),metal_mat)

func _build_props() -> void:
 _table(Vector3(-10,0,12))
 for i in range(6): _box("Administration locker",Vector3(0.5,1.8,0.9),Vector3(-14.4,0.9,5.5+i*1.5),metal_mat)
 _box("L1 card visual",Vector3(0.35,0.035,0.22),Vector3(-10,0.82,12),_mat(Color(0,0.35,0.8)),false)
 _add_interaction("card_l1",Vector3(-10,0.9,12),Vector3(1.6,1.2,1.6),"Ключ-карта L1")
 for z in [30.5,36.5,42.5]: _box("Medical bed",Vector3(0.9,0.5,2),Vector3(24.5,0.35,z),_mat(Color(0.24,0.26,0.25)))
 _box("Medical supply crate",Vector3(1,1,1),Vector3(7,0.5,14.5),metal_mat)
 _box("Battery visual",Vector3(0.22,0.28,0.16),Vector3(7,1.15,14.5),_mat(Color(0.1,0.55,0.3)),false)
 _add_interaction("battery_pack",Vector3(7,1.1,14.5),Vector3(1.5,1.5,1.5),"Запасная батарея")
 for side in [-1.0,1.0]:
  for z in [28.0,31.0,34.0,37.0]:
   _box("Server rack",Vector3(1.2,2.4,0.8),Vector3(side*4.1,1.2,z),metal_mat)
   _box("Server LED",Vector3(0.05,0.05,0.05),Vector3(side*3.48,1.8,z),red_mat,false)
 _table(Vector3(2,0,40))
 _box("L2 card visual",Vector3(0.35,0.035,0.22),Vector3(2,0.82,40),_mat(Color(0.48,0.05,0.7)),false)
 _add_interaction("card_l2",Vector3(2,0.9,40),Vector3(1.6,1.2,1.6),"Ключ-карта L2")
 for i in range(5): _box("Archive shelf",Vector3(0.55,2.35,0.82),Vector3(-15.4,1.18,24.8+i),metal_mat)
 _table(Vector3(-22.0,0,27.8))
 _box("Archive terminal",Vector3(0.42,0.06,0.3),Vector3(-22.0,0.84,27.8),red_mat,false)
 _add_interaction("archive_log",Vector3(-22.0,1.1,27.8),Vector3(1.8,1.8,1.8),"Журнал архива")
 _box("Incident memo paper", Vector3(0.38, 0.018, 0.27), Vector3(-21.35, 0.83, 28.25), _mat(Color(0.66, 0.61, 0.48), 0.0, 0.96), false)
 _box("Incident memo red stamp", Vector3(0.12, 0.008, 0.07), Vector3(-21.35, 0.843, 28.25), red_mat, false)
 _add_interaction("incident_memo", Vector3(-21.35, 0.95, 28.25), Vector3(0.9, 0.8, 0.8), "Служебная записка")
 _box("Emergency generator",Vector3(1.25,1.55,1),Vector3(-25.0,0.78,62.8),metal_mat)
 _add_interaction("reactor",Vector3(-25.0,1.1,62.8),Vector3(2.2,2.2,2.2),"Аварийный генератор")
 _box("Sparking panel",Vector3(0.08,0.08,0.08),Vector3(-24.25,1.2,62.55),red_mat,false)
 for x in [-23.4,-22.9,-22.4]: _box("Reactor coolant pipe",Vector3(0.07,0.07,3),Vector3(x,2.85,63),metal_mat,false)
 _box("Isolation bed",Vector3(1,0.42,2.2),Vector3(-14.1,0.28,38.2),_mat(Color(0.22,0.23,0.22)))
 _box("Isolation side table",Vector3(0.8,0.75,0.7),Vector3(-9.3,0.375,41.1),metal_mat)
 _box("Security crate",Vector3(1,1,1),Vector3(-9,0.5,69),metal_mat)
 _box("Evacuation cabinet",Vector3(0.8,1.6,0.35),Vector3(2.8,0.8,72),metal_mat)
 _box("Personnel locker",Vector3(0.55,1.9,0.65),Vector3(-31,0.95,84),metal_mat)
 _box("Personnel table",Vector3(1.2,0.12,0.65),Vector3(-25,0.8,86),metal_mat)
 _box("Observation console",Vector3(2,1.1,0.65),Vector3(25,0.55,70),metal_mat)
 _box("Channel 7 terminal",Vector3(1.8,1.25,0.16),Vector3(0,1.35,88.8),metal_mat)
 _box("Channel 7 screen",Vector3(1.52,0.9,0.035),Vector3(0,1.37,88.69),_mat(Color(0.04,0.07,0.16)),false)
 _add_interaction("comms",Vector3(0,1.4,87.8),Vector3(2.4,2.2,2.2),"Терминал связи: канал 7")
 _box("Channel 7 recovered tape", Vector3(0.28, 0.055, 0.18), Vector3(1.35, 0.84, 88.2), _mat(Color(0.055, 0.065, 0.07), 0.2, 0.72), false)
 _box("Channel 7 tape label", Vector3(0.16, 0.012, 0.09), Vector3(1.35, 0.874, 88.2), _mat(Color(0.66, 0.61, 0.48), 0.0, 0.96), false)
 _add_interaction("camera_tape", Vector3(1.35, 0.98, 88.2), Vector3(0.9, 0.8, 0.8), "Кассета наблюдения №6")
 _box("L1 security door",Vector3(2,2.8,0.2),Vector3(0,1.4,24),door_mat)
 _door_frame(24.0, "L1")
 _add_interaction("door_l1",Vector3(0,1.4,22.8),Vector3(3,2.6,2.2),"Шлюз L1")
 _box("L2 security door",Vector3(2,2.8,0.2),Vector3(0,1.4,60),door_mat)
 _door_frame(60.0, "L2")
 _add_interaction("door_l2",Vector3(0,1.4,58.8),Vector3(3,2.6,2.2),"Шлюз L2")
 _box("Surface exit door",Vector3(2,2.8,0.2),Vector3(0,1.4,80),door_mat)
 _door_frame(80.0, "EXIT")
 _add_interaction("exit_door",Vector3(0,1.4,78.8),Vector3(3,2.6,2.2),"Эвакуационный шлюз")

 # Repeating red floor marks make the Mirror corridor feel like a corrupted copy.
 for z in [84.0,88.0,92.0,96.0]:
  _box("Mirror floor warning stripe",Vector3(2.2,0.015,0.08),Vector3(0,0.015,z+24.0),red_mat,false)
  _box("Mirror wall marker",Vector3(0.06,0.22,0.5),Vector3(-3.68,2.45,z+24.0),red_mat,false)
  _box("Mirror wall marker",Vector3(0.06,0.22,0.5),Vector3(3.68,2.45,z+24.0),red_mat,false)
 # D-class bunks and a spare battery from the original coordinates.
 for z in [-7.0, -4.0, -1.0]:
  _box("D-class bunk", Vector3(0.9,1.6,2.0), Vector3(-13,0.8,z), metal_mat)
  _box("Bunk mattress", Vector3(0.8,0.12,1.8), Vector3(-13,1.66,z), _mat(Color(0.28,0.19,0.13)), false)
 _table(Vector3(-8,0,-7))
 _box("D-class spare battery", Vector3(0.22,0.28,0.16), Vector3(-6,0.3,-2), _mat(Color(0.1,0.55,0.3)), false)
 _add_interaction("battery_pack_start", Vector3(-6,0.72,-2), Vector3(1.4,1.4,1.4), "Запасная батарея")
 # Laboratory benches and sample tanks.
 for z in [30.0,36.0]:
  _box("Lab workbench", Vector3(3,0.9,1), Vector3(8.5,0.45,z), metal_mat)
 for z in [29.0,33.0,37.0]:
  _cylinder("Sample tank",0.65,2.5,Vector3(13.8,1.25,z),_mat(Color(0.18,0.25,0.23),0.45,0.3))
  _cylinder("Sample fluid",0.5,2.2,Vector3(13.8,1.25,z),_mat(Color(0.07,0.24,0.16),0.2,0.25),false)
  _box("Anomalous sample",Vector3(0.36,0.36,0.36),Vector3(13.8,1.2,z),red_mat,false)
  if z == 33.0:
   _box("KETER-19 sample label", Vector3(0.42, 0.22, 0.025), Vector3(13.8, 1.35, z - 0.72), _mat(Color(0.72, 0.64, 0.43), 0.0, 0.9), false)
   _add_interaction("sample_label", Vector3(13.8, 1.3, z - 1.0), Vector3(0.9, 0.9, 0.9), "Маркировка образца KETER-19")
 # Security post, containment partitions and status lights.
 for i in range(6):
  _box("Security locker",Vector3(0.6,2,0.9),Vector3(-13.5,1,64+i*1.1),metal_mat)
 _table(Vector3(-9,0,75))
 _box("Camera monitor",Vector3(0.45,0.28,0.04),Vector3(-9,1.3,74.55),_mat(Color(0.02,0.12,0.09)),false)
 _box("Camera monitor red",Vector3(0.45,0.28,0.04),Vector3(-8.2,1.3,74.55),red_mat,false)
 for p in [Vector3(-5,1.6,48),Vector3(5,1.6,48),Vector3(-5,1.6,56),Vector3(5,1.6,56)]:
  _box("Containment column",Vector3(1,3.2,1),p,wall_mat)
 for side in [-1.0,1.0]:
  for z in [46.5,51.5,57.0]:
   _box("Containment partition",Vector3(0.1,2.8,4.2),Vector3(side*11,1.4,z),_mat(Color(0.18,0.22,0.22),0.35,0.24))
  _box("Sealed anomaly container",Vector3(1.2,2.2,1.2),Vector3(side*14.2,1.1,56.0 if side<0 else 51.5),_mat(Color(0.045,0.05,0.055),0.35,0.48))
  _box("Containment status light",Vector3(0.06,0.06,0.06),Vector3(side*13.58,1.7,56.0 if side<0 else 51.5),red_mat,false)
 for p in [Vector3(-1.75,0.018,18.6),Vector3(1.65,0.018,47.2),Vector3(-2.15,0.018,56.8),Vector3(1.8,0.018,66.1)]:
  _box("Dried blood trace",Vector3(1.5,0.012,0.85),p,_mat(Color(0.12,0.012,0.016),0.0,0.98),false)

func _build_room_dressing() -> void:
 # Small non-colliding props give each sector a distinct history without blocking navigation.
 var paper_mat := _mat(Color(0.62, 0.59, 0.48), 0.0, 0.96)
 var dark_mat := _mat(Color(0.055, 0.065, 0.07), 0.2, 0.72)
 var glass_mat := _mat(Color(0.18, 0.36, 0.38, 0.72), 0.22, 0.2)
 var screen_mat := _mat(Color(0.035, 0.20, 0.18), 0.15, 0.28)
 var lamp_mat := _mat(Color(0.72, 0.84, 0.88), 0.08, 0.22)
 lamp_mat.emission_enabled = true
 lamp_mat.emission = Color(0.35, 0.62, 0.78)
 lamp_mat.emission_energy_multiplier = 0.8
 var amber_mat := _mat(Color(0.95, 0.42, 0.045), 0.08, 0.4)
 # Administration: paperwork, desk terminal and a wall ventilation grille.
 for i in range(4):
  _box("Scattered administration document", Vector3(0.34, 0.012, 0.24), Vector3(-10.15 + i * 0.13, 0.812 + i * 0.003, 12.05 + (i % 2) * 0.12), paper_mat, false)
 _box("Administration terminal base", Vector3(0.62, 0.12, 0.36), Vector3(-10.0, 0.91, 11.72), dark_mat, false)
 _box("Administration terminal screen", Vector3(0.54, 0.34, 0.045), Vector3(-10.0, 1.13, 11.89), _mat(Color(0.04, 0.23, 0.22)), false)
 _box("Administration vent frame", Vector3(0.08, 0.62, 0.9), Vector3(-4.71, 2.25, 12.0), metal_mat, false)
 for i in range(7):
  _box("Administration vent slat", Vector3(0.025, 0.035, 0.78), Vector3(-4.65, 2.03 + i * 0.07, 12.0), dark_mat, false)
 # Medical block: privacy screens, bedside equipment and supply cabinets.
 for z in [30.5, 36.5, 42.5]:
  _box("Medical bed head panel", Vector3(0.95, 0.28, 0.12), Vector3(24.5, 0.73, z - 0.82), metal_mat, false)
  _box("Medical bed pillow", Vector3(0.62, 0.09, 0.34), Vector3(24.5, 0.63, z - 0.67), paper_mat, false)
  _box("Medical privacy screen post", Vector3(0.045, 1.65, 0.045), Vector3(22.8, 0.83, z), metal_mat, false)
  _box("Medical privacy screen", Vector3(0.035, 1.2, 1.5), Vector3(22.8, 1.45, z + 0.65), glass_mat, false)
 _box("Medical supply cabinet", Vector3(0.65, 1.65, 0.5), Vector3(31.0, 0.825, 29.5), metal_mat, false)
 _box("Medical cabinet glass", Vector3(0.025, 0.95, 0.34), Vector3(30.66, 1.08, 29.5), glass_mat, false)
 _cylinder("Medical IV stand", 0.035, 1.85, Vector3(29.0, 0.93, 43.5), metal_mat, false)
 _cylinder("Medical IV hook", 0.025, 0.28, Vector3(29.0, 1.77, 43.5), metal_mat, false)
 _box("Medical monitor", Vector3(0.42, 0.3, 0.08), Vector3(24.5, 1.08, 29.4), dark_mat, false)
 _box("Medical monitor screen", Vector3(0.34, 0.21, 0.025), Vector3(24.5, 1.1, 29.345), screen_mat, false)
 # Archive: numbered file boxes and a fallen stack of reports.
 for i in range(4):
  _box("Archive labeled storage box", Vector3(0.38, 0.28, 0.42), Vector3(-25.1, 0.14 + i * 0.29, 27.2 + (i % 2) * 0.48), paper_mat, false)
  _box("Archive box label", Vector3(0.018, 0.09, 0.18), Vector3(-24.9, 0.16 + i * 0.29, 27.2 + (i % 2) * 0.48), amber_mat, false)
 for i in range(3):
  _box("Archive fallen report", Vector3(0.42, 0.018, 0.29), Vector3(-21.65 + i * 0.08, 0.82 + i * 0.02, 28.1 + i * 0.08), paper_mat, false)
 # Workshop: tool chest, hazard beacon and cable drums.
 _box("Workshop tool chest", Vector3(0.82, 0.72, 0.52), Vector3(-12.8, 0.36, 35.0), dark_mat, false)
 for i in range(4):
  _box("Workshop drawer handle", Vector3(0.025, 0.045, 0.28), Vector3(-12.37, 0.18 + i * 0.15, 35.0), metal_mat, false)
 _cylinder("Workshop cable drum", 0.34, 0.42, Vector3(-8.2, 0.21, 35.8), metal_mat, false)
 _cylinder("Workshop cable drum core", 0.09, 0.44, Vector3(-8.2, 0.21, 35.8), dark_mat, false)
 _box("Workshop hazard beacon base", Vector3(0.2, 0.08, 0.2), Vector3(-14.1, 1.62, 33.2), dark_mat, false)
 _box("Workshop hazard beacon", Vector3(0.12, 0.12, 0.12), Vector3(-14.1, 1.72, 33.2), amber_mat, false)
 # Containment wing: warning placards, observation glass and isolated equipment.
 for z in [48.0, 55.0]:
  _box("Containment warning placard", Vector3(0.045, 0.42, 0.78), Vector3(-11.2, 2.25, z), amber_mat, false)
  _box("Containment placard text strip", Vector3(0.02, 0.045, 0.48), Vector3(-11.16, 2.32, z), dark_mat, false)
 for p in [Vector3(-5.0, 1.65, 49.5), Vector3(5.0, 1.65, 55.0)]:
  _box("Containment observation window frame", Vector3(0.08, 1.1, 1.8), p, metal_mat, false)
  _box("Containment observation glass", Vector3(0.035, 0.88, 1.55), p + Vector3(0.05, 0, 0), glass_mat, false)
 # Security sector: control desk, blinking-panel style indicators and floor cable channel.
 _box("Security control desk", Vector3(2.2, 0.72, 0.8), Vector3(-9.0, 0.36, 75.5), dark_mat, false)
 for i in range(5):
  _box("Security console button", Vector3(0.12, 0.035, 0.12), Vector3(-9.72 + i * 0.34, 0.75, 75.25), amber_mat if i == 2 else screen_mat, false)
 _box("Security wall display", Vector3(0.06, 0.78, 1.25), Vector3(-10.5, 2.1, 70.0), dark_mat, false)
 _box("Security display image", Vector3(0.025, 0.62, 1.05), Vector3(-10.46, 2.1, 70.0), screen_mat, false)
 # Personnel area: chair, locker labels and a damaged ceiling panel.
 _box("Personnel chair seat", Vector3(0.48, 0.12, 0.48), Vector3(-23.7, 0.52, 86.7), dark_mat, false)
 _box("Personnel chair back", Vector3(0.48, 0.55, 0.1), Vector3(-23.7, 0.82, 86.92), dark_mat, false)
 _box("Personnel desk papers", Vector3(0.42, 0.014, 0.3), Vector3(-25.1, 0.87, 85.9), paper_mat, false)
 _box("Personnel locker label", Vector3(0.025, 0.16, 0.22), Vector3(-30.69, 1.38, 84.0), amber_mat, false)
 # Channel 7: cable bundles, equipment status lights and a damaged relay box.
 for i in range(3):
  _box("Comms cable bundle", Vector3(0.055, 0.055, 2.8), Vector3(-1.3 + i * 0.18, 2.8, 91.0), dark_mat, false)
 for i in range(4):
  _box("Comms status indicator", Vector3(0.08, 0.055, 0.055), Vector3(-0.48 + i * 0.32, 1.75, 88.58), amber_mat if i == 3 else screen_mat, false)
 _box("Comms damaged relay", Vector3(0.48, 0.62, 0.36), Vector3(3.1, 0.31, 92.5), dark_mat, false)
 _box("Comms relay warning label", Vector3(0.025, 0.14, 0.22), Vector3(2.85, 0.42, 92.5), amber_mat, false)
 # Mirror Protocol: repeated ceiling panels and an off-centre warning sign imply the copy is imperfect.
 for z in [111.0, 117.0, 123.0]:
  _box("Mirror corridor ceiling panel", Vector3(1.05, 0.035, 0.42), Vector3(0.45, 3.17, z), lamp_mat, false)
 _box("Mirror protocol warning plate", Vector3(0.05, 0.42, 0.92), Vector3(-3.7, 2.3, 119.0), red_mat, false)

func _build_detail_pass() -> void:
 var pipe_mat := _mat(Color(0.28, 0.33, 0.34), 0.68, 0.42)
 var panel_mat := _mat(Color(0.12, 0.16, 0.18), 0.52, 0.38)
 var screen_mat := _mat(Color(0.035, 0.20, 0.18), 0.15, 0.28)
 var hazard_mat := _mat(Color(0.92, 0.48, 0.035), 0.12, 0.58)
 var lamp_mat := _mat(Color(0.72, 0.84, 0.88), 0.08, 0.22)
 lamp_mat.emission_enabled = true
 lamp_mat.emission = Color(0.35, 0.62, 0.78)
 lamp_mat.emission_energy_multiplier = 0.8
 for z in range(-2, 106, 6):
  _box("Ceiling light diffuser", Vector3(1.25, 0.035, 0.48), Vector3(0, 3.17, z), lamp_mat, false)
  _box("Ceiling service tray", Vector3(0.16, 0.12, 5.4), Vector3(2.35, 3.03, z + 2.6), pipe_mat, false)
  _box("Left service conduit", Vector3(0.09, 0.09, 5.4), Vector3(-2.67, 2.82, z + 2.6), pipe_mat, false)
  _box("Right service conduit", Vector3(0.09, 0.09, 5.4), Vector3(2.67, 2.82, z + 2.6), pipe_mat, false)
  _box("Left wall skirting", Vector3(0.07, 0.14, 5.4), Vector3(-2.72, 0.14, z + 2.6), panel_mat, false)
  _box("Right wall skirting", Vector3(0.07, 0.14, 5.4), Vector3(2.72, 0.14, z + 2.6), panel_mat, false)
  _box("Floor expansion joint", Vector3(5.7, 0.008, 0.025), Vector3(0, 0.012, z + 5.2), panel_mat, false)
  if z >= 4:
   _box("Yellow floor safety dash", Vector3(0.12, 0.018, 1.0), Vector3(-2.42, 0.018, z), hazard_mat, false)
   _box("Yellow floor safety dash", Vector3(0.12, 0.018, 1.0), Vector3(2.42, 0.018, z), hazard_mat, false)
 for p in [Vector3(-2.68, 1.65, 10), Vector3(2.68, 1.65, 14), Vector3(-2.68, 1.65, 45), Vector3(2.68, 1.65, 67), Vector3(-2.68, 1.65, 91)]:
  _box("Wall electrical cabinet", Vector3(0.16, 0.82, 0.62), p, panel_mat, false)
  _box("Cabinet status display", Vector3(0.035, 0.16, 0.28), p + Vector3(0.095, 0.16, 0), screen_mat, false)
  _box("Cabinet warning light", Vector3(0.04, 0.055, 0.055), p + Vector3(0.1, -0.2, -0.18), red_mat, false)
 for z in [28.0, 31.0, 34.0, 37.0]:
  for side in [-1.0, 1.0]:
   _box("Server rack ventilation", Vector3(0.78, 0.055, 0.025), Vector3(side * 4.1, 1.45, z - 0.22), pipe_mat, false)
   for row in range(3):
    _box("Server rack activity LED", Vector3(0.055, 0.035, 0.025), Vector3(side * 3.72, 1.78 - row * 0.12, z - 0.42), screen_mat if row != 1 else red_mat, false)
 for z in [29.0, 33.0, 37.0]:
  _cylinder("Sample tank upper collar", 0.69, 0.10, Vector3(13.8, 2.52, z), pipe_mat, false)
  _cylinder("Sample tank lower collar", 0.69, 0.10, Vector3(13.8, 0.08, z), pipe_mat, false)

func _door_frame(z: float, code: String) -> void:
 # Contrasting physical frame makes the shutter readable even in low light.
 var frame_mat := _mat(Color(0.36, 0.39, 0.40), 0.72, 0.38)
 var hazard_mat := _mat(Color(0.95, 0.52, 0.045), 0.12, 0.5)
 for side in [-1.0, 1.0]:
  _box(code + " door guide rail", Vector3(0.16, 3.0, 0.34), Vector3(side * 1.13, 1.48, z + 0.16), frame_mat, false)
  _box(code + " door warning lamp", Vector3(0.08, 0.11, 0.08), Vector3(side * 1.13, 2.88, z + 0.37), red_mat, false)
 _box(code + " door top frame", Vector3(2.42, 0.18, 0.36), Vector3(0, 2.98, z + 0.16), frame_mat, false)
 for i in range(7):
  _box(code + " hazard stripe", Vector3(0.22, 0.055, 0.025), Vector3(-0.66 + i * 0.22, 3.09, z + 0.37), hazard_mat, false)

func _build_lights() -> void:
 _add_light(Vector3(0,2.8,-4),Color(0.9,0.3,0.2),1.15,9)
 _add_light(Vector3(0,2.8,13),Color(0.85,0.035,0.025),1.45,12)
 _add_light(Vector3(-10,2.8,10),Color(0.12,0.35,0.85),0.95,9)
 _add_light(Vector3(10,2.8,10),Color(0.25,0.8,0.55),0.95,9)
 _add_light(Vector3(0,2.8,34),Color(0.08,0.65,0.65),1.2,11)
 _add_light(Vector3(0,2.8,52),Color(0.9,0.035,0.02),1.45,11)
 _add_light(Vector3(0,2.8,70),Color(0.85,0.58,0.28),1.1,10)
 _add_light(Vector3(-11,2.8,27.5),Color(0.9,0.58,0.3),1.05,8)
 _add_light(Vector3(-10.8,2.8,33),Color(0.95,0.3,0.08),1.15,8)
 _add_light(Vector3(-10.5,2.8,40.5),Color(0.9,0.025,0.02),1.1,8)
 _add_light(Vector3(0,2.8,88),Color(0.2,0.3,0.85),1.0,10)
 _add_light(Vector3(0,2.8,112),Color(0.72,0.08,0.06),0.8,9)
 _add_light(Vector3(0,2.8,124),Color(0.12,0.18,0.32),0.75,9)

func _add_light(p: Vector3,c: Color,e: float,r: float) -> void:
 var light:=OmniLight3D.new()
 light.position=p
 light.light_color=c
 light.light_energy=e
 light.omni_range=r
 light.omni_attenuation=1.2
 add_child(light)
 _box("Lamp housing",Vector3(0.72,0.09,0.3),Vector3(p.x,3.08,p.z),metal_mat,false)

func _build_labels() -> void:
 # Надписи стоят на стенах непосредственно у входов; yaw направляет текст в проход.
 _label("D-12 / GATE",Vector3(0,2.65,-3.8),Color(0.9,0.12,0.08))
 _label("ADMINISTRATION",Vector3(-5.28,2.65,10),Color(0.35,0.55,0.9),PI/2.0)
 _label("MEDICAL",Vector3(5.28,2.65,10),Color(0.35,0.8,0.6),-PI/2.0)
 _label("ARCHIVE 04",Vector3(-5.28,2.65,26.5),Color(0.85,0.65,0.4),PI/2.0)
 _label("WORKSHOP",Vector3(-5.28,2.65,32.5),Color(0.9,0.35,0.1),PI/2.0)
 _label("ISOLATION",Vector3(-5.28,2.65,39.5),Color(0.9,0.08,0.05),PI/2.0)
 _label("DATA NODE",Vector3(0,2.65,43.72),Color(0.15,0.85,0.75),PI)
 _label("KETER CONTAINMENT",Vector3(0,2.65,44.28),Color(0.9,0.08,0.05))
 _label("EVACUATION",Vector3(0,2.65,60.28),Color(0.85,0.6,0.3),PI)
 _label("COMMS / CHANNEL 7",Vector3(0,2.65,80.28),Color(0.35,0.5,0.95),PI)
 _label("MIRROR PROTOCOL",Vector3(0,2.7,109),Color(0.9,0.08,0.05),PI)

func _label(t: String,p: Vector3,c: Color,yaw: float=0.0) -> void:
 var l:=Label3D.new()
 l.text=t
 l.position=p
 l.rotation.y=yaw
 l.font_size=34
 l.pixel_size=0.008
 l.modulate=c
 add_child(l)

func _add_interaction(interaction_id: String, p: Vector3, size: Vector3, title: String) -> void:
 var area := Area3D.new()
 area.name = "Interact_" + interaction_id
 area.position = p
 area.collision_layer = 2
 area.collision_mask = 0
 area.monitoring = false
 area.monitorable = true
 area.set_meta("interaction_id", interaction_id)
 area.set_meta("interaction_title", title)
 var shape_node := CollisionShape3D.new()
 var shape := BoxShape3D.new()
 shape.size = size
 shape_node.shape = shape
 area.add_child(shape_node)
 add_child(area)

func _build_surface_detail() -> void:
	# Surface layers add grime, moisture, cable infrastructure and camera silhouettes.
	var grime := _mat(Color(0.075, 0.062, 0.055), 0.0, 0.98)
	var wet := _mat(Color(0.035, 0.055, 0.06, 0.78), 0.22, 0.18)
	var rust := _mat(Color(0.24, 0.075, 0.035), 0.28, 0.82)
	var pale := _mat(Color(0.37, 0.39, 0.37), 0.18, 0.9)
	var cable_mat := _mat(Color(0.025, 0.03, 0.034), 0.22, 0.7)
	for stain in [
		[Vector3(-1.7, 0.012, 8.8), Vector3(1.05, 0.012, 0.68), -0.2],
		[Vector3(1.45, 0.013, 20.2), Vector3(0.7, 0.012, 1.15), 0.34],
		[Vector3(-1.2, 0.013, 47.8), Vector3(1.35, 0.012, 0.5), -0.42],
		[Vector3(1.55, 0.013, 54.5), Vector3(0.8, 0.012, 1.1), 0.18],
		[Vector3(-1.1, 0.013, 89.5), Vector3(1.2, 0.012, 0.58), 0.6],
		[Vector3(0.85, 0.013, 118.5), Vector3(1.15, 0.012, 0.48), -0.28]
	]:
		var stain_mesh := _box("Floor oil and moisture stain", stain[1], stain[0], wet if randf() > 0.45 else grime, false)
		stain_mesh.rotation.y = float(stain[2])
	for p in [Vector3(-2.69, 2.24, 18.0), Vector3(2.69, 1.94, 36.5), Vector3(-2.69, 2.05, 63.5), Vector3(2.69, 2.12, 94.0)]:
		_box("Wall rust streak", Vector3(0.018, 0.62, 0.17), p, rust, false)
		_box("Paint chipped edge", Vector3(0.022, 0.045, 0.42), p + Vector3(0, -0.34, 0.13), pale, false)
	for z in [17.0, 41.0, 62.0, 86.0, 103.0]:
		_cylinder("Overhead cable trunk", 0.075, 5.1, Vector3(-1.85, 2.82, z), cable_mat, false)
		for dz in [-1.8, 0.0, 1.8]:
			_box("Cable trunk clamp", Vector3(0.2, 0.045, 0.08), Vector3(-1.85, 2.82, z + dz), metal_mat, false)
	var lens_mat := _mat(Color(0.025, 0.12, 0.16), 0.65, 0.18)
	lens_mat.emission_enabled = true
	lens_mat.emission = Color(0.01, 0.16, 0.22)
	lens_mat.emission_energy_multiplier = 0.65
	for cam in [Vector3(-2.55, 2.45, 15.5), Vector3(2.55, 2.45, 42.5), Vector3(-2.55, 2.45, 67.0), Vector3(2.55, 2.45, 90.0)]:
		_box("Security camera housing", Vector3(0.38, 0.19, 0.22), cam, metal_mat, false)
		_box("Security camera lens", Vector3(0.07, 0.07, 0.025), cam + Vector3(0.0, -0.015, 0.115), lens_mat, false)

func _build_physics_props() -> void:
	var crate_mat := _mat(Color(0.19, 0.22, 0.22), 0.48, 0.72)
	var can_mat := _mat(Color(0.34, 0.37, 0.37), 0.74, 0.36)
	_add_rigid_crate(Vector3(-12.1, 0.62, 29.0), crate_mat, 0.75)
	_add_rigid_crate(Vector3(-8.4, 0.48, 35.8), crate_mat, 0.55)
	_add_rigid_can(Vector3(-13.7, 0.22, 37.0), can_mat)
	_add_rigid_can(Vector3(2.0, 0.22, 68.0), can_mat)
	_add_rigid_crate(Vector3(-28.8, 0.52, 86.5), crate_mat, 0.6)

func _add_rigid_crate(p: Vector3, mat: Material, scale_factor: float) -> void:
	var body := RigidBody3D.new()
	body.name = "Physics movable supply crate"
	body.position = p
	body.mass = 12.0 * scale_factor
	body.linear_damp = 0.65
	body.angular_damp = 1.8
	body.continuous_cd = true
	var size := Vector3(0.72, 0.72, 0.72) * scale_factor
	var mesh := BoxMesh.new()
	mesh.size = size
	var visual := MeshInstance3D.new()
	visual.mesh = mesh
	visual.material_override = mat
	body.add_child(visual)
	var bevel_edge := _mat(Color(0.085, 0.1, 0.105), 0.62, 0.45)
	for y in [-1.0, 1.0]:
		var band := MeshInstance3D.new()
		var band_mesh := BoxMesh.new()
		band_mesh.size = Vector3(size.x * 1.015, 0.045 * scale_factor, size.z * 1.015)
		band.mesh = band_mesh
		band.material_override = bevel_edge
		band.position.y = y * size.y * 0.34
		body.add_child(band)
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	body.add_child(collision)
	add_child(body)

func _add_rigid_can(p: Vector3, mat: Material) -> void:
	var body := RigidBody3D.new()
	body.name = "Physics rolling metal canister"
	body.position = p
	body.mass = 1.4
	body.linear_damp = 0.18
	body.angular_damp = 0.22
	var mesh := CylinderMesh.new()
	mesh.top_radius = 0.14
	mesh.bottom_radius = 0.14
	mesh.height = 0.38
	var visual := MeshInstance3D.new()
	visual.mesh = mesh
	visual.material_override = mat
	body.add_child(visual)
	var rim_mat := _mat(Color(0.08, 0.09, 0.09), 0.8, 0.25)
	for y in [-0.15, 0.15]:
		var rim := MeshInstance3D.new()
		var rim_mesh := CylinderMesh.new()
		rim_mesh.top_radius = 0.145
		rim_mesh.bottom_radius = 0.145
		rim_mesh.height = 0.025
		rim.mesh = rim_mesh
		rim.material_override = rim_mat
		rim.position.y = y
		body.add_child(rim)
	var collision := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = 0.14
	shape.height = 0.38
	collision.shape = shape
	body.add_child(collision)
	add_child(body)

func _build_door_details() -> void:
	var rib_mat := _mat(Color(0.12, 0.15, 0.16), 0.72, 0.38)
	var stripe_mat := _mat(Color(0.78, 0.38, 0.035), 0.18, 0.58)
	var status_mat := _mat(Color(0.025, 0.26, 0.12), 0.3, 0.3)
	status_mat.emission_enabled = true
	status_mat.emission = Color(0.02, 0.32, 0.1)
	status_mat.emission_energy_multiplier = 0.75
	for door_name in ["L1 security door", "L2 security door", "Surface exit door"]:
		var door := find_child(door_name, true, false) as StaticBody3D
		if door == null:
			continue
		# All details are children of the door body, so they travel with its collision.
		for x in [-0.72, -0.36, 0.36, 0.72]:
			var rib := MeshInstance3D.new()
			var rib_mesh := BoxMesh.new()
			rib_mesh.size = Vector3(0.035, 2.38, 0.035)
			rib.mesh = rib_mesh
			rib.material_override = rib_mat
			rib.position = Vector3(x, 0.0, -0.112)
			door.add_child(rib)
		var top_strip := MeshInstance3D.new()
		var top_mesh := BoxMesh.new()
		top_mesh.size = Vector3(1.88, 0.075, 0.035)
		top_strip.mesh = top_mesh
		top_strip.material_override = stripe_mat
		top_strip.position = Vector3(0, 1.18, -0.115)
		door.add_child(top_strip)
		var center_panel := MeshInstance3D.new()
		var panel_mesh := BoxMesh.new()
		panel_mesh.size = Vector3(0.34, 0.5, 0.035)
		center_panel.mesh = panel_mesh
		center_panel.material_override = rib_mat
		center_panel.position = Vector3(0, 0.0, -0.12)
		door.add_child(center_panel)
		var indicator := MeshInstance3D.new()
		var indicator_mesh := BoxMesh.new()
		indicator_mesh.size = Vector3(0.12, 0.045, 0.035)
		indicator.mesh = indicator_mesh
		indicator.material_override = status_mat
		indicator.position = Vector3(0, 0.82, -0.13)
		door.add_child(indicator)

func _build_ambient_audio() -> void:
	# Procedural low-frequency facility hum. Separate 3D emitters make it spatial, not a flat UI sound.
	for item in [
		[Vector3(0, 2.0, 13.0), 0.78, 0.92],
		[Vector3(-11, 1.8, 33.0), 0.55, 0.78],
		[Vector3(0, 2.0, 52.0), 0.66, 0.72],
		[Vector3(0, 2.0, 89.0), 0.48, 1.08]
	]:
		var emitter := AudioStreamPlayer3D.new()
		emitter.name = "SpatialFacilityHum"
		emitter.position = item[0]
		emitter.unit_size = 8.0
		emitter.max_distance = 38.0
		emitter.volume_db = -13.0
		emitter.pitch_scale = float(item[2])
		var generator := AudioStreamGenerator.new()
		generator.mix_rate = 22050.0
		generator.buffer_length = 0.35
		emitter.stream = generator
		emitter.set_script(load("res://scripts/ambient_hum.gd"))
		add_child(emitter)
		emitter.set("hum_gain", float(item[1]))
