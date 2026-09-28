import { expect, test } from '@playwright/test';

test('server-renders the document language for English and Bengali routes', async ({ request }) => {
  const englishResponse = await request.get('/');
  expect(englishResponse.status()).toBe(200);
  expect(await englishResponse.text()).toMatch(/<html lang="en"/);

  const bengaliResponse = await request.get('/bn/category');
  expect(bengaliResponse.status()).toBe(200);
  expect(await bengaliResponse.text()).toMatch(/<html lang="bn"/);
});
