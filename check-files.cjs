#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('=== Checking component files ===');
console.log('CWD:', process.cwd());

const componentsDir = path.join(process.cwd(), 'components');
console.log('\nComponents directory exists:', fs.existsSync(componentsDir));

if (fs.existsSync(componentsDir)) {
  const files = fs.readdirSync(componentsDir);
  console.log('\nFiles in components/:');
  files.forEach(f => {
    const fullPath = path.join(componentsDir, f);
    const stats = fs.statSync(fullPath);
    console.log(`  ${stats.isDirectory() ? '[DIR]' : '[FILE]'} ${f}`);
  });
}

const chartPath = path.join(componentsDir, 'Chart.tsx');
const transformPath = path.join(componentsDir, 'TransformControls.tsx');

console.log('\nChart.tsx exists:', fs.existsSync(chartPath));
console.log('TransformControls.tsx exists:', fs.existsSync(transformPath));

if (fs.existsSync(chartPath)) {
  const content = fs.readFileSync(chartPath, 'utf8');
  console.log('\nChart.tsx first 100 chars:');
  console.log(content.substring(0, 100));
}
