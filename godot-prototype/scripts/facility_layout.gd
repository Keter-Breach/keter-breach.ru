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
 # Дополнительные комнаты, координаты которых присутствуют в исходнике.
 _wall_line("z",79,-36,-15,[[-27,-23]])
 _wall_line("z",97,-15,15,[[-2,2]])
 _wall_line("x",-36,79,97,[[83,87]])
 _wall_line("x",-15,79,97,[[83,87]])
 _wall_line("x",15,79,97,[[83,87]])
 _wall_line("z",61,16,36,[[24,28]])
 _wall_line("z",83,16,36,[[24,28]])
 _wall_line("x",36,61,83)

func _table(p: Vector3) -> void:
 _box("Table top",Vector3(2.4,0.1,1.2),p+Vector3(0,0.75,0),metal_mat)
 for dx in [-1.1,1.1]:
  for dz in [-0.5,0.5]:
   _box("Table leg",Vector3(0.1,0.75,0.1),p+Vector3(dx,0.375,dz),metal_mat)

func _build_props() -> void:
 _table(Vector3(-10,0,12))
 for i in range(6): _box("Administration locker",Vector3(0.5,1.8,0.9),Vector3(-14.4,0.9,5.5+i*1.5),metal_mat)
 _box("L1 card visual",Vector3(0.35,0.035,0.22),Vector3(-10,0.82,12),_mat(Color(0,0.35,0.8)),false)
 for z in [6.5,9.5,13.0]: _box("Medical bed",Vector3(0.9,0.5,2),Vector3(13.8,0.35,z),_mat(Color(0.24,0.26,0.25)))
 _box("Medical supply crate",Vector3(1,1,1),Vector3(7,0.5,14.5),metal_mat)
 _box("Battery visual",Vector3(0.22,0.28,0.16),Vector3(7,1.15,14.5),_mat(Color(0.1,0.55,0.3)),false)
 for side in [-1.0,1.0]:
  for z in [28.0,31.0,34.0,37.0]:
   _box("Server rack",Vector3(1.2,2.4,0.8),Vector3(side*4.1,1.2,z),metal_mat)
   _box("Server LED",Vector3(0.05,0.05,0.05),Vector3(side*3.48,1.8,z),red_mat,false)
 _table(Vector3(2,0,40))
 _box("L2 card visual",Vector3(0.35,0.035,0.22),Vector3(2,0.82,40),_mat(Color(0.48,0.05,0.7)),false)
 for i in range(5): _box("Archive shelf",Vector3(0.55,2.35,0.82),Vector3(-15.4,1.18,24.8+i),metal_mat)
 _table(Vector3(-10.2,0,27.8))
 _box("Archive terminal",Vector3(0.42,0.06,0.3),Vector3(-10.2,0.84,27.8),red_mat,false)
 _box("Emergency generator",Vector3(1.25,1.55,1),Vector3(-14.8,0.78,32.8),metal_mat)
 _box("Sparking panel",Vector3(0.08,0.08,0.08),Vector3(-14.05,1.2,32.55),red_mat,false)
 for x in [-13.2,-12.7,-12.2]: _box("Workshop pipe",Vector3(0.07,0.07,3),Vector3(x,2.85,33),metal_mat,false)
 _box("Isolation bed",Vector3(1,0.42,2.2),Vector3(-14.1,0.28,38.2),_mat(Color(0.22,0.23,0.22)))
 _box("Isolation side table",Vector3(0.8,0.75,0.7),Vector3(-9.3,0.375,41.1),metal_mat)
 _box("Security crate",Vector3(1,1,1),Vector3(-9,0.5,69),metal_mat)
 _box("Evacuation cabinet",Vector3(0.8,1.6,0.35),Vector3(2.8,0.8,72),metal_mat)
 _box("Personnel locker",Vector3(0.55,1.9,0.65),Vector3(-31,0.95,84),metal_mat)
 _box("Personnel table",Vector3(1.2,0.12,0.65),Vector3(-25,0.8,86),metal_mat)
 _box("Observation console",Vector3(2,1.1,0.65),Vector3(25,0.55,70),metal_mat)
 _box("Channel 7 terminal",Vector3(1.8,1.25,0.16),Vector3(0,1.35,88.8),metal_mat)
 _box("Channel 7 screen",Vector3(1.52,0.9,0.035),Vector3(0,1.37,88.69),_mat(Color(0.04,0.07,0.16)),false)
 _box("L1 security door",Vector3(2,2.8,0.2),Vector3(0,1.4,24),door_mat)
 _box("L2 security door",Vector3(2,2.8,0.2),Vector3(0,1.4,60),door_mat)
 _box("Surface exit door",Vector3(2,2.8,0.2),Vector3(0,1.4,80),door_mat)

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
 _label("COMMS / CHANNEL 7",Vector3(0,2.7,91),Color(0.35,0.5,0.95))

func _label(t: String,p: Vector3,c: Color) -> void:
 var l:=Label3D.new()
 l.text=t
 l.position=p
 l.font_size=34
 l.pixel_size=0.008
 l.modulate=c
 add_child(l)
