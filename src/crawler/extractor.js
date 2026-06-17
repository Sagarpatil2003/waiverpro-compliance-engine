// src/crawler/extractor.js
const { chromium } = require('playwright');
const fs = require('fs');
const logger = require('../utils/logger');

async function runExtractor() {
    logger.info('Launching automated headless browser via Playwright...');
    const browser = await chromium.launch({ headless: false, slowMo: 100 });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    try {
        // 1. Authenticate Engine
        logger.info('Navigating to target web application login node...');
        await page.goto('https://white-cliff-0bca3ed00.1.azurestaticapps.net/', { waitUntil: 'networkidle' });

        // Wait for the page structure to load safely
        await page.waitForLoadState('domcontentloaded');

        logger.info('Injecting authorization credentials...');

        // Using broad text and placeholder matching which works flawlessly across frameworks
        await page.locator('input[placeholder*="Email" i], input[placeholder*="email" i], input[type="email"]').fill('admin@gmail.com');
        await page.locator('input[placeholder*="Password" i], input[placeholder*="password" i], input[type="password"]').fill('password');

        logger.info('Credentials injected. Authorizing session...');

        // Clicks any button that explicitly mentions signing or logging in
        await page.locator('button:has-text("Log in"), button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').click();

        // Wait for the URL to change away from the login screen
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        logger.info('Authorization verified. Redirect successful.');

        // 2. Discover Targets & Core Mapping Matrix
        const routesToVisit = ['/dashboard', '/landing']; // Add any routes discovered dynamically
        const extractedUIElements = [];

        for (const route of routesToVisit) {
            logger.info(`Extracting visual state and tracking DOM elements for: ${route}`);
            // Ensure target route transitions load fully
            try {
                await page.goto(`https://white-cliff-0bca3ed00.1.azurestaticapps.net${route}`, { waitUntil: 'networkidle', timeout: 7000 });
            } catch (e) {
                logger.warn(`Direct routing to ${route} failed or timed out. Attempting click interactions standard...`);
            }

            // Snapshot for evidence records
            const screenshotFilename = `output/screenshots/${route.replace('/', '')}_state.png`;
            await page.screenshot({ path: screenshotFilename, fullPage: true });

            // Gather interactive/informational nodes for matching
            const elements = await page.evaluate((currentRoute) => {
                const items = [];
                // Extract links, buttons, inputs, headers
                document.querySelectorAll('button, a, h1, h2, h3, label, p').forEach((el, index) => {
                    // Generate an explicit structural selector for engineering reproducibility
                    let selector = el.tagName.toLowerCase();
                    if (el.id) selector += `#${el.id}`;
                    if (el.className) selector += `.${el.className.split(' ').join('.')}`;

                    const text = el.innerText || el.textContent || '';
                    if (text.trim().length > 0) {
                        items.push({
                            page_url: currentRoute,
                            component_type: el.tagName.toLowerCase() === 'a' ? 'navigation_item' : el.tagName.toLowerCase(),
                            component_selector: `${selector} >> nth=${index}`,
                            actual_text_content: text.replace(/\n/g, ' ').trim(),
                            retrieved_at: new Date().toISOString()
                        });
                    }
                });
                return items;
            }, route);

            // Map corresponding screenshot references directly to elements
            elements.forEach(item => {
                item.screenshot_path = screenshotFilename;
                extractedUIElements.push(item);
            });
        }

        fs.writeFileSync('./data/raw_ui.json', JSON.stringify(extractedUIElements, null, 2));
        logger.info('UI matrix successfully saved to ./data/raw_ui.json');

    } catch (error) {
        logger.error(`Critical error during browser extraction phase: ${error.stack}`);
    } finally {
        await browser.close();
        logger.info('Browser context closed successfully.');
    }
}

module.exports = runExtractor;