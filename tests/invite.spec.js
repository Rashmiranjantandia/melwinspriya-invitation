const { test, expect } = require('@playwright/test');

test.describe('Wedding Invitation Page Tests', () => {

  test('Page loads successfully with correct title, names, and sections', async ({ page }) => {
    await page.goto('/');

    // Verify Title
    await expect(page).toHaveTitle(/Priya & Melwin — 8 July 2026/);

    // Verify presence of main sections
    await expect(page.locator('#hero')).toBeVisible();
    await expect(page.locator('#story')).toBeVisible();
    await expect(page.locator('#countdown')).toBeVisible();
    await expect(page.locator('#events')).toBeVisible();
    await expect(page.locator('#venue')).toBeVisible();
    await expect(page.locator('#contact')).toBeVisible();

    // Verify names are present
    const contentText = await page.textContent('body');
    expect(contentText).toContain('Priya');
    expect(contentText).toContain('Melwin');
  });

  test('Hashtag strip renders the correct repetitions', async ({ page }) => {
    await page.goto('/');
    const hashWords = page.locator('#hashInner .hash-word');
    await expect(hashWords).toHaveCount(16);
    for (let i = 0; i < 16; i++) {
      await expect(hashWords.nth(i)).toHaveText('#MelWinsPriya');
    }
  });

  test('Event cards have floating decorations loaded correctly', async ({ page }) => {
    await page.goto('/');

    // Sangeet Card decos
    const sangeetDecos = page.locator('#card-sangeet .card-deco');
    await expect(sangeetDecos).toHaveCount(4);
    const sangeetSymbols = await sangeetDecos.allTextContents();
    expect(sangeetSymbols).toEqual(['♩', '♪', '♫', '♬']);

    // Haldi Card decos
    const haldiDecos = page.locator('#card-haldi .card-deco');
    await expect(haldiDecos).toHaveCount(4);
    const haldiSymbols = await haldiDecos.allTextContents();
    expect(haldiSymbols).toEqual(['✦', '✧', '⊙', '⋆']);
  });

  test('Custom cursor elements are present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#cRing')).toBeAttached();
    await expect(page.locator('#cDot')).toBeAttached();
  });

  test.describe('Countdown and Journey Progress Bar', () => {

    test('Before Journey Start (2025-12-15)', async ({ page }) => {
      // Mock clock to Dec 15, 2025
      await page.clock.install({ time: new Date('2025-12-15T12:00:00+05:30') });
      await page.goto('/');

      // Progress bar should be 0% since we are before PSTART (2026-01-01)
      const progBar = page.locator('#progBar');
      const style = await progBar.getAttribute('style') || '';
      expect(style.replace(/\s+/g, '')).toContain('width:0%');

      // Countdown should be positive and not 00
      const days = await page.locator('#cd-d').textContent();
      expect(parseInt(days)).toBeGreaterThan(0);
    });

    test('During the Journey (2026-04-01)', async ({ page }) => {
      // Mock clock to Apr 1, 2026
      const mockDate = new Date('2026-04-01T12:00:00+05:30');
      await page.clock.install({ time: mockDate });
      await page.goto('/');

      // Wait for the progress bar timeout (set at 600ms in html script)
      await page.waitForTimeout(800);

      // Target = July 8, 2026. Start = Jan 1, 2026.
      // Expected progress: ((Apr 1 - Jan 1) / (July 8 - Jan 1)) * 100
      const pStart = new Date('2026-01-01').getTime();
      const target = new Date('2026-07-08T13:30:00+05:30').getTime();
      const expectedPct = Math.min(100, Math.max(0, ((mockDate.getTime() - pStart) / (target - pStart)) * 100));

      const progBar = page.locator('#progBar');
      const style = await progBar.getAttribute('style');
      expect(style).toContain('width:');
      
      const match = style.match(/width:\s*([\d.]+)%/);
      expect(match).not.toBeNull();
      const pctValue = parseFloat(match[1]);
      expect(pctValue).toBeCloseTo(expectedPct, 1);

      // Verify countdown matches the calculated difference
      const diff = target - mockDate.getTime();
      const expectedDays = String(Math.floor(diff / 86400000)).padStart(2, '0');
      const expectedHours = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');

      await expect(page.locator('#cd-d')).toHaveText(expectedDays);
      await expect(page.locator('#cd-h')).toHaveText(expectedHours);
    });

    test('After Wedding (2026-07-10)', async ({ page }) => {
      // Mock clock to July 10, 2026 (after target July 8, 2026)
      await page.clock.install({ time: new Date('2026-07-10T12:00:00+05:30') });
      await page.goto('/');

      // Wait for progress bar timeout
      await page.waitForTimeout(800);

      // Progress bar should be 100%
      const progBar = page.locator('#progBar');
      const style = await progBar.getAttribute('style') || '';
      expect(style.replace(/\s+/g, '')).toContain('width:100%');

      // Countdown should display 00
      await expect(page.locator('#cd-d')).toHaveText('00');
      await expect(page.locator('#cd-h')).toHaveText('00');
      await expect(page.locator('#cd-m')).toHaveText('00');
      await expect(page.locator('#cd-s')).toHaveText('00');
    });
  });

  test('Copy Phone Number functionality copies number and updates UI', async ({ page }) => {
    // Install mock clock to control setTimeouts
    await page.clock.install({ time: new Date('2026-04-01T12:00:00+05:30') });
    await page.goto('/');

    // Mock clipboard writeText API
    await page.evaluate(() => {
      window.copiedText = null;
      navigator.clipboard.writeText = async (text) => {
        window.copiedText = text;
        return Promise.resolve();
      };
    });

    const copyBtn = page.locator('#copyBtn');
    await expect(copyBtn).toHaveText(/Copy Number/);

    // Click to copy
    await copyBtn.click();

    // Verify clipboard value
    const copiedText = await page.evaluate(() => window.copiedText);
    expect(copiedText).toBe('+919776986361');

    // Verify button text changed to Copied
    await expect(copyBtn).toHaveText(/Copied!/);

    // Fast forward clock by 2500ms to test reset
    await page.clock.fastForward(2600);

    // Verify button text reset back to Copy Number
    await expect(copyBtn).toHaveText(/Copy Number/);
  });

  test('Click on document spawns click sparkles and removes them', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-04-01T12:00:00+05:30') });
    await page.goto('/');

    // Verify no sparkles initially
    await expect(page.locator('.sparkle')).toHaveCount(0);

    // Click the body
    await page.mouse.click(300, 300);

    // Verify 7 sparkles are spawned (per script: for(let i=0;i<7;i++) spawn sparkle)
    await expect(page.locator('.sparkle')).toHaveCount(7);

    // Fast forward by 850ms (sparkle remove timeout is 820ms in script)
    await page.clock.fastForward(900);

    // Verify sparkles are removed
    await expect(page.locator('.sparkle')).toHaveCount(0);
  });

  test('Card hover 3D tilt effect applies transform styles on fine pointer devices', async ({ page }) => {
    // Activate reducedMotion to eliminate the CSS transition timing race condition.
    // This triggers the C-02 prefers-reduced-motion block (transition:none on .rv-l),
    // ensuring .t-item is at its final layout position before getBoundingClientRect().
    // The JS inline style.transform overrides the media query, so hover tilt still works.
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Mock pointer: fine media query
    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = (query) => {
        if (query.includes('pointer: fine')) {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          };
        }
        return originalMatchMedia(query);
      };
    });

    await page.goto('/');

    const sangeetCard = page.locator('#card-sangeet');
    const parentItem = sangeetCard.locator('..'); // The .t-item

    // Force show class on parent item so it is fully positioned in the layout
    await parentItem.evaluate(el => el.classList.add('show'));
    await parentItem.scrollIntoViewIfNeeded();

    // Initially no inline transform style
    const initialTransform = await sangeetCard.getAttribute('style') || '';
    expect(initialTransform).not.toContain('perspective');

    // Move mouse over parent item to trigger mousemove
    const box = await parentItem.boundingBox();
    expect(box).not.toBeNull();

    // Move mouse to top-left of card
    await page.mouse.move(box.x + 10, box.y + 10);

    // Should now have perspective and rotate styling applied inline
    const activeTransform = await sangeetCard.getAttribute('style') || '';
    expect(activeTransform).toContain('perspective');
    expect(activeTransform).toContain('rotate');

    // Leave the card
    await page.mouse.move(box.x + box.width + 100, box.y + box.height + 100);

    // Inline transform style should be reset (empty or gone)
    const resetTransform = await sangeetCard.getAttribute('style') || '';
    expect(resetTransform).not.toContain('perspective');
  });
});
