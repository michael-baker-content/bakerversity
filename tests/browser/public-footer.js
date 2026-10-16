// Playwright CLI scenario for isolated footer preview at localhost:3103/contact. All Formspree requests are intercepted.
async page => {
 if(new URL(page.url()).origin!=='http://localhost:3103')throw Error('Isolated preview only')
 let mode='error',calls=0
 await page.route('https://formspree.io/**',async route=>{
   calls++
   if(route.request().url()!=='https://formspree.io/f/mrpervdg')throw Error('Wrong endpoint')
   await route.fulfill({status:mode==='error'?422:200,contentType:'application/json',body:JSON.stringify(mode==='error'?{errors:[{message:'Simulated delivery error'}]}:{ok:true})})
 })
 await page.getByRole('textbox',{name:'Your email',exact:true}).fill('fixture@example.com')
 const message=page.getByRole('textbox',{name:'Your message',exact:true})
 await message.fill('This is an isolated browser check, not a real submission.')
 await page.getByRole('combobox',{name:'What is this about?'}).selectOption('Accessibility issue')
 await page.getByRole('button',{name:'Send message',exact:true}).click()
 await page.getByRole('alert').filter({hasText:'Simulated delivery error'}).waitFor()
 if(!(await message.inputValue()).includes('isolated'))throw Error('Message lost after failure')
 mode='success'
 await page.getByRole('button',{name:'Send message',exact:true}).click()
 await page.getByRole('status').filter({hasText:'Your message has been submitted.'}).waitFor()
 if(await message.inputValue()!=='')throw Error('Successful form not reset')
 if(calls!==2)throw Error('Unexpected duplicate submission')
 for(const path of ['/help','/privacy','/materials','/contact']){
  const response=await page.request.get('http://localhost:3103'+path)
  if(response.status()!==200)throw Error('Broken page '+path)
 }
 await page.goto('http://localhost:3103/')
 await page.setViewportSize({width:1280,height:800})
 await page.screenshot({path:'footer-desktop.png'})
 await page.setViewportSize({width:390,height:844})
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow')
 await page.screenshot({path:'footer-mobile.png'})
 return 'PASS: public pages, correct endpoint, handled failure with preserved message, success/reset, no duplicate requests, mobile layout; all Formspree submissions intercepted'
}
