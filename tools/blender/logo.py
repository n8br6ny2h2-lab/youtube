import bpy, bmesh, math, random, sys
from mathutils import Vector, Euler
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
def srgb(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(((x+0.055)/1.055)**2.4 if x>0.04045 else x/12.92 for x in c)
def principled(name,col,rough,metal=0,coat=0):
    m=bpy.data.materials.new(name); m.use_nodes=True; b=m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*srgb(col),1); b.inputs['Roughness'].default_value=rough; b.inputs['Metallic'].default_value=metal
    b.inputs['Coat Weight'].default_value=coat
    return m,b
# ---- gear profile
def gear_mesh(name,teeth,r_root,r_tip,r_hole,depth):
    bm=bmesh.new()
    pts=[]
    for i in range(teeth):
        a0=2*math.pi*i/teeth; step=2*math.pi/teeth
        for f,r in [(0,r_root),(.18,r_root),(.30,r_tip),(.70,r_tip),(.82,r_root)]:
            # subdivide root arcs
            pts.append((r*math.cos(a0+f*step),r*math.sin(a0+f*step)))
    outer=[bm.verts.new((x,y,0)) for x,y in pts]
    face=bm.faces.new(outer)
    ext=bmesh.ops.extrude_face_region(bm,geom=[face])
    for v in [e for e in ext['geom'] if isinstance(e,bmesh.types.BMVert)]: v.co.z=depth
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    me=bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o)
    o.location.z=-depth/2
    bpy.ops.mesh.primitive_cylinder_add(radius=r_hole,depth=depth*3,vertices=128); h=bpy.context.object; h.hide_render=True; h.hide_viewport=True
    bo=o.modifiers.new('hole','BOOLEAN'); bo.object=h; bo.operation='DIFFERENCE'; bo.solver='EXACT'
    bv=o.modifiers.new('bev','BEVEL'); bv.width=.035; bv.segments=4; bv.limit_method='ANGLE'
    o.modifiers.new('wn','WEIGHTED_NORMAL')
    return o
GM,gb=principled('gold','e9902f',.28,1.0,.3)
g=gear_mesh('gear',16,2.25,2.7,1.72,.45); g.data.materials.append(GM)
# inner thin ring (accent)
AM,_=principled('dark','1a2340',.35,.8)
bpy.ops.mesh.primitive_torus_add(major_radius=1.72,minor_radius=.06,major_segments=160,location=(0,0,.24)); t=bpy.context.object; t.data.materials.append(GM); bpy.ops.object.shade_smooth()
# ---- planet with bands + atmosphere
P=bpy.data.materials.new('planet'); P.use_nodes=True; nt=P.node_tree; N=nt.nodes; L=nt.links
b=N['Principled BSDF']; b.inputs['Roughness'].default_value=.5
tc=N.new('ShaderNodeTexCoord'); sep=N.new('ShaderNodeSeparateXYZ'); noise=N.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=3; noise.inputs['Detail'].default_value=6
mix=N.new('ShaderNodeMath'); mix.operation='ADD'
L.new(tc.outputs['Object'],sep.inputs[0]); L.new(tc.outputs['Object'],noise.inputs['Vector'])
mul=N.new('ShaderNodeMath'); mul.operation='MULTIPLY'; mul.inputs[1].default_value=.25
L.new(noise.outputs['Fac'],mul.inputs[0]); L.new(sep.outputs['Z'],mix.inputs[0]); L.new(mul.outputs[0],mix.inputs[1])
wave=N.new('ShaderNodeMath'); wave.operation='SINE'; m4=N.new('ShaderNodeMath'); m4.operation='MULTIPLY'; m4.inputs[1].default_value=9
L.new(mix.outputs[0],m4.inputs[0]); L.new(m4.outputs[0],wave.inputs[0])
ramp=N.new('ShaderNodeValToRGB'); cr=ramp.color_ramp
cr.elements[0].position=0; cr.elements[0].color=(*srgb('123f9e'),1); cr.elements[1].position=1; cr.elements[1].color=(*srgb('5cc2ff'),1)
e=cr.elements.new(.5); e.color=(*srgb('2a78e8'),1)
mr=N.new('ShaderNodeMapRange'); mr.inputs[1].default_value=-1; mr.inputs[2].default_value=1
L.new(wave.outputs[0],mr.inputs[0]); L.new(mr.outputs[0],ramp.inputs[0]); L.new(ramp.outputs[0],b.inputs['Base Color'])
lw=N.new('ShaderNodeLayerWeight'); lw.inputs[0].default_value=.35
b.inputs['Emission Color'].default_value=(*srgb('7fd6ff'),1); fm=N.new('ShaderNodeMath'); fm.operation='POWER'; fm.inputs[1].default_value=4; L.new(lw.outputs['Fresnel'],fm.inputs[0]); fm2=N.new('ShaderNodeMath'); fm2.operation='MULTIPLY'; fm2.inputs[1].default_value=1.5; L.new(fm.outputs[0],fm2.inputs[0]); L.new(fm2.outputs[0],b.inputs['Emission Strength'])
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.33,segments=96,ring_count=48,location=(0,0,.7),rotation=(math.radians(70),math.radians(-20),0)); p=bpy.context.object; p.data.materials.append(P); bpy.ops.object.shade_smooth()
# atmosphere glow shell
A=bpy.data.materials.new('atm'); A.use_nodes=True; n=A.node_tree.nodes; n.remove(n['Principled BSDF'])
em=n.new('ShaderNodeEmission'); em.inputs[0].default_value=(*srgb('6fd0ff'),1); em.inputs[1].default_value=1.2
tr=n.new('ShaderNodeBsdfTransparent'); mx=n.new('ShaderNodeMixShader'); lw2=n.new('ShaderNodeLayerWeight'); lw2.inputs[0].default_value=.08
pw=n.new('ShaderNodeMath'); pw.operation='POWER'; pw.inputs[1].default_value=3
A.node_tree.links.new(lw2.outputs['Facing'],pw.inputs[0]); A.node_tree.links.new(pw.outputs[0],mx.inputs[0])
A.node_tree.links.new(tr.outputs[0],mx.inputs[1]); A.node_tree.links.new(em.outputs[0],mx.inputs[2]); A.node_tree.links.new(mx.outputs[0],n['Material Output'].inputs[0])
A.blend_method='BLEND' if hasattr(A,'blend_method') else None
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.40,segments=96,ring_count=48,location=(0,0,.7)); a=bpy.context.object; a.data.materials.append(A); bpy.ops.object.shade_smooth()
# ---- saturn-like ring
R=bpy.data.materials.new('ring'); R.use_nodes=True; n=R.node_tree.nodes; rb=n['Principled BSDF']
rb.inputs['Base Color'].default_value=(*srgb('cfe9ff'),1); rb.inputs['Roughness'].default_value=.3; rb.inputs['Emission Color'].default_value=(*srgb('bfeaff'),1); rb.inputs['Emission Strength'].default_value=.35; rb.inputs['Alpha'].default_value=.85
bm=bmesh.new(); segs=256; ri,ro=1.78,1.92
inner=[bm.verts.new((ri*math.cos(2*math.pi*i/segs),ri*math.sin(2*math.pi*i/segs),0)) for i in range(segs)]
outer=[bm.verts.new((ro*math.cos(2*math.pi*i/segs),ro*math.sin(2*math.pi*i/segs),0)) for i in range(segs)]
for i in range(segs):
    j=(i+1)%segs; bm.faces.new((inner[i],outer[i],outer[j],inner[j]))
me=bpy.data.meshes.new('ring'); bm.to_mesh(me); bm.free()
ring=bpy.data.objects.new('ring',me); bpy.context.collection.objects.link(ring); ring.data.materials.append(R)
ring.location=(0,0,.7); ring.rotation_euler=(math.radians(68),0,math.radians(-22))
ring.modifiers.new('sol','SOLIDIFY').thickness=.02
# moon on ring
MM,_=principled('moon','ffd257',.35,0,.5)
pos=Euler((math.radians(68),0,math.radians(-22))).to_matrix()@Vector((1.85*math.cos(math.radians(-35)),1.85*math.sin(math.radians(-35)),0))+Vector((0,0,.7))
bpy.ops.mesh.primitive_uv_sphere_add(radius=.15,segments=48,ring_count=24,location=pos); o=bpy.context.object; o.data.materials.append(MM); bpy.ops.object.shade_smooth()
# ---- background: radial gradient + stars
BGm=bpy.data.materials.new('bg'); BGm.use_nodes=True; n=BGm.node_tree.nodes; n.remove(n['Principled BSDF'])
em=n.new('ShaderNodeEmission'); grad=n.new('ShaderNodeTexGradient'); grad.gradient_type='SPHERICAL'; tc=n.new('ShaderNodeTexCoord'); mp=n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value=(.11,.11,.11)
rp=n.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].color=(*srgb('070b1c'),1); rp.color_ramp.elements[1].color=(*srgb('1d3270'),1)
lk=BGm.node_tree.links; lk.new(tc.outputs['Object'],mp.inputs[0]); lk.new(mp.outputs[0],grad.inputs[0]); lk.new(grad.outputs[0],rp.inputs[0]); lk.new(rp.outputs[0],em.inputs[0]); lk.new(em.outputs[0],n['Material Output'].inputs[0])
bpy.ops.mesh.primitive_plane_add(size=30,location=(0,0,-1)); bpy.context.object.data.materials.append(BGm)
ST=bpy.data.materials.new('star'); ST.use_nodes=True; n=ST.node_tree.nodes; n.remove(n['Principled BSDF']); e=n.new('ShaderNodeEmission'); e.inputs[1].default_value=6; ST.node_tree.links.new(e.outputs[0],n['Material Output'].inputs[0])
for i in range(90):
    x,y=random.uniform(-4.5,4.5),random.uniform(-4.5,4.5)
    if math.hypot(x,y)<3.1: continue
    bpy.ops.mesh.primitive_ico_sphere_add(radius=random.uniform(.008,.03),subdivisions=1,location=(x,y,-.9)); bpy.context.object.data.materials.append(ST)
# ---- lights
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(*srgb('0b1430'),1); w.node_tree.nodes['Background'].inputs[1].default_value=.4
def area(loc,energy,size,col='ffffff'):
    bpy.ops.object.light_add(type='AREA',location=loc); l=bpy.context.object; l.data.energy=energy; l.data.size=size; l.data.color=srgb(col)
    l.rotation_euler=(Vector((0,0,0))-Vector(loc)).to_track_quat('-Z','Y').to_euler()
area((-5,5,7),2200,5,'fff1dc')   # key warm
area((6,-3,3),900,4,'7fb8ff')    # rim cool
area((0,-6,8),400,8)             # fill
# ---- camera
bpy.ops.object.camera_add(location=(0,-1.2,14)); cam=bpy.context.object; sc.camera=cam; cam.data.lens=55
cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
sc.render.engine='CYCLES'; sc.cycles.samples=int(sys.argv[-2]); sc.cycles.use_denoising=True
sc.render.resolution_x=sc.render.resolution_y=1200
sc.view_settings.view_transform='AgX'; sc.view_settings.look='AgX - Medium High Contrast'
sc.render.filepath=sys.argv[-1]; bpy.ops.render.render(write_still=True)
