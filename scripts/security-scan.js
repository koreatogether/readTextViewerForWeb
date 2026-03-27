#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function listFilesRecursive(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === ".git") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            listFilesRecursive(full, out);
        } else if (entry.isFile()) {
            out.push(path.relative(process.cwd(), full));
        }
    }
    return out;
}

const trackedFiles = listFilesRecursive(process.cwd());

const scanableExts = new Set([
    ".js", ".html", ".css", ".md", ".txt", ".json", ".yml", ".yaml", ".toml", ".gitignore"
]);

const patterns = [
    { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9_]{36,255}\b/g },
    { name: "GitHub fine-grained token", re: /\bgithub_pat_[A-Za-z0-9_]{20,255}\b/g },
    { name: "OpenAI API key", re: /\bsk-(?:proj-|user-)?[A-Za-z0-9]{20,}\b/g },
    { name: "AWS access key ID", re: /\bAKIA[0-9A-Z]{16}\b/g },
    { name: "Google API key", re: /\bAIza[0-9A-Za-z\-_]{35}\b/g },
    { name: "Slack token", re: /\bxox[baprs]-[0-9A-Za-z-]{10,48}\b/g },
    { name: "Private key block", re: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/g },
    { name: "Email address", re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
    { name: "Korean resident ID", re: /\b\d{6}-\d{7}\b/g },
    { name: "Phone number", re: /\b(?:\+?82[-\s]?)?0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}\b/g }
];

let failure = false;
const findings = [];

for (const rel of trackedFiles) {
    const ext = path.extname(rel).toLowerCase();
    if (!scanableExts.has(ext) && !rel.endsWith(".gitignore")) continue;

    let text;
    try {
        text = fs.readFileSync(rel, "utf8");
    } catch {
        continue;
    }

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { name, re } of patterns) {
            re.lastIndex = 0;
            if (!re.test(line)) continue;
            findings.push(`${rel}:${i + 1} ${name}`);
            failure = true;
        }
    }
}

if (findings.length) {
    console.error("Sensitive content scan failed:");
    for (const item of findings.slice(0, 100)) {
        console.error(`- ${item}`);
    }
    process.exit(1);
}

console.log(`Sensitive content scan passed (${trackedFiles.length} tracked files checked).`);
