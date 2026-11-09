const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const root = path.resolve(__dirname, '../public');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (error, bytes) => {
      res.writeHead(error ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(error ? '' : bytes);
    });
  });
  server.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const path of ['/index.html', '/course-ledger.html']) {
      const context = await browser.newContext({ viewport: { width: 375, height: 800 } });
      await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
      await context.addInitScript(() => {
        window.calls = []; window.rejectConnection = true;
        const handlers = {};
        window.ethereum = {
          request: async ({ method }) => {
            window.calls.push(method);
            if (method === 'eth_requestAccounts') {
              if (window.rejectConnection) throw Error('Rejected');
              return ['0x1111111111111111111111111111111111111111'];
            }
            if (method === 'eth_chainId') return '0x89';
            if (method === 'eth_getCode') return '0x1234';
            throw Error(method);
          },
          on: (name, fn) => { handlers[name] = fn; },
          removeListener: name => { delete handlers[name]; }
        };
        window.emitWallet = (name, value) => handlers[name]?.(value);
        window.ethers = {
          providers: { Web3Provider: class { getSigner() { return {}; } } },
          Contract: class {
            constructor(address) { this.address = address; }
            async owner() { return '0x1111111111111111111111111111111111111111'; }
            async producer() { return '0x2222222222222222222222222222222222222222'; }
            async queryFilter() { return []; }
            on() {}
            removeAllListeners() {}
          }
        };
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}${path}`);
      const wallet = page.locator('decent-header wallet-connect #connect');
      await wallet.waitFor();
      assert.deepEqual(await page.evaluate(() => window.calls), []);
      await wallet.click();
      await page.locator('decent-header wallet-connect #status').getByText('Rejected').waitFor();
      await page.evaluate(() => { window.rejectConnection = false; });
      await wallet.click();
      await page.waitForFunction(() => window.DecentHead.getWallet().snapshot().connected);
      if (path === '/index.html') {
        await page.locator('#walletConnectBtn').click();
        await page.waitForFunction(() => !document.getElementById('signingBonusBtn').disabled);
        assert.equal((await page.evaluate(() => window.calls)).filter(method => method === 'eth_requestAccounts').length, 2);
      }
      if (path === '/course-ledger.html') {
        await page.locator('#chain-opt-in').check();
        await page.locator('#chain-role').selectOption('facilitator');
        await page.locator('#chain-id').fill('137');
        await page.locator('#chain-address').fill('0x5555555555555555555555555555555555555555');
        await page.locator('#chain-check-button').click();
        await page.locator('#chain-check-status').getByText('course evidence cannot be submitted', { exact: false }).waitFor();
        const calls = await page.evaluate(() => window.calls);
        assert.equal(calls.filter(method => method === 'eth_requestAccounts').length, 2);
        assert.ok(!calls.some(method => /send|sign/i.test(method)));
      }
      await page.evaluate(() => window.emitWallet('accountsChanged', ['0x2222222222222222222222222222222222222222']));
      assert.match(await page.evaluate(() => window.DecentHead.getWallet().snapshot().address), /2222/);
      if (path === '/index.html') assert.equal(await page.locator('#signingBonusBtn').isDisabled(), true);
      await page.evaluate(() => window.emitWallet('chainChanged', '0x1'));
      assert.equal(await page.evaluate(() => window.DecentHead.getWallet().snapshot().chainId), '0x1');
      await wallet.click();
      assert.equal(await page.evaluate(() => window.DecentHead.getWallet().snapshot().connected), false);
      await page.locator('decent-header ipfs-controls #open').click();
      await page.locator('decent-header ipfs-controls #backup-status').getByText('unavailable').waitFor();
      await page.locator('decent-header ipfs-controls #provider-settings > summary').click();
      await page.locator('decent-header ipfs-controls #provider').selectOption('local');
      await page.locator('decent-header ipfs-controls #save-provider').click();
      assert.match(await page.locator('decent-header ipfs-controls #provider-message').textContent(), /not yet verified/);
      await page.keyboard.press('Escape');
      await page.locator('decent-header app-title button').click();
      await page.locator('decent-header about-modal dialog').waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      const bounds = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => `${el.tagName}.${el.className}`) }));
      assert.ok(bounds.scroll <= bounds.width, `${path}: ${JSON.stringify(bounds)}`);
      assert.deepEqual(errors, []);
      console.log(`${path}: wallet, IPFS, About and 375px passed`);
      await context.close();
    }
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
