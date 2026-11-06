import { test, expect, holdSamples, openApp, sounds } from './fixtures';

// These drive the real audio engine in a real browser. Browsers keep audio suspended
// until a real click, and suspended audio's clock stands still, which hides timing
// bugs. So start it from a click, as the app does.
async function openEngine(page: import('@playwright/test').Page) {
  await openApp(page);
  await page.evaluate(async () => {
    const { audioEngine } = await import('/src/audioEngine.ts');
    const button = document.createElement('button');
    button.id = 'start-audio';
    button.style.cssText = 'position:fixed;top:0;left:0;z-index:99999';
    button.textContent = 'start audio';
    button.onclick = () => audioEngine.initialize().then(() => (button.dataset.running = 'yes'));
    document.body.append(button);
  });
  await page.click('#start-audio');
  await page.waitForSelector('#start-audio[data-running=yes]', { state: 'attached' });
}

for (const instrument of ['piano', 'guitar', 'violin', 'cello']) {
  test(`${instrument} still makes sound while its samples download`, async ({ page }) => {
    await holdSamples(page);
    await openEngine(page);
    await page.evaluate(async (type) => {
      const { audioEngine } = await import('/src/audioEngine.ts');
      audioEngine.setSynthType(type);
      await audioEngine.playNote('D#5', 0.1);
    }, instrument);
    await expect.poll(async () => (await sounds(page)).synth).toBeGreaterThan(0);
  });
}

test('the real instrument takes over once its samples arrive', async ({ page }) => {
  await openEngine(page);
  await page.evaluate(async () => {
    const { audioEngine } = await import('/src/audioEngine.ts');
    audioEngine.setSynthType('guitar');
  });
  await expect
    .poll(async () => {
      await page.evaluate(async () => {
        const { audioEngine } = await import('/src/audioEngine.ts');
        await audioEngine.playNote('C4', 0.05);
      });
      return (await sounds(page)).sample;
    })
    .toBeGreaterThan(0);
});

test('a failed sample download leaves the synth playing', async ({ page }) => {
  await page.route(/\.mp3$/, (route) => route.abort());
  await openEngine(page);
  await page.evaluate(async () => {
    const { audioEngine } = await import('/src/audioEngine.ts');
    audioEngine.setSynthType('violin');
    await audioEngine.playSequence(['C4', 'E4'], 0.05, 0.01);
  });
  await expect.poll(async () => (await sounds(page)).synth).toBeGreaterThan(0);
});

test('stopping works while samples download', async ({ page }) => {
  await holdSamples(page);
  await openEngine(page);
  await page.evaluate(async () => {
    const { audioEngine } = await import('/src/audioEngine.ts');
    audioEngine.setSynthType('guitar');
    await audioEngine.playNote('C4', 1);
    audioEngine.stopAll();
  });
});

// Tone only throws if the replay lands in a gap between notes, so try many moments.
test('replaying a rhythm mid-pattern starts it again', async ({ page }) => {
  await openEngine(page);
  await page.evaluate(async () => {
    const { audioEngine } = await import('/src/audioEngine.ts');
    const beats = [0, 0.5, 1, 1.5, 2, 2.5, 3];
    for (const wait of [130, 170, 210, 250, 290, 330, 370, 410]) {
      await audioEngine.playRhythmOnsets(beats, 100, [0]);
      await new Promise((r) => setTimeout(r, wait));
    }
  });
});
