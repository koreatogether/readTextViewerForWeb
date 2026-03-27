#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = process.cwd();
const mirroredFiles = ["index.html", "main.js", "style-enhanced.css", "style.css", "sample-test.txt"];
const mirrorDirs = ["docs", "forWebView_03"];
let ok = true;

function hashFile(filePath) {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

for (const file of mirroredFiles) {
    const rootPath = path.join(root, file);
    if (!fs.existsSync(rootPath)) {
        console.error(`Missing root file: ${file}`);
        ok = false;
        continue;
    }

    const rootHash = hashFile(rootPath);
    for (const dir of mirrorDirs) {
        const mirrorPath = path.join(root, dir, file);
        if (!fs.existsSync(mirrorPath)) {
            console.error(`Missing mirrored file: ${dir}/${file}`);
            ok = false;
            continue;
        }

        const mirrorHash = hashFile(mirrorPath);
        if (rootHash !== mirrorHash) {
            console.error(`Mismatch: ${file} differs between root and ${dir}/`);
            ok = false;
        }
    }
}

const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (!/readTextViewer v3/.test(indexHtml)) {
    console.error("index.html does not advertise readTextViewer v3.");
    ok = false;
}

if (!ok) process.exit(1);
console.log("Site validation passed: root, docs, and forWebView_03 are aligned.");
