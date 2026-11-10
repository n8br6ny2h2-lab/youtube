import bpy, bmesh, math, random, sys, json
from mathutils import Vector, Matrix, Euler
from bpy_extras.object_utils import world_to_camera_view
random.seed(5)
FR=int(sys.argv[-3]); SAMPLES=int(sys.argv[-2]); OUT=sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
def srgb(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(((x+0.055)/1.055)**2.4 if x>0.04045 else x/12.92 for x in c)
def pm(name,col,rough=.3,metal=1.0,emit=None,es=0):
    m=bpy.data.materials.new(name); m.use_nodes=True; b=m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*srgb(col),1); b.inputs['Roughness'].default_value=rough; b.inputs['Metallic'].default_value=metal
    if emit: b.inputs['Emission Color'].default_value=(*srgb(emit),1); b.inputs['Emission Strength'].default_value=es
    return m
ALU=pm('alu','b8c0cc',.28); TI=pm('ti','8d97a5',.22); DARK=pm('dark','3a4150',.4)
HOT=pm('hot','b5652a',.35,1,'ff5a1a',.6); CASE=pm('case','d9dee6',.2)
FLAME=pm('flame','ff7a1a',.5,0,'ff5500',5)
BLUEP=pm('bp','4fc3ff',.5,0,'4fc3ff',4); ORP=pm('op','ffb347',.5,0,'ff8a2a',5)
cut_box=None
def cutaway(o):
    global cut_box
    if cut_box is None:
        bpy.ops.mesh.primitive_cube_add(size=1,location=(0,-5,5)); cut_box=bpy.context.object; cut_box.scale=(20,10,10); cut_box.hide_render=True; cut_box.hide_viewport=True
    m=o.modifiers.new('cut','BOOLEAN'); m.object=cut_box; m.operation='DIFFERENCE'; m.solver='EXACT'
def tube(name,r_out,thick,x0,x1,mat,r_out1=None):
    # tapered tube along X built from cone primitive
    r1=r_out1 if r_out1 else r_out
    bpy.ops.mesh.primitive_cone_add(vertices=128,radius1=r_out,radius2=r1,depth=x1-x0,location=((x0+x1)/2,0,0),rotation=(0,math.radians(90),0),end_fill_type='NOTHING')
    o=bpy.context.object; o.name=name; o.data.materials.append(mat)
    s=o.modifiers.new('sol','SOLIDIFY'); s.thickness=thick; s.offset=-1
    bpy.ops.object.shade_smooth(); cutaway(o); return o
def blade_disk(name,x,r_in,r_out,n,chord,mat,pitch=35):
    bm=bmesh.new()
    for i in range(n):
        a=2*math.pi*i/n
        g=bmesh.ops.create_cube(bm,size=1)['verts']
        L=r_out-r_in
        M=(Matrix.Rotation(a,4,'X')@Matrix.Translation((0,0,r_in+L/2))@Matrix.Rotation(math.radians(pitch),4,'Z')@Matrix.Diagonal((chord,0.03,L,1)))
        bmesh.ops.transform(bm,matrix=M,verts=g)
    me=bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o); o.location=(x,0,0); o.data.materials.append(mat)
    bv=o.modifiers.new('b','BEVEL'); bv.width=.006; bv.segments=2
    # hub disk
    bpy.ops.mesh.primitive_cylinder_add(radius=r_in,depth=chord*1.1,location=(x,0,0),rotation=(0,math.radians(90),0),vertices=64); h=bpy.context.object; h.data.materials.append(DARK); bpy.ops.object.shade_smooth(); h.parent=o; h.matrix_parent_inverse=o.matrix_world.inverted()
    return o
rot_objs=[]
# --- structure (engine axis = X, intake at -X)
tube('nacelle',1.62,.07,-3.4,2.6,ALU,1.45)
tube('core',1.02,.05,-2.15,2.2,CASE,0.8)
fan=blade_disk('fan',-2.9,.35,1.52,20,.32,TI,40); rot_objs.append((fan,1.0))
bpy.ops.mesh.primitive_uv_sphere_add(radius=.42,location=(-3.05,0,0)); sp=bpy.context.object; sp.scale=(1.3,1,1); sp.data.materials.append(CASE); bpy.ops.object.shade_smooth()
for k,x in enumerate([-1.95,-1.6,-1.25,-0.9,-0.55]):
    r=0.98-0.05*k; d=blade_disk(f'comp{k}',x,.42,r,28,.16,TI,45); rot_objs.append((d,1.6))
# combustor
bpy.ops.mesh.primitive_torus_add(location=(0.05,0,0),rotation=(0,math.radians(90),0),major_radius=.7,minor_radius=.17,major_segments=96); cb=bpy.context.object; cb.scale=(1,1,2.2); cb.data.materials.append(HOT); bpy.ops.object.shade_smooth(); cutaway(cb)
for i in range(16):
    a=2*math.pi*i/16; y,z=.7*math.cos(a),.7*math.sin(a)
    if y<0 and z>0 or True:
        bpy.ops.mesh.primitive_cone_add(radius1=.06,radius2=.0,depth=.4,location=(0.3,y,z),rotation=(0,math.radians(90),0),vertices=16); f=bpy.context.object; f.data.materials.append(FLAME)
for k,x in enumerate([0.75,1.05,1.35]):
    r=0.78+0.04*k; d=blade_disk(f'turb{k}',x,.42,r,30,.15,HOT,-40); rot_objs.append((d,1.6))
bpy.ops.mesh.primitive_cylinder_add(radius=.12,depth=5.2,location=(-0.5,0,0),rotation=(0,math.radians(90),0),vertices=32); bpy.context.object.data.materials.append(DARK)
bpy.ops.mesh.primitive_cone_add(radius1=.45,radius2=.05,depth=1.1,location=(2.15,0,0),rotation=(0,math.radians(90),0),vertices=64); ec=bpy.context.object; ec.data.materials.append(DARK); bpy.ops.object.shade_smooth()
# --- airflow particles (visible quadrant y<0, z>0 is cut open; also outer bypass)
def particles(mat,n,x0,x1,rmin,rmax,size):
    out=[]
    for i in range(n):
        a=random.uniform(math.radians(95),math.radians(175))  # angle in YZ plane: y=r cos a <0, z=r sin a>0
        r=random.uniform(rmin,rmax); y,z=r*math.cos(a),r*math.sin(a)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=size,segments=12,ring_count=6,location=(x0,y,z)); p=bpy.context.object; p.data.materials.append(mat); p.scale=(7,1,1)
        off=random.random()
        out.append((p,x0,x1,off))
    return out
P=particles(BLUEP,45,-5.0,-0.4,.5,1.4,.02)+particles(ORP,35,0.4,5.5,.2,.75,.022)
# --- floor + world
F=pm('floor','0b1020',.35,0)
bpy.ops.mesh.primitive_plane_add(size=60,location=(0,0,-1.9)); bpy.context.object.data.materials.append(F)
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(*srgb('0a1226'),1); w.node_tree.nodes['Background'].inputs[1].default_value=.5
def area(loc,e,s,col='ffffff'):
    bpy.ops.object.light_add(type='AREA',location=loc); l=bpy.context.object; l.data.energy=e; l.data.size=s; l.data.color=srgb(col)
    l.rotation_euler=(Vector((0,0,0))-Vector(loc)).to_track_quat('-Z','Y').to_euler()
area((-4,-6,6),2500,6,'fff3e0'); area((6,-4,2),1200,4,'8fc4ff'); area((0,6,5),900,6,'ffffff')
bpy.ops.object.camera_add(location=(-1.2,-9.2,3.6)); cam=bpy.context.object; sc.camera=cam; cam.data.lens=40
cam.rotation_euler=(Vector((-0.1,0,0.1))-cam.location).to_track_quat('-Z','Y').to_euler()
# --- animation
sc.frame_start=1; sc.frame_end=FR; sc.render.fps=24
for o,spd in rot_objs:
    o.rotation_euler=(0,0,0); o.keyframe_insert('rotation_euler',index=0,frame=1)
    o.rotation_euler=(spd*2*math.pi*FR/24*0.6,0,0); o.keyframe_insert('rotation_euler',index=0,frame=FR)
for p,x0,x1,off in P:
    # loop: position = x0 + ((t/period + off) mod 1)*(x1-x0); use stepped keyframes per frame
    period=2.0
    for f in range(1,FR+1):
        u=((f/24)/period+off)%1.0
        p.location.x=x0+u*(x1-x0); p.keyframe_insert('location',index=0,frame=f)
for a in bpy.data.actions:
    for fc in getattr(a,'fcurves',[]):
        for k in fc.keyframe_points: k.interpolation='LINEAR'
# --- label anchor points -> 2D json
anchors={'INTAKE / FAN':(-2.9,-0.2,1.7),'COMPRESSOR':(-1.25,-0.2,1.15),'COMBUSTION':(0.1,-0.2,0.95),'TURBINE':(1.05,-0.2,1.0),'EXHAUST':(2.5,-0.2,0.6)}
sc.render.resolution_x=1920; sc.render.resolution_y=1080
bpy.context.view_layer.update()
pts={}
for k,v in anchors.items():
    c=world_to_camera_view(sc,cam,Vector(v)); pts[k]=(round(c.x*1920),round((1-c.y)*1080))
json.dump(pts,open(OUT+'labels.json','w'))
sc.render.engine='CYCLES'; sc.cycles.samples=SAMPLES; sc.cycles.use_denoising=True; sc.cycles.max_bounces=4; sc.cycles.diffuse_bounces=2; sc.cycles.glossy_bounces=3; sc.cycles.transmission_bounces=2; sc.render.use_persistent_data=True
sc.view_settings.view_transform='AgX'; sc.view_settings.look='AgX - Medium High Contrast'
sc.render.filepath=OUT+'f_'; sc.render.image_settings.file_format='PNG'
if FR==1:
    sc.frame_set(1); sc.render.filepath=OUT+'still.png'; bpy.ops.render.render(write_still=True)
else:
    bpy.ops.render.render(animation=True)
