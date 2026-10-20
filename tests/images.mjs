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

const sized=renderNode({type:'image',attrs:{src:uploaded,maxWidth:420,title:'Caption'}})
assert.match(sized, /max-width:min\(100%, 420px\)/)
for(const maxWidth of [null,'',-1,Infinity,'100px;display:none',10001])assert.ok(!renderNode({type:'image',attrs:{src:uploaded,maxWidth}}).includes('max-width:min'))
console.log('PASS: image maximum width is responsive and rejects invalid CSS values')

const credited = renderNode({type:'image',attrs:{src:'https://images.unsplash.com/photo-fixture',creditName:'A <B>',creditUrl:'https://unsplash.com/@artist',title:'My caption'}})
assert.match(credited,/A &lt;B&gt;/)
assert.match(credited,/My caption/)
assert.match(credited,/href="https:\/\/unsplash.com\/@artist"/)
for(const creditUrl of ['javascript:alert(1)','https://unsplash.com.evil.test/@artist']) {
 assert.ok(!renderNode({type:'image',attrs:{src:'/image.jpg',creditName:'Artist',creditUrl}}).includes('Photo by'))
}
console.log('PASS: Unsplash credit rendering and unsafe link rejection')
