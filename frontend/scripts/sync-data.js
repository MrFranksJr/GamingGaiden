const fs = require('fs');
const path = require('path');

const dataJsonPath = path.resolve(__dirname, '../resources/data.json');
const dataJsPath = path.resolve(__dirname, '../resources/data.js');

if (fs.existsSync(dataJsonPath)) {
    // The exporter (Windows) may prepend a UTF-8 BOM to data.json. Left in place
    // it corrupts the generated data.js (a stray BOM lands mid-expression, e.g.
    // `window.gamingGaidenData = \uFEFF{...`) and breaks JSON.parse in consumers.
    // Strip any leading BOM so the generated bundle is always clean.
    const jsonContent = fs.readFileSync(dataJsonPath, 'utf8').replace(/^\uFEFF/, '');
    fs.writeFileSync(dataJsPath, `window.gamingGaidenData = ${jsonContent};\n`, 'utf8');
    console.log('Successfully synced frontend/resources/data.js from data.json');
}
