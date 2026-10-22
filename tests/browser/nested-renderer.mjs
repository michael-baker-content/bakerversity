import assert from 'node:assert/strict'
export async function nestedRendererSmoke(page,origin){
 const errors=[];const onError=error=>errors.push(error.message);page.on('pageerror',onError)
 try {
  await page.goto(origin+'/renderer-check')
  const first=page.locator('[data-lesson-island="0"]')
  const second=page.locator('[data-lesson-island="1"]')
  await first.getByRole('radio').first().check()
  await second.getByRole('radio').first().check()
  assert.equal(await first.getByRole('radio').first().isChecked(),true)
  await first.getByRole('button',{name:'Check answers',exact:true}).click()
  await first.getByText('✓ Correct',{exact:true}).waitFor()
  await second.getByRole('button',{name:'Check answers',exact:true}).click()
  await second.getByText('✓ Correct',{exact:true}).waitFor()
  await page.locator('td [data-lesson-island="2"] svg').first().waitFor()
  assert.equal(await page.locator('[data-callout] li [data-lesson-island="1"]').count(),1)
  await page.getByRole('button',{name:'Replace fixture',exact:true}).click()
  await page.getByText('Replacement content',{exact:true}).waitFor()
  assert.equal(await page.locator('[data-lesson-island]').count(),0)
  assert.deepEqual(errors,[])
 }finally{page.off('pageerror',onError)}
}
