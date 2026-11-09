import assert from "node:assert/strict";

const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const { chromium } = await import(playwrightModule);
const target = process.env.COURSE_LEDGER_URL || "http://127.0.0.1:4315/course-ledger.html";
const targetOrigin = new URL(target).origin;
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  const externalRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== targetOrigin) externalRequests.push(request.url());
  });
  await page.addInitScript(() => {
    window.__providerCalls = [];
    window.ethereum = {
      request: async ({ method }) => {
        window.__providerCalls.push(method);
        throw new Error("The no-wallet browser test must not make provider calls.");
      },
    };
  });

  await page.goto(target);
  const checkResponsive = async (label) => {
    const measurements = await page.evaluate(() => {
      const offenders = [...document.querySelectorAll("body *")]
        .map((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            id: element.id,
            tag: element.tagName,
            right: Math.round(bounds.right),
            parentRight: element.parentElement
              ? Math.round(element.parentElement.getBoundingClientRect().right)
              : null,
            width: Math.round(bounds.width),
          };
        })
        .filter((element) => element.right > innerWidth + 1);
      return {
        viewport: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        offenders,
      };
    });
    assert.equal(measurements.viewport, 375, `${label}: expected a 375 CSS-pixel viewport`);
    assert.ok(
      measurements.documentWidth <= measurements.viewport,
      `${label}: horizontal overflow ${JSON.stringify(measurements)}`,
    );
    assert.deepEqual(measurements.offenders, [], `${label}: controls extend beyond the viewport`);
  };

  const storageIsEmpty = async () => page.evaluate(async () => ({
    localStorage: Object.keys(localStorage),
    sessionStorage: Object.keys(sessionStorage),
    indexedDB: indexedDB.databases
      ? (await indexedDB.databases()).map((database) => database.name)
      : [],
  }));
  const noPersistence = async (label) => {
    const storage = await storageIsEmpty();
    assert.deepEqual(storage, { localStorage: [], sessionStorage: [], indexedDB: [] }, label);
  };

  await checkResponsive("initial page and preflight controls");
  await page.locator("#chain-check-button").click();
  await assertStatusIncludes(page, "Opted out");
  await checkResponsive("opted-out preflight");
  await noPersistence("opt-out must not persist activity");

  await page.locator("#chain-opt-in").check();
  await page.locator("#chain-check-button").click();
  await assertStatusIncludes(page, "provide a valid expected chain ID");
  await checkResponsive("missing-config preflight");
  await noPersistence("missing configuration must not persist activity");

  const providerCalls = await page.evaluate(() => window.__providerCalls);
  assert.deepEqual(providerCalls, [], "opt-out and missing configuration must make zero wallet/RPC calls");

  await page.locator("#chain-opt-in").uncheck();
  await page.locator("#role-select").selectOption("learner");
  await page.locator("#learner-week").selectOption("2");
  await page.getByRole("button", { name: "Add local checkpoint" }).click();
  await page.locator("#role-select").selectOption("facilitator");
  await page.locator("#session-week").selectOption("3");
  await page.locator("#attendee-count").fill("4");
  await page.getByRole("button", { name: "Add simulated session" }).click();
  await checkResponsive("local learner and facilitator entries");
  await noPersistence("synthetic activity must stay in memory only");
  await page.reload();
  await checkResponsive("page after refresh");
  await assertStatusIncludes(page, "No local records");
  await noPersistence("refresh must not reveal persisted records");
  assert.deepEqual(await page.evaluate(() => window.__providerCalls), []);
  assert.deepEqual(externalRequests, [], "the rehearsal must not make external network requests");
  await context.close();
  console.log("PASS: Sandbox ledger is responsive at 375px; opt-out/missing config use zero RPC calls; rehearsal records are not persisted.");
} finally {
  await browser.close();
}

async function assertStatusIncludes(page, text) {
  await page.waitForFunction(
    (expected) => document.querySelector("#chain-check-status")?.textContent.includes(expected)
      || document.querySelector("#action-status")?.textContent.includes(expected)
      || document.querySelector("#timeline")?.textContent.includes(expected),
    text,
  );
  const statusText = await page.locator("#chain-check-status").innerText();
  const actionText = await page.locator("#action-status").innerText();
  const timelineText = await page.locator("#timeline").innerText();
  assert.ok(
    statusText.includes(text) || actionText.includes(text) || timelineText.includes(text),
    `expected status containing: ${text}`,
  );
}
