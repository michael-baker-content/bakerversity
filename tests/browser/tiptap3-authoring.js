// Playwright CLI scenario: open a lesson in the isolated authoring harness first.
async page => {
  const ensure = (v, message) => { if (!v) throw Error(message) }
  ensure(new URL(page.url()).origin === 'http://localhost:3101', 'Isolated harness only')
  const editor = page.getByRole('textbox').filter({ hasText: 'Local test content' })
  await editor.click()
  await page.keyboard.press('Control+End')
  await page.getByRole('button', { name: '✦ Callout', exact: true }).click()
  await page.getByRole('button', { name: '🎯 Objectives', exact: true }).click()
  await page.keyboard.insertText('Zażółć gęślą jaźń — cele lekcji')
  await page.getByRole('button', {name: 'Save draft', exact: true}).click()
  await page.getByRole('status').filter({hasText:'Changes saved.'}).waitFor()
  const fixture = await (await page.request.get('http://localhost:3101/api/harness')).json()
  const content = JSON.stringify(fixture.lesson.content)
  ensure(content.includes('Zażółć gęślą jaźń — cele lekcji'), 'Polish text lost')
  ensure(content.includes('"type":"objectives"'), 'Objectives callout lost')
  ensure(content.includes('Local test content'), 'Existing content lost')
  await page.reload()
  await page.getByText('Zażółć gęślą jaźń — cele lekcji', {exact:true}).first().waitFor()
  await page.getByRole('button', {name:'⊞ Table', exact:true}).click()
  await page.getByRole('button', {name:'Save draft', exact:true}).click()
  await page.getByRole('status').filter({hasText:'Changes saved.'}).waitFor()
  const updated = await (await page.request.get('http://localhost:3101/api/harness')).json()
  ensure(JSON.stringify(updated.lesson.content).includes('"type":"table"'), 'Table insertion failed')
  return 'PASS: Tiptap 3 Polish text, Objectives, existing content, save/reopen and table insertion'
}
