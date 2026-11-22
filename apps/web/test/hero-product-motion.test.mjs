import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
registerHooks({resolve(specifier,context,next){
  if(context.parentURL?.includes('/src/')&&!context.parentURL.includes('/node_modules/')&&specifier.startsWith('.')&&!specifier.endsWith('.ts'))return next(`${specifier}.ts`,context)
  return next(specifier,context)
}})
const {heroBezierPoint}=await import('../src/features/landing/components/hero-rebrand/hero-product-motion-math.ts')
const {heroRadiograph}=await import('../src/features/landing/components/hero-rebrand/hero-product-measurements.ts')
const {heroTpaPoints,heroTpaConstruction,heroTpaColors,heroTpaDegrees}=await import('../src/features/landing/components/hero-rebrand/hero-product-tpa.ts')
const close=(a,b)=>assert(Math.abs(a-b)<0.001,`${a} differs from ${b}`)

test('reference Bezier arrives exactly and remains within control bounds',()=>{
  const a={x:500,y:300},b={x:250,y:100},c={x:90,y:220}
  assert.deepEqual(heroBezierPoint(a,b,c,0),a);assert.deepEqual(heroBezierPoint(a,b,c,1),c)
  for(let i=0;i<=100;i++){const p=heroBezierPoint(a,b,c,i/100);assert(p.x>=90&&p.x<=500&&p.y>=100&&p.y<=300)}
})

test('finite segments use exact anchors, project colors, and a perpendicular TPA reference',()=>{
 const {segments,angle}=heroTpaConstruction(4),{axis,plateau,reference}=segments
 const v=l=>({x:(l.end.x-l.start.x)*heroRadiograph.widthPx,y:(l.end.y-l.start.y)*heroRadiograph.heightPx}),a=v(axis),p=v(plateau),r=v(reference)
 close((a.x*r.x+a.y*r.y)/(Math.hypot(a.x,a.y)*Math.hypot(r.x,r.y)),0)
 close(Math.atan2(Math.abs(r.x*p.y-r.y*p.x),Math.abs(r.x*p.x+r.y*p.y))*180/Math.PI,heroTpaDegrees)
 assert.deepEqual(plateau.start,heroTpaPoints[0]);assert.deepEqual(plateau.end,heroTpaPoints[1]);assert.deepEqual(axis.start,heroTpaPoints[2]);assert.deepEqual(axis.end,heroTpaPoints[3])
 assert.deepEqual(heroTpaColors,{line:'var(--radiograph-mark-anatomy)',reference:'var(--radiograph-mark-interest)',angle:'var(--radiograph-mark-comparison)'})
 close(angle.degrees,heroTpaDegrees);assert(angle.label);assert(!angle.value.includes('TPA'))
})

test('an angle is generated on real segment contact, including a shared endpoint',()=>{
 const [a,b,axis]=heroTpaPoints
 const touchY=a.y+(axis.x-a.x)/(b.x-a.x)*(b.y-a.y)
 const before=heroTpaConstruction(3,{x:axis.x,y:touchY-0.001})
 assert.equal(before.angle,null);assert.equal(before.segments.reference,undefined)
 const touching=heroTpaConstruction(3,{x:axis.x,y:touchY})
 assert(touching.angle);assert(touching.segments.reference);assert(touching.angle.value.includes('°'))
 assert.deepEqual(touching.segments.axis.end,{x:axis.x,y:touchY})
})

test('the first segment is longer and the upper axis handle clears the automatic guide',()=>{
 const state=heroTpaConstruction(4),{plateau,axis,reference}=state.segments
 const px=p=>({x:p.x*heroRadiograph.widthPx,y:p.y*heroRadiograph.heightPx})
 const a=px(plateau.start),b=px(plateau.end),originalLength=Math.hypot(0.18*heroRadiograph.widthPx,0.053*heroRadiograph.heightPx)
 close(Math.hypot(b.x-a.x,b.y-a.y)/originalLength,1.12)
 const p=px(axis.start),r=px(reference.start),s=px(reference.end),dx=s.x-r.x,dy=s.y-r.y
 const gap=Math.abs(dx*(p.y-r.y)-dy*(p.x-r.x))/Math.hypot(dx,dy)
 assert(gap*382/heroRadiograph.heightPx>10)
})
