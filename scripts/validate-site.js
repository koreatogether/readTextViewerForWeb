#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
let ok = true;

for (const file of ["index.html", "main.js", "style-enhanced.css", "style.css", "sample-test.txt"]) {
    const rootPath = path.join(root, file);
    if (!fs.existsSync(rootPath)) {
        console.error(`Missing root file: ${file}`);
        ok = false;
    }
}

const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (!/readTextViewer v3/.test(indexHtml)) {
    console.error("index.html does not advertise readTextViewer v3.");
    ok = false;
}

if (!ok) process.exit(1);
console.log("Site validation passed: root v3 files are present and valid.");
