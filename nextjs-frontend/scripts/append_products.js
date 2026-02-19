const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

const file = path.resolve('public/Product_Bulk-UPLOAD-updated.xlsx');
const cols = ['Product Name','Product Description','Categories (comma)','Tags (comma)','Variant SKU','Variant Name','Variant Description','Regular Price','Sale Price','HSN','Weight','B2C Regular Price','B2C Sale Price','B2B Regular Price','B2B Sale Price','ENTERPRISE Regular Price','ENTERPRISE Sale Price','Variant SEO Title','Variant SEO Description','Variant SEO Slug','IdealFor','KeyBenefits','Tax Name','Tax Percentage','Variant Options (name:value | separated)'];

if (!fs.existsSync(file)) {
  console.error('Template not found:', file);
  process.exit(1);
}

const wb = xlsx.readFile(file);
const sheetName = wb.SheetNames[0] || 'Products';
let ws = wb.Sheets[sheetName];
let aoa = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
if (aoa.length === 0) aoa = [cols];

const hdr = aoa[0];
const makeRow = (obj) => hdr.map(h => (obj[h] !== undefined ? obj[h] : ''));

const rows = [
  {
    'Product Name':'BPC-157',
    'Product Description':'Repair. Restore. Resilience. BPC-157 accelerates tissue repair and recovery.',
    'Categories (comma)':'Peptides',
    'Tags (comma)':'bpc-157, recovery, healing',
    'Variant SKU':'BPC-157-5MG',
    'Variant Name':'5mg Vial',
    'Variant Description':'Research peptide vial 5mg',
    'Regular Price':99.90,
    'Sale Price':95.89,
    'HSN':'3004',
    'Weight':5,
    'B2C Regular Price':99.90,
    'B2C Sale Price':95.89,
    'B2B Regular Price':95.00,
    'B2B Sale Price':92.00,
    'ENTERPRISE Regular Price':92.00,
    'ENTERPRISE Sale Price':89.00,
    'Variant SEO Title':'BPC-157 5mg',
    'Variant SEO Description':'Physician Directed BPC-157 5mg',
    'Variant SEO Slug':'bpc-157-5mg',
    'IdealFor':'- Accelerated injury recovery\n- Gut and digestive repair\n- Joint health and pain management',
    'KeyBenefits':'- Heals muscles, tendons, and ligaments\n- Reduces inflammation and pain\n- Repairs intestinal lining\n- Supports nerve regeneration and blood flow',
    'Tax Name':'GST',
    'Tax Percentage':18,
    'Variant Options (name:value | separated)':'Size:5mg'
  },
  {
    'Product Name':'Collagen Peptide Blend',
    'Product Description':'Premium collagen peptides for skin and joint health.',
    'Categories (comma)':'Peptides',
    'Tags (comma)':'collagen, skin, joints',
    'Variant SKU':'COL-B-50G',
    'Variant Name':'50g Powder',
    'Variant Description':'50g collagen peptide powder',
    'Regular Price':45.99,
    'Sale Price':39.99,
    'HSN':'3004',
    'Weight':50,
    'B2C Regular Price':45.99,
    'B2C Sale Price':39.99,
    'B2B Regular Price':42.00,
    'B2B Sale Price':37.00,
    'ENTERPRISE Regular Price':40.00,
    'ENTERPRISE Sale Price':35.00,
    'Variant SEO Title':'Collagen Peptide Blend 50g',
    'Variant SEO Description':'High-quality collagen peptides 50g',
    'Variant SEO Slug':'collagen-peptide-blend-50g',
    'IdealFor':'- Skin elasticity\n- Joint support',
    'KeyBenefits':'- Supports skin health\n- Aids joint comfort',
    'Tax Name':'GST',
    'Tax Percentage':18,
    'Variant Options (name:value | separated)':'Size:50g'
  },
  {
    'Product Name':'Peptide Complex A',
    'Product Description':'Advanced peptide complex for muscle recovery and growth.',
    'Categories (comma)':'Peptides',
    'Tags (comma)':'complex-a, muscle, recovery',
    'Variant SKU':'PEP-A-30ML',
    'Variant Name':'30ml Bottle',
    'Variant Description':'30ml peptide complex A liquid',
    'Regular Price':69.99,
    'Sale Price':59.99,
    'HSN':'3004',
    'Weight':30,
    'B2C Regular Price':69.99,
    'B2C Sale Price':59.99,
    'B2B Regular Price':65.00,
    'B2B Sale Price':58.00,
    'ENTERPRISE Regular Price':62.00,
    'ENTERPRISE Sale Price':55.00,
    'Variant SEO Title':'Peptide Complex A 30ml',
    'Variant SEO Description':'Peptide Complex A liquid 30ml',
    'Variant SEO Slug':'peptide-complex-a-30ml',
    'IdealFor':'- Muscle recovery\n- Training support',
    'KeyBenefits':'- Enhances recovery\n- Supports performance',
    'Tax Name':'GST',
    'Tax Percentage':18,
    'Variant Options (name:value | separated)':'Size:30ml|Form:Liquid'
  }
];

rows.forEach(r => aoa.push(makeRow(r)));
const newWs = xlsx.utils.aoa_to_sheet(aoa);
wb.Sheets[sheetName] = newWs;
xlsx.writeFile(wb, file);
console.log('Appended', rows.length, 'rows to', file);
