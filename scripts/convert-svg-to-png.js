// SVGをPNGに変換するスクリプト
const fs = require('fs');
const path = require('path');

// SVGファイルのパス
const svgFiles = [
  'grass.svg',
  'water.svg',
  'rock.svg',
  'tree.svg',
  'swamp.svg',
  'mountain.svg'
];

const terrainDir = path.join(__dirname, '../public/images/terrain');

// 各SVGファイルをBase64エンコードされたPNGデータに変換
// 実際の変換にはsharpやcanvasライブラリが必要ですが、
// ここではSVGをそのまま使用できるようにコードを変更する方が簡単です
console.log('SVG files are ready. The code will be updated to use SVG files directly.');

