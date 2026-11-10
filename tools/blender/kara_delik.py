import bpy, bmesh, math, random, sys
from mathutils import Vector
random.seed(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
def emis_mat(name):
    m=bpy.data.materials.new(name); m.use_nodes=True; n=m.node_tree.nodes; n.remove(n['Principled BSDF']); return m,n,m.node_tree.links
# --- black hole sphere (pure black)
m,n,l=emis_mat('bh'); e=n.new('ShaderNodeEmission'); e.inputs[0].default_value=(0,0,0,1); l.new(e.outputs[0],n['Material Output'].inputs[0])
bpy.ops.mesh.primitive_uv_sphere_add(radius=1,segments=96,ring_count=48); bh=bpy.context.object; bh.data.materials.append(m); bpy.ops.object.shade_smooth()
# --- disk material: radial gradient + swirl noise
def disk_material(name,strength,rmin=1.35,rmax=4.3):
    m,n,l=emis_mat(name)
    tc=n.new('ShaderNodeTexCoord'); sep=n.new('ShaderNodeSeparateXYZ'); l.new(tc.outputs['Object'],sep.inputs[0])
    # radius
    vl=n.new('ShaderNodeVectorMath'); vl.operation='LENGTH'; l.new(tc.outputs['Object'],vl.inputs[0])
    rot=n.new('ShaderNodeVectorRotate'); rot.rotation_type='Z_AXIS'
    ra=n.new('ShaderNodeMath'); ra.operation='MULTIPLY'; ra.inputs[1].default_value=1.8; l.new(vl.outputs['Value'],ra.inputs[0])
    l.new(tc.outputs['Object'],rot.inputs['Vector']); l.new(ra.outputs[0],rot.inputs['Angle'])
    cmb=rot
    nz=n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value=2.2; nz.inputs['Detail'].default_value=12; nz.inputs['Roughness'].default_value=.6; l.new(cmb.outputs[0],nz.inputs['Vector'])
    # radial falloff: map radius 1.3..4.2 -> 1..0
    mr=n.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value=rmin; mr.inputs['From Max'].default_value=rmax; mr.inputs['To Min'].default_value=1; mr.inputs['To Max'].default_value=0
    l.new(vl.outputs['Value'],mr.inputs['Value'])
    pw=n.new('ShaderNodeMath'); pw.operation='POWER'; pw.inputs[1].default_value=2.2; l.new(mr.outputs[0],pw.inputs[0])
    mul=n.new('ShaderNodeMath'); mul.operation='MULTIPLY'; l.new(pw.outputs[0],mul.inputs[0])
    nzc=n.new('ShaderNodeMapRange'); nzc.inputs['From Min'].default_value=.3; nzc.inputs['From Max'].default_value=.75; nzc.inputs['To Min'].default_value=.25; nzc.inputs['To Max'].default_value=1.3
    l.new(nz.outputs['Fac'],nzc.inputs['Value']); l.new(nzc.outputs[0],mul.inputs[1])
    # color ramp by brightness
    rp=n.new('ShaderNodeValToRGB'); c=rp.color_ramp
    c.elements[0].position=0; c.elements[0].color=(0.25,0.03,0.0,1)
    c.elements[1].position=1; c.elements[1].color=(1,0.95,0.85,1)
    x=c.elements.new(.45); x.color=(1,0.35,0.05,1); y=c.elements.new(.75); y.color=(1,0.7,0.3,1)
    l.new(mul.outputs[0],rp.inputs[0])
    em=n.new('ShaderNodeEmission'); l.new(rp.outputs[0],em.inputs[0])
    st=n.new('ShaderNodeMath'); st.operation='MULTIPLY'; st.inputs[1].default_value=strength; l.new(mul.outputs[0],st.inputs[0]); l.new(st.outputs[0],em.inputs[1])
    tr=n.new('ShaderNodeBsdfTransparent'); mx=n.new('ShaderNodeMixShader')
    cl=n.new('ShaderNodeMath'); cl.operation='MINIMUM'; cl.inputs[1].default_value=1; l.new(mul.outputs[0],cl.inputs[0])
    l.new(cl.outputs[0],mx.inputs[0]); l.new(tr.outputs[0],mx.inputs[1]); l.new(em.outputs[0],mx.inputs[2])
    l.new(mx.outputs[0],n['Material Output'].inputs[0])
    return m
def ring(name,ri,ro,mat,rot):
    bm=bmesh.new(); s=256
    a=[bm.verts.new((ri*math.cos(2*math.pi*i/s),ri*math.sin(2*math.pi*i/s),0)) for i in range(s)]
    b=[bm.verts.new((ro*math.cos(2*math.pi*i/s),ro*math.sin(2*math.pi*i/s),0)) for i in range(s)]
    for i in range(s):
        j=(i+1)%s; bm.faces.new((a[i],b[i],b[j],a[j]))
    me=bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o); o.data.materials.append(mat); o.rotation_euler=rot; return o
D=disk_material('disk',12)
ring('disk',1.35,4.6,D,(math.radians(9),0,0))
# lensed image of far side: ring facing camera (arching over the top & bottom), thinner and dimmer
L=disk_material('lens',3.5,1.05,1.95)
lr=ring('lens',1.06,1.95,L,(0,0,0)); lr.rotation_euler=(math.radians(90),0,0); lr.location=(0,.6,0)
# photon ring
m,n,l=emis_mat('photon'); e=n.new('ShaderNodeEmission'); e.inputs[0].default_value=(1,.8,.55,1); e.inputs[1].default_value=25; l.new(e.outputs[0],n['Material Output'].inputs[0])
bpy.ops.mesh.primitive_torus_add(major_radius=1.04,minor_radius=.012,major_segments=256,location=(0,.3,0),rotation=(math.radians(90),0,0)); bpy.context.object.data.materials.append(m)
# --- stars background (world)
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; nt=w.node_tree; N=nt.nodes; Lk=nt.links
vor=N.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value=300
mr=N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value=0; mr.inputs['From Max'].default_value=.04; mr.inputs['To Min'].default_value=1; mr.inputs['To Max'].default_value=0
Lk.new(vor.outputs['Distance'],mr.inputs['Value'])
pw=N.new('ShaderNodeMath'); pw.operation='POWER'; pw.inputs[1].default_value=6; Lk.new(mr.outputs[0],pw.inputs[0])
nz=N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value=2.5; nz.inputs['Detail'].default_value=8
neb=N.new('ShaderNodeValToRGB'); neb.color_ramp.elements[0].position=.45; neb.color_ramp.elements[0].color=(0,0,0,1); neb.color_ramp.elements[1].position=.8; neb.color_ramp.elements[1].color=(0.02,0.03,0.09,1)
Lk.new(nz.outputs['Fac'],neb.inputs[0])
ad=N.new('ShaderNodeMixRGB'); ad.blend_type='ADD'; ad.inputs[0].default_value=1
st=N.new('ShaderNodeMath'); st.operation='MULTIPLY'; st.inputs[1].default_value=25; Lk.new(pw.outputs[0],st.inputs[0])
Lk.new(neb.outputs[0],ad.inputs[1]); Lk.new(st.outputs[0],ad.inputs[2])
Lk.new(ad.outputs[0],N['Background'].inputs[0]); N['Background'].inputs[1].default_value=1
# --- camera
bpy.ops.object.camera_add(location=(0,-13,1.6)); cam=bpy.context.object; sc.camera=cam; cam.data.lens=42
cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
sc.render.engine='CYCLES'; sc.cycles.samples=int(sys.argv[-2]); sc.cycles.use_denoising=True
sc.render.resolution_x=1920; sc.render.resolution_y=1080
sc.view_settings.view_transform='AgX'; sc.view_settings.look='AgX - Punchy'
# glow via compositor
sc.render.filepath=sys.argv[-1]; bpy.ops.render.render(write_still=True)
