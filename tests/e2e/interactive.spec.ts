import { test, expect } from '../../src/fixtures';

test.describe('UI Components & Form Controls', () => {
  test('User can inspect and toggle form checkboxes @regression', async ({ checkboxesPage }) => {
    await checkboxesPage.open();

    // Verify initial states
    const initialCb1 = await checkboxesPage.isChecked(1);
    const initialCb2 = await checkboxesPage.isChecked(2);
    expect(initialCb1).toBe(false);
    expect(initialCb2).toBe(true);

    // Toggle checkbox 1
    await checkboxesPage.toggleCheckbox(1);
    expect(await checkboxesPage.isChecked(1)).toBe(true);

    // Toggle checkbox 2
    await checkboxesPage.toggleCheckbox(2);
    expect(await checkboxesPage.isChecked(2)).toBe(false);
  });
});
