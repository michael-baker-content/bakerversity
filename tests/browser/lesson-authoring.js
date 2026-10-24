// Playwright CLI run-code function. Requires the isolated harness, never the live LMS.
async page => {
  const ensure = (value, message) => { if (!value) throw new Error(message) }
  ensure(new URL(page.url()).origin === 'http://localhost:3101', 'Use the isolated harness on port 3101')
  ensure(await page.getByText('ISOLATED TEST HARNESS — simulated API, no live accounts').count() === 1, 'Harness banner missing')
  // Starting on the course page avoids discarding an existing editing session.
  await page.getByRole('link', { name: 'Open lesson', exact: true }).click()
  const title = page.getByRole('textbox', { name: 'Title *', exact: true })
  const mode = page.getByRole('combobox', { name: 'Test mode', exact: true })
  const save = page.getByRole('button', { name: 'Save draft', exact: true })
  const fixture = async () => (await page.request.get('http://localhost:3101/api/harness')).json()
  async function setMode(value) {
    const response = page.waitForResponse(response => response.url().endsWith('/api/harness') && response.request().method() === 'POST')
    await mode.selectOption(value)
    await response
    ensure((await fixture()).mode === value, 'Harness mode did not change')
  }
  await title.waitFor()
  await title.fill('Saved once')
  await save.click()
  await page.getByRole('status').filter({ hasText: 'Changes saved.' }).waitFor()
  await title.fill('Saved twice')
  await save.click()
  await page.getByRole('status').filter({ hasText: 'Changes saved.' }).waitFor()
  ensure((await fixture()).lesson.title === 'Saved twice', 'Repeated save did not use the returned version')
  ensure(page.url().includes('/lessons/'), 'Save navigated away')

  await setMode('slow')
  await title.fill('Submitted snapshot')
  await save.click()
  await title.fill('Typed while saving')
  await save.waitFor({ state: 'visible' })
  ensure(await title.inputValue() === 'Typed while saving', 'Pending edits were lost')
  ensure((await fixture()).lesson.title === 'Submitted snapshot', 'Wrong snapshot acknowledged')
  ensure(await page.getByRole('status').filter({ hasText: 'You have unsaved changes.' }).count() === 1, 'Pending edits incorrectly marked saved')

  await setMode('validation')
  await save.click()
  await page.getByRole('alert').filter({ hasText: 'Simulated title validation failure' }).waitFor()
  ensure(await title.inputValue() === 'Typed while saving' && await save.isEnabled(), 'Validation failure lost work or blocks retry')
  await setMode('conflict')
  await save.click()
  await page.getByRole('alert').filter({ hasText: 'This item changed in another session' }).waitFor()
  ensure(await title.inputValue() === 'Typed while saving' && await save.isDisabled(), 'Conflict did not preserve and protect local work')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const [recoveryDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('dialog', { name: 'Download content', exact: true }).getByRole('button', { name: 'Recovery copy (.json)', exact: true }).click(),
  ])
  ensure(recoveryDownload.suggestedFilename() === 'lesson-recovery.json', 'Recovery file missing')
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('link', { name: 'test', exact: true }).click()
  ensure(page.url().includes('/lessons/'), 'Canceling navigation discarded editor')
  await setMode('normal')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Reload latest version' }).click()
  await title.waitFor()
  ensure(await title.inputValue() === 'Submitted snapshot', 'Reload did not use server state')

  const beforeControls = (await fixture()).writes
  await page.getByRole('img', { name: 'Fixture image', exact: true }).dblclick()
  await page.getByRole('textbox', { name: 'Describe the image for screen readers…' }).fill('Updated image description')
  await page.getByRole('button', { name: 'Update', exact: true }).click()
  await page.getByRole('img', { name: 'Updated image description', exact: true }).waitFor()
  await page.getByRole('button', { name: '✦ Callout', exact: true }).focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: '💡 Tip', exact: true }).click()
  await page.getByRole('button', { name: '⬛ Terminal', exact: true }).click()
  await page.getByRole('button', { name: 'Insert', exact: true }).click()
  ensure((await fixture()).writes === beforeControls, 'A content control submitted the lesson')

  await title.fill('Unconfirmed local work')
  await setMode('commit-lost')
  await save.click()
  await page.getByRole('alert').filter({ hasText: 'Further saves are paused' }).waitFor()
  ensure(await title.inputValue() === 'Unconfirmed local work' && await save.isDisabled(), 'Uncertain result lost local work or allows blind retry')
  ensure((await fixture()).writes === beforeControls + 1, 'Mutation duplicated')
  await setMode('load-failed')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Reload latest version' }).click()
  await page.getByRole('heading', { name: 'Unable to open lesson' }).waitFor()
  ensure(await title.count() === 0, 'Failed load exposed an editable blank form')
  await setMode('normal')
  await page.getByRole('button', { name: 'Retry loading' }).click()
  await title.waitFor()
  ensure(await title.inputValue() === 'Unconfirmed local work', 'Reload did not reconcile the committed save')
  return 'PASS: lesson authoring checks against isolated simulated API. Hosted integration and full accessibility remain separate.'
}
