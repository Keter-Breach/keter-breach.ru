extends Node3D
## Геометрия по координатам исходного Three.js build10ZonesMap().

var wall_mat: StandardMaterial3D
var floor_mat: StandardMaterial3D
var metal_mat: StandardMaterial3D
var door_mat: StandardMaterial3D
var red_mat: StandardMaterial3D

func _ready() -> void:
 wall_mat = _mat(Color(0.19,0.20,0.20),0.12,0.92)
 floor_mat = _mat(Color(0.09,0.095,0.10),0.22,0.55)
 metal_mat = _mat(Color(0.075,0.085,0.09),0.72,0.4)
 door_mat = _mat(Color(0.16,0.17,0.17),0.48,0.56)
 red_mat = _mat(Color(0.55,0.025,0.02),0.18,0.45)
 var concrete_texture := load("res://assets/textures/keter-concrete.svg") as Texture2D
 var floor_texture := load("res://assets/textures/keter-industrial-floor.svg") as Texture2D
 var metal_texture := load("res://assets/textures/keter-painted-metal.svg") as Texture2D
 if concrete_texture: wall_mat.albedo_texture = concrete_texture
 if floor_texture: floor_mat.albedo_texture = floor_texture
 if metal_texture: metal_mat.albedo_texture = metal_texture
 if metal_texture: door_mat.albedo_texture = metal_texture
 _box("Facility floor",Vector3(180,0.3,240),Vector3(0,-0.18,30),floor_mat)
 _box("Facility ceiling",Vector3(180,0.28,240),Vector3(0,3.34,30),metal_mat)
 _build_elevator()
 _build_walls()
 _build_props()
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
 _wall_line("x",15,27,39)
 _wall_line("z",44,-16,16,[[-1.5,1.5]])
 _wall_line("x",-16,44,60)
 _wall_line("x",16,44,60)
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
 _wall_line("z",30,-17,-5)
 _wall_line("z",36,-17,-5)
 # Дополнительные комнаты: повторяем открытый фасад и глухую заднюю стену исходной room().
 # Архив-09: центр (-25,18), 24x24; вход со стороны меньшего Z.
 _wall_line("x",-37,6,30)
 _wall_line("x",-13,6,30)
 _wall_line("z",30,-37,-13)
 # Медблок: центр (25,38), 24x26.
 _wall_line("x",13,25,51)
 _wall_line("x",37,25,51)
 _wall_line("z",51,13,37)
 # Технический уровень/реактор: центр (-25,62), 24x26.
 _wall_line("x",-37,49,75)
 _wall_line("x",-13,49,75)
 _wall_line("z",75,-37,-13)
 # Галерея наблюдения: центр (25,70), 24x24.
 _wall_line("x",13,58,82)
 _wall_line("x",37,58,82)
 _wall_line("z",82,13,37)
 # Комната персонала: центр (-25,88), 20x18.
 _wall_line("x",-35,79,97)
 _wall_line("x",-15,79,97)
 _wall_line("z",97,-35,-15)
 # Узел связи: центр (0,94), 30x22.
 _wall_line("x",-15,83,105)
 _wall_line("x",15,83,105)
 _wall_line("z",105,-15,15)
 # За эвакуационным шлюзом начинается визуально повторённый коридор Протокола «Зеркало».
 _wall_line("x",-4,80,105)
 _wall_line("x",4,80,105)

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
 for z in [6.5,9.5,13.0]: _box("Medical bed",Vector3(0.9,0.5,2),Vector3(13.8,0.35,z),_mat(Color(0.24,0.26,0.25)))
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
 _table(Vector3(-10.2,0,27.8))
 _box("Archive terminal",Vector3(0.42,0.06,0.3),Vector3(-10.2,0.84,27.8),red_mat,false)
 _add_interaction("archive_log",Vector3(-10.2,1.1,27.8),Vector3(1.8,1.8,1.8),"Журнал архива")
 _box("Emergency generator",Vector3(1.25,1.55,1),Vector3(-14.8,0.78,32.8),metal_mat)
 _add_interaction("reactor",Vector3(-14.8,1.1,32.8),Vector3(2.2,2.2,2.2),"Аварийный генератор")
 _box("Sparking panel",Vector3(0.08,0.08,0.08),Vector3(-14.05,1.2,32.55),red_mat,false)
 for x in [-13.2,-12.7,-12.2]: _box("Workshop pipe",Vector3(0.07,0.07,3),Vector3(x,2.85,33),metal_mat,false)
 _box("Isolation bed",Vector3(1,0.42,2.2),Vector3(-14.1,0.28,38.2),_mat(Color(0.22,0.23,0.22)))
 _box("Isolation side table",Vector3(0.8,0.75,0.7),Vector3(-9.3,0.375,41.1),metal_mat)
 _box("Security crate",Vector3(1,1,1),Vector3(-9,0.5,69),metal_mat)
 _box("Evacuation cabinet",Vector3(0.8,1.6,0.35),Vector3(2.8,0.8,72),metal_mat)
 _box("Personnel locker",Vector3(0.55,1.9,0.65),Vector3(-31,0.95,84),metal_mat)
 _box("Personnel table",Vector3(1.2,0.12,0.65),Vector3(-25,0.8,86),metal_mat)
 _box("Observation console",Vector3(2,1.1,0.65),Vector3(25,0.55,70),metal_mat)
 _box("Channel 7 terminal",Vector3(1.8,1.25,0.16),Vector3(-2,1.35,74.5),metal_mat)
 _box("Channel 7 screen",Vector3(1.52,0.9,0.035),Vector3(-2,1.37,74.39),_mat(Color(0.04,0.07,0.16)),false)
 _add_interaction("comms",Vector3(-2,1.4,73.2),Vector3(2.4,2.2,2.2),"Терминал связи: канал 7")
 _box("L1 security door",Vector3(2,2.8,0.2),Vector3(0,1.4,24),door_mat)
 _add_interaction("door_l1",Vector3(0,1.4,22.8),Vector3(3,2.6,2.2),"Шлюз L1")
 _box("L2 security door",Vector3(2,2.8,0.2),Vector3(0,1.4,60),door_mat)
 _add_interaction("door_l2",Vector3(0,1.4,58.8),Vector3(3,2.6,2.2),"Шлюз L2")
 _box("Surface exit door",Vector3(2,2.8,0.2),Vector3(0,1.4,80),door_mat)
 _add_interaction("exit_door",Vector3(0,1.4,78.8),Vector3(3,2.6,2.2),"Эвакуационный шлюз")

 # D-class bunks and a spare battery from the original coordinates.
 for z in [-7.0, -4.0, -1.0]:
  _box("D-class bunk", Vector3(0.9,1.6,2.0), Vector3(-13,0.8,z), metal_mat)
  _box("Bunk mattress", Vector3(0.8,0.12,1.8), Vector3(-13,1.66,z), _mat(Color(0.28,0.19,0.13)), false)
 _table(Vector3(-8,0,-7))
 _box("D-class spare battery", Vector3(0.22,0.28,0.16), Vector3(-6,0.3,-2), _mat(Color(0.1,0.55,0.3)), false)
 # Laboratory benches and sample tanks.
 for z in [30.0,36.0]:
  _box("Lab workbench", Vector3(3,0.9,1), Vector3(8.5,0.45,z), metal_mat)
 for z in [29.0,33.0,37.0]:
  _cylinder("Sample tank",0.65,2.5,Vector3(13.8,1.25,z),_mat(Color(0.18,0.25,0.23),0.45,0.3))
  _cylinder("Sample fluid",0.5,2.2,Vector3(13.8,1.25,z),_mat(Color(0.07,0.24,0.16),0.2,0.25),false)
  _box("Anomalous sample",Vector3(0.36,0.36,0.36),Vector3(13.8,1.2,z),red_mat,false)
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

func _build_lights() -> void:
 _add_light(Vector3(0,2.8,-4),Color(0.9,0.3,0.2),0.65,7)
 _add_light(Vector3(0,2.8,13),Color(0.85,0.035,0.025),0.85,10)
 _add_light(Vector3(-10,2.8,10),Color(0.12,0.35,0.85),0.55,7)
 _add_light(Vector3(10,2.8,10),Color(0.25,0.8,0.55),0.55,7)
 _add_light(Vector3(0,2.8,34),Color(0.08,0.65,0.65),0.7,9)
 _add_light(Vector3(0,2.8,52),Color(0.9,0.035,0.02),0.9,9)
 _add_light(Vector3(0,2.8,70),Color(0.85,0.58,0.28),0.65,8)
 _add_light(Vector3(-11,2.8,27.5),Color(0.9,0.58,0.3),0.6,6)
 _add_light(Vector3(-10.8,2.8,33),Color(0.95,0.3,0.08),0.7,6)
 _add_light(Vector3(-10.5,2.8,40.5),Color(0.9,0.025,0.02),0.7,6)
 _add_light(Vector3(0,2.8,88),Color(0.2,0.3,0.85),0.6,8)
 _add_light(Vector3(0,2.8,86),Color(0.72,0.08,0.06),0.48,7)
 _add_light(Vector3(0,2.8,96),Color(0.12,0.18,0.32),0.42,7)

func _add_light(p: Vector3,c: Color,e: float,r: float) -> void:
 var light:=OmniLight3D.new()
 light.position=p
 light.light_color=c
 light.light_energy=e
 light.omni_range=r
 light.omni_attenuation=1.7
 add_child(light)
 _box("Lamp housing",Vector3(0.72,0.09,0.3),Vector3(p.x,3.08,p.z),metal_mat,false)

func _build_labels() -> void:
 _label("D-12 / GATE",Vector3(0,2.65,-3.8),Color(0.9,0.12,0.08))
 _label("ADMINISTRATION",Vector3(-10,2.7,6),Color(0.35,0.55,0.9))
 _label("MEDICAL",Vector3(10,2.7,6),Color(0.35,0.8,0.6))
 _label("ARCHIVE 04",Vector3(-11,2.7,25.5),Color(0.85,0.65,0.4))
 _label("WORKSHOP",Vector3(-11,2.7,31.5),Color(0.9,0.35,0.1))
 _label("ISOLATION",Vector3(-11,2.7,37.5),Color(0.9,0.08,0.05))
 _label("DATA NODE",Vector3(0,2.7,34),Color(0.15,0.85,0.75))
 _label("KETER CONTAINMENT",Vector3(0,2.7,48),Color(0.9,0.08,0.05))
 _label("EVACUATION",Vector3(0,2.7,68),Color(0.85,0.6,0.3))
 _label("COMMS / CHANNEL 7",Vector3(-2,2.7,76.4),Color(0.35,0.5,0.95))
 _label("MIRROR PROTOCOL",Vector3(0,2.7,84),Color(0.9,0.08,0.05))

func _label(t: String,p: Vector3,c: Color) -> void:
 var l:=Label3D.new()
 l.text=t
 l.position=p
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
