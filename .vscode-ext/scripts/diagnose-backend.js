#!/usr/bin/env node

/**
 * Diagnostic Test for Backend Script Execution
 * Tests if the backend script can be executed from the extension context
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('='.repeat(70));
console.log('BACKEND SCRIPT DIAGNOSTIC TEST');
console.log('='.repeat(70));

// 1. Test Node.js executable resolution
console.log('\n1️⃣ Testing Node.js executable resolution:');
try {
  const nodePath = execSync('where.exe node', { encoding: 'utf8' }).trim();
  console.log(`   ✓ Found Node.js at: ${nodePath}`);
  console.log(`   ✓ File exists: ${fs.existsSync(nodePath)}`);
} catch (error) {
  console.log(`   ✗ Error: ${error.message}`);
  process.exit(1);
}

// 2. Test backend script path resolution
console.log('\n2️⃣ Testing backend script path resolution:');
const extensionDir = __dirname;
const backendPath = path.resolve(extensionDir, '..', '.github', 'skills', 'ai-change-impact-analysis');
const scriptPath = path.join(backendPath, 'scripts', 'change-impact-agent.cjs');

console.log(`   Extension dir: ${extensionDir}`);
console.log(`   Backend path: ${backendPath}`);
console.log(`   Script path: ${scriptPath}`);
console.log(`   Script exists: ${fs.existsSync(scriptPath)}`);

if (!fs.existsSync(scriptPath)) {
  console.log(`   ✗ Script not found at: ${scriptPath}`);
  
  // Try to find where it actually is
  console.log('\n   Searching for change-impact-agent.cjs...');
  try {
    const result = execSync('dir /s /b change-impact-agent.cjs', { 
      cwd: 'C:\\Users\\harbansal\\Documents\\Projects\\remedition skill',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log('   Found at:');
    console.log(result);
  } catch (e) {
    console.log('   ✗ Could not find script');
  }
  process.exit(1);
}

// 3. Test spawning the script
console.log('\n3️⃣ Testing script spawning:');
try {
  const nodePath = execSync('where.exe node', { encoding: 'utf8' }).trim();
  
  console.log(`   Attempting to spawn: ${nodePath} ${scriptPath} --help`);
  
  const process = spawn(nodePath, [scriptPath, '--help'], {
    cwd: backendPath,
    stdio: 'pipe',
    shell: false
  });

  let stdout = '';
  let stderr = '';

  process.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  process.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  process.on('close', (code) => {
    if (code === 0) {
      console.log('   ✓ Script executed successfully');
      console.log('\n   Output:');
      console.log(stdout.substring(0, 500)); // First 500 chars
    } else {
      console.log(`   ✗ Script exited with code ${code}`);
      if (stderr) console.log(`   stderr: ${stderr.substring(0, 500)}`);
    }
  });

  process.on('error', (error) => {
    console.log(`   ✗ Error spawning process: ${error.message}`);
    if (error.code === 'ENOENT') {
      console.log('   This means: File not found or not executable');
    }
  });

} catch (error) {
  console.log(`   ✗ Error: ${error.message}`);
}

console.log('\n' + '='.repeat(70));
