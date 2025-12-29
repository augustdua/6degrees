const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const slides = [
    '01-title.html',
    '02-problem.html',
    'why-now.html',
    '03-solution.html',
    '04-platform.html',
    '05-verification.html',
    '06-social-score.html',
    '07-identity.html',
    '08-tech-moat-1.html',
    '09-tech-moat-2.html',
    '10-tech-moat-3.html',
    '11-competitive-landscape.html',
    '12-business-model.html',
    'roadmap.html',
    '13-cta.html',
    '14-thank-you.html'
];

async function exportSlides() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set viewport to exact slide dimensions
    await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
    });

    // Create output directory
    const outputDir = path.join(__dirname, 'png-exports');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    for (let i = 0; i < slides.length; i++) {
        const slideFile = slides[i];
        const slidePath = path.join(__dirname, slideFile);
        const outputPath = path.join(outputDir, slideFile.replace('.html', '.png'));

        console.log(`Exporting ${slideFile}...`);

        if (fs.existsSync(slidePath)) {
            // Navigate to the HTML file
            await page.goto(`file://${slidePath}`, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Wait for fonts to load
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Take screenshot
            await page.screenshot({
                path: outputPath,
                type: 'png',
                clip: {
                    x: 0,
                    y: 0,
                    width: 1920,
                    height: 1080
                }
            });

            console.log(`  ✓ Saved: ${outputPath}`);
        } else {
             console.log(`  x File not found: ${slidePath}`);
        }
    }

    await browser.close();
    console.log('\n✅ All slides exported to png-exports folder!');
}

exportSlides().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
