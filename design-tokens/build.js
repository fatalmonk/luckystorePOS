const StyleDictionary = require('style-dictionary');
const fs = require('fs');
const path = require('path');

const config = {
  source: ['tokens.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables',
        options: {
          outputReferences: true,
        },
      }],
    },
    js: {
      transformGroup: 'js',
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.js',
        format: 'javascript/es6',
      }],
    },
    json: {
      transformGroup: 'web',
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.json',
        format: 'json/nested',
      }],
    },
  },
};

// Custom format: CSS with :root wrapper
StyleDictionary.registerFormat({
  name: 'css/variables',
  formatter: function({ dictionary }) {
    const vars = dictionary.allProperties.map(p => `  --${p.name}: ${p.value};`).join('\n');
    return `:root {\n${vars}\n}\n`;
  },
});

// Custom format: JS ES6 exports
StyleDictionary.registerFormat({
  name: 'javascript/es6',
  formatter: function({ dictionary }) {
    const exports = dictionary.allProperties.map(p => `export const ${p.name.replace(/-/g, '_')} = '${p.value}';`).join('\n');
    return exports + '\n';
  },
});

const sd = StyleDictionary.extend(config);
sd.buildAllPlatforms();

console.log('Design tokens built successfully to dist/');
