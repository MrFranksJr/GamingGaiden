const fs = require('fs');
const path = require('path');

const dataJsonPath = path.resolve(__dirname, '../resources/data.json');
const dataJsPath = path.resolve(__dirname, '../resources/data.js');

if (fs.existsSync(dataJsonPath)) {
    const jsonContent = fs.readFileSync(dataJsonPath, 'utf8');
    fs.writeFileSync(dataJsPath, `window.gamingGaidenData = ${jsonContent};\n`, 'utf8');
    console.log('Successfully synced frontend/resources/data.js from data.json');
}
