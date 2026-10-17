import assert from 'node:assert/strict'
import { imageDelivery } from '../src/lib/imageDelivery.mjs'
import { renderNode } from '../src/components/renderer/renderNode.ts'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.supabase.co'
const uploaded = 'https://fixture.supabase.co/storage/v1/object/public/lesson-images/owner/photo.jpg'
const delivery = imageDelivery(uploaded)
assert.equal(new URL(delivery.src, 'https://example.test').searchParams.get('url'), uploaded)
assert.match(delivery.srcSet, /320w/)
assert.match(delivery.srcSet, /2400w/)
for (const url of [uploaded.replace('fixture.', 'other.'), uploaded.replace('/public/', '/sign/'), uploaded.replace('.jpg', '.gif'), '/local.png']) {
  assert.deepEqual(imageDelivery(url), { src: url })
}
const unsplash = imageDelivery('https://images.unsplash.com/photo-fixture?ixid=credit&auto=compress')
assert.equal(new URL(unsplash.src).searchParams.get('ixid'), 'credit')
assert.equal(new URL(unsplash.src).searchParams.get('auto'), 'format')
const html = renderNode({type:'image',attrs:{src:uploaded,alt:'A "quoted" image',width:800,height:400,title:'Caption'}})
assert.match(html, /width="800" height="400"/)
assert.match(html, /loading="lazy" decoding="async"/)
assert.match(html, /A &quot;quoted&quot; image/)
assert.match(html, /<figcaption>Caption<\/figcaption>/)
assert.ok(!renderNode({type:'image',attrs:{src:uploaded,width:'bad',height:-1}}).includes('width="bad"'))
console.log('PASS: responsive image delivery, allowed sources, animation bypass, dimensions, captions and escaping')
