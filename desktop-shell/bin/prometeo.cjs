#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const appDir = path.resolve(__dirname, '..');
const forwardedArgs = process.argv.slice(2);

let electronBinary;
try {
    electronBinary = require('electron');
} catch (error) {
    console.error('Cannot resolve Electron runtime. Reinstall @prometeo/desktop-shell.');
    console.error(error?.message || String(error));
    process.exit(1);
}

const electronArgs = [];
if (process.platform === 'linux' && typeof process.getuid === 'function' && process.getuid() === 0) {
    electronArgs.push('--no-sandbox');
}
electronArgs.push(appDir, ...forwardedArgs);

const child = spawn(electronBinary, electronArgs, {
    stdio: 'inherit',
});

child.on('exit', code => process.exit(code));
