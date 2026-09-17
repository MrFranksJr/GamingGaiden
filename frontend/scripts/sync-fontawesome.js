const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../node_modules/@fortawesome/fontawesome-free');
const destDir = path.resolve(__dirname, '../resources/fontawesome');

if (fs.existsSync(srcDir)) {
    const cssSrc = path.join(srcDir, 'css', 'all.min.css');
    const cssDest = path.join(destDir, 'css', 'all.min.css');
    const webfontsSrc = path.join(srcDir, 'webfonts');
    const webfontsDest = path.join(destDir, 'webfonts');

    fs.mkdirSync(path.join(destDir, 'css'), {recursive: true});
    fs.mkdirSync(webfontsDest, {recursive: true});

    if (fs.existsSync(cssSrc)) {
        fs.copyFileSync(cssSrc, cssDest);
    }
    if (fs.existsSync(webfontsSrc)) {
        fs.cpSync(webfontsSrc, webfontsDest, {recursive: true});
    }
    console.log('Successfully synced Font Awesome assets to frontend/resources/fontawesome');
} else {
    console.warn('Font Awesome node_modules not found. Skipping asset copy.');
}
