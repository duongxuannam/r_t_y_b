import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('todo-pulse-tour-seen', 'true')
  })
})

test('loads the main app shell and navigation', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Todo Pulse')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Main App' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'About' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Auth' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Todo Control' })).toBeVisible()
})
