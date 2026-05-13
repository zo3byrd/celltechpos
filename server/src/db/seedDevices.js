require('dotenv').config();
const { sequelize } = require('./index');
require('./models');
const { InventoryItem, Store } = require('./models');

// Images per device family (clean product shots, no watermarks)
const IMG = {
  IP_OLD:    'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=300&h=300&fit=crop&q=80&auto=format', // iPhone 6-8 era
  IP_X:      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop&q=80&auto=format', // iPhone X/XS
  IP_11:     'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=300&h=300&fit=crop&q=80&auto=format', // iPhone 11
  IP_12_13:  'https://images.unsplash.com/photo-1632654027219-3a84edea79c6?w=300&h=300&fit=crop&q=80&auto=format', // iPhone 12/13
  IP_14_16:  'https://images.unsplash.com/photo-1592286927505-1def25115558?w=300&h=300&fit=crop&q=80&auto=format', // iPhone 14+
  SS_S:      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=300&h=300&fit=crop&q=80&auto=format', // Samsung Galaxy S
  SS_A:      'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=300&h=300&fit=crop&q=80&auto=format', // Samsung Galaxy A
  SS_NOTE:   'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=300&h=300&fit=crop&q=80&auto=format', // Samsung Note
  SS_FOLD:   'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=300&h=300&fit=crop&q=80&auto=format', // Galaxy Z Fold
  SS_FLIP:   'https://images.unsplash.com/photo-1659072200474-5b59d3ab5d80?w=300&h=300&fit=crop&q=80&auto=format', // Galaxy Z Flip
};

// [sku, name, brand, modelCompatibility, cost, price, imageKey]
const DEVICES = [
  // ── iPhone SE ─────────────────────────────────────────────────────────────
  ['DEV-IPSE1',    'iPhone SE (1st Gen) 64GB',    'Apple', 'iPhone SE 1st Gen',  30,  80,  'IP_OLD'],
  ['DEV-IPSE2-64', 'iPhone SE (2nd Gen) 64GB',    'Apple', 'iPhone SE 2nd Gen',  80, 180,  'IP_OLD'],
  ['DEV-IPSE2-128','iPhone SE (2nd Gen) 128GB',   'Apple', 'iPhone SE 2nd Gen',  95, 210,  'IP_OLD'],
  ['DEV-IPSE3-64', 'iPhone SE (3rd Gen) 64GB',    'Apple', 'iPhone SE 3rd Gen', 120, 249,  'IP_OLD'],
  ['DEV-IPSE3-128','iPhone SE (3rd Gen) 128GB',   'Apple', 'iPhone SE 3rd Gen', 135, 279,  'IP_OLD'],

  // ── iPhone 6 / 6 Plus ────────────────────────────────────────────────────
  ['DEV-IP6-16',   'iPhone 6 16GB',               'Apple', 'iPhone 6',          20,  50,  'IP_OLD'],
  ['DEV-IP6-64',   'iPhone 6 64GB',               'Apple', 'iPhone 6',          25,  60,  'IP_OLD'],
  ['DEV-IP6-128',  'iPhone 6 128GB',              'Apple', 'iPhone 6',          30,  70,  'IP_OLD'],
  ['DEV-IP6P-16',  'iPhone 6 Plus 16GB',          'Apple', 'iPhone 6 Plus',     25,  60,  'IP_OLD'],
  ['DEV-IP6P-64',  'iPhone 6 Plus 64GB',          'Apple', 'iPhone 6 Plus',     30,  70,  'IP_OLD'],
  ['DEV-IP6P-128', 'iPhone 6 Plus 128GB',         'Apple', 'iPhone 6 Plus',     35,  80,  'IP_OLD'],

  // ── iPhone 6s / 6s Plus ──────────────────────────────────────────────────
  ['DEV-IP6S-32',  'iPhone 6s 32GB',              'Apple', 'iPhone 6s',         30,  70,  'IP_OLD'],
  ['DEV-IP6S-64',  'iPhone 6s 64GB',              'Apple', 'iPhone 6s',         35,  80,  'IP_OLD'],
  ['DEV-IP6S-128', 'iPhone 6s 128GB',             'Apple', 'iPhone 6s',         40,  90,  'IP_OLD'],
  ['DEV-IP6SP-32', 'iPhone 6s Plus 32GB',         'Apple', 'iPhone 6s Plus',    35,  80,  'IP_OLD'],
  ['DEV-IP6SP-64', 'iPhone 6s Plus 64GB',         'Apple', 'iPhone 6s Plus',    40,  90,  'IP_OLD'],
  ['DEV-IP6SP-128','iPhone 6s Plus 128GB',        'Apple', 'iPhone 6s Plus',    45, 100,  'IP_OLD'],

  // ── iPhone 7 / 7 Plus ────────────────────────────────────────────────────
  ['DEV-IP7-32',   'iPhone 7 32GB',               'Apple', 'iPhone 7',          50, 110,  'IP_OLD'],
  ['DEV-IP7-128',  'iPhone 7 128GB',              'Apple', 'iPhone 7',          60, 130,  'IP_OLD'],
  ['DEV-IP7-256',  'iPhone 7 256GB',              'Apple', 'iPhone 7',          70, 150,  'IP_OLD'],
  ['DEV-IP7P-32',  'iPhone 7 Plus 32GB',          'Apple', 'iPhone 7 Plus',     60, 130,  'IP_OLD'],
  ['DEV-IP7P-128', 'iPhone 7 Plus 128GB',         'Apple', 'iPhone 7 Plus',     70, 150,  'IP_OLD'],
  ['DEV-IP7P-256', 'iPhone 7 Plus 256GB',         'Apple', 'iPhone 7 Plus',     80, 170,  'IP_OLD'],

  // ── iPhone 8 / 8 Plus ────────────────────────────────────────────────────
  ['DEV-IP8-64',   'iPhone 8 64GB',               'Apple', 'iPhone 8',          70, 150,  'IP_OLD'],
  ['DEV-IP8-128',  'iPhone 8 128GB',              'Apple', 'iPhone 8',          80, 170,  'IP_OLD'],
  ['DEV-IP8-256',  'iPhone 8 256GB',              'Apple', 'iPhone 8',          90, 190,  'IP_OLD'],
  ['DEV-IP8P-64',  'iPhone 8 Plus 64GB',          'Apple', 'iPhone 8 Plus',     80, 170,  'IP_OLD'],
  ['DEV-IP8P-128', 'iPhone 8 Plus 128GB',         'Apple', 'iPhone 8 Plus',     90, 190,  'IP_OLD'],
  ['DEV-IP8P-256', 'iPhone 8 Plus 256GB',         'Apple', 'iPhone 8 Plus',    100, 210,  'IP_OLD'],

  // ── iPhone X ─────────────────────────────────────────────────────────────
  ['DEV-IPX-64',   'iPhone X 64GB',               'Apple', 'iPhone X',         100, 220,  'IP_X'],
  ['DEV-IPX-256',  'iPhone X 256GB',              'Apple', 'iPhone X',         120, 250,  'IP_X'],

  // ── iPhone XS / XS Max / XR ──────────────────────────────────────────────
  ['DEV-IPXS-64',  'iPhone XS 64GB',              'Apple', 'iPhone XS',        130, 280,  'IP_X'],
  ['DEV-IPXS-256', 'iPhone XS 256GB',             'Apple', 'iPhone XS',        150, 310,  'IP_X'],
  ['DEV-IPXS-512', 'iPhone XS 512GB',             'Apple', 'iPhone XS',        170, 340,  'IP_X'],
  ['DEV-IPXSM-64', 'iPhone XS Max 64GB',          'Apple', 'iPhone XS Max',    150, 310,  'IP_X'],
  ['DEV-IPXSM-256','iPhone XS Max 256GB',         'Apple', 'iPhone XS Max',    170, 340,  'IP_X'],
  ['DEV-IPXSM-512','iPhone XS Max 512GB',         'Apple', 'iPhone XS Max',    190, 370,  'IP_X'],
  ['DEV-IPXR-64',  'iPhone XR 64GB',              'Apple', 'iPhone XR',        120, 260,  'IP_X'],
  ['DEV-IPXR-128', 'iPhone XR 128GB',             'Apple', 'iPhone XR',        135, 280,  'IP_X'],
  ['DEV-IPXR-256', 'iPhone XR 256GB',             'Apple', 'iPhone XR',        150, 300,  'IP_X'],

  // ── iPhone 11 / 11 Pro / 11 Pro Max ──────────────────────────────────────
  ['DEV-IP11-64',  'iPhone 11 64GB',              'Apple', 'iPhone 11',        160, 320,  'IP_11'],
  ['DEV-IP11-128', 'iPhone 11 128GB',             'Apple', 'iPhone 11',        175, 340,  'IP_11'],
  ['DEV-IP11-256', 'iPhone 11 256GB',             'Apple', 'iPhone 11',        195, 370,  'IP_11'],
  ['DEV-IP11P-64', 'iPhone 11 Pro 64GB',          'Apple', 'iPhone 11 Pro',    200, 390,  'IP_11'],
  ['DEV-IP11P-256','iPhone 11 Pro 256GB',         'Apple', 'iPhone 11 Pro',    230, 430,  'IP_11'],
  ['DEV-IP11P-512','iPhone 11 Pro 512GB',         'Apple', 'iPhone 11 Pro',    260, 470,  'IP_11'],
  ['DEV-IP11PM-64','iPhone 11 Pro Max 64GB',      'Apple', 'iPhone 11 Pro Max',220, 420,  'IP_11'],
  ['DEV-IP11PM-256','iPhone 11 Pro Max 256GB',    'Apple', 'iPhone 11 Pro Max',250, 460,  'IP_11'],
  ['DEV-IP11PM-512','iPhone 11 Pro Max 512GB',    'Apple', 'iPhone 11 Pro Max',280, 500,  'IP_11'],

  // ── iPhone 12 Mini / 12 / 12 Pro / 12 Pro Max ────────────────────────────
  ['DEV-IP12MI-64', 'iPhone 12 Mini 64GB',        'Apple', 'iPhone 12 Mini',   180, 349,  'IP_12_13'],
  ['DEV-IP12MI-128','iPhone 12 Mini 128GB',       'Apple', 'iPhone 12 Mini',   200, 379,  'IP_12_13'],
  ['DEV-IP12MI-256','iPhone 12 Mini 256GB',       'Apple', 'iPhone 12 Mini',   220, 409,  'IP_12_13'],
  ['DEV-IP12-64',   'iPhone 12 64GB',             'Apple', 'iPhone 12',        200, 389,  'IP_12_13'],
  ['DEV-IP12-128',  'iPhone 12 128GB',            'Apple', 'iPhone 12',        220, 419,  'IP_12_13'],
  ['DEV-IP12-256',  'iPhone 12 256GB',            'Apple', 'iPhone 12',        240, 449,  'IP_12_13'],
  ['DEV-IP12P-128', 'iPhone 12 Pro 128GB',        'Apple', 'iPhone 12 Pro',    280, 529,  'IP_12_13'],
  ['DEV-IP12P-256', 'iPhone 12 Pro 256GB',        'Apple', 'iPhone 12 Pro',    310, 569,  'IP_12_13'],
  ['DEV-IP12P-512', 'iPhone 12 Pro 512GB',        'Apple', 'iPhone 12 Pro',    340, 609,  'IP_12_13'],
  ['DEV-IP12PM-128','iPhone 12 Pro Max 128GB',    'Apple', 'iPhone 12 Pro Max',310, 589,  'IP_12_13'],
  ['DEV-IP12PM-256','iPhone 12 Pro Max 256GB',    'Apple', 'iPhone 12 Pro Max',340, 629,  'IP_12_13'],
  ['DEV-IP12PM-512','iPhone 12 Pro Max 512GB',    'Apple', 'iPhone 12 Pro Max',370, 669,  'IP_12_13'],

  // ── iPhone 13 Mini / 13 / 13 Pro / 13 Pro Max ────────────────────────────
  ['DEV-IP13MI-128','iPhone 13 Mini 128GB',       'Apple', 'iPhone 13 Mini',   230, 429,  'IP_12_13'],
  ['DEV-IP13MI-256','iPhone 13 Mini 256GB',       'Apple', 'iPhone 13 Mini',   250, 459,  'IP_12_13'],
  ['DEV-IP13MI-512','iPhone 13 Mini 512GB',       'Apple', 'iPhone 13 Mini',   280, 499,  'IP_12_13'],
  ['DEV-IP13-128',  'iPhone 13 128GB',            'Apple', 'iPhone 13',        260, 469,  'IP_12_13'],
  ['DEV-IP13-256',  'iPhone 13 256GB',            'Apple', 'iPhone 13',        280, 499,  'IP_12_13'],
  ['DEV-IP13-512',  'iPhone 13 512GB',            'Apple', 'iPhone 13',        310, 539,  'IP_12_13'],
  ['DEV-IP13P-128', 'iPhone 13 Pro 128GB',        'Apple', 'iPhone 13 Pro',    330, 599,  'IP_12_13'],
  ['DEV-IP13P-256', 'iPhone 13 Pro 256GB',        'Apple', 'iPhone 13 Pro',    360, 639,  'IP_12_13'],
  ['DEV-IP13P-512', 'iPhone 13 Pro 512GB',        'Apple', 'iPhone 13 Pro',    400, 699,  'IP_12_13'],
  ['DEV-IP13P-1TB', 'iPhone 13 Pro 1TB',          'Apple', 'iPhone 13 Pro',    440, 749,  'IP_12_13'],
  ['DEV-IP13PM-128','iPhone 13 Pro Max 128GB',    'Apple', 'iPhone 13 Pro Max',360, 649,  'IP_12_13'],
  ['DEV-IP13PM-256','iPhone 13 Pro Max 256GB',    'Apple', 'iPhone 13 Pro Max',390, 689,  'IP_12_13'],
  ['DEV-IP13PM-512','iPhone 13 Pro Max 512GB',    'Apple', 'iPhone 13 Pro Max',430, 739,  'IP_12_13'],
  ['DEV-IP13PM-1TB','iPhone 13 Pro Max 1TB',      'Apple', 'iPhone 13 Pro Max',470, 789,  'IP_12_13'],

  // ── iPhone 14 / 14 Plus / 14 Pro / 14 Pro Max ────────────────────────────
  ['DEV-IP14-128',  'iPhone 14 128GB',            'Apple', 'iPhone 14',        320, 569,  'IP_14_16'],
  ['DEV-IP14-256',  'iPhone 14 256GB',            'Apple', 'iPhone 14',        350, 609,  'IP_14_16'],
  ['DEV-IP14-512',  'iPhone 14 512GB',            'Apple', 'iPhone 14',        390, 659,  'IP_14_16'],
  ['DEV-IP14PL-128','iPhone 14 Plus 128GB',       'Apple', 'iPhone 14 Plus',   350, 609,  'IP_14_16'],
  ['DEV-IP14PL-256','iPhone 14 Plus 256GB',       'Apple', 'iPhone 14 Plus',   380, 649,  'IP_14_16'],
  ['DEV-IP14PL-512','iPhone 14 Plus 512GB',       'Apple', 'iPhone 14 Plus',   420, 699,  'IP_14_16'],
  ['DEV-IP14P-128', 'iPhone 14 Pro 128GB',        'Apple', 'iPhone 14 Pro',    430, 749,  'IP_14_16'],
  ['DEV-IP14P-256', 'iPhone 14 Pro 256GB',        'Apple', 'iPhone 14 Pro',    460, 789,  'IP_14_16'],
  ['DEV-IP14P-512', 'iPhone 14 Pro 512GB',        'Apple', 'iPhone 14 Pro',    510, 849,  'IP_14_16'],
  ['DEV-IP14P-1TB', 'iPhone 14 Pro 1TB',          'Apple', 'iPhone 14 Pro',    560, 909,  'IP_14_16'],
  ['DEV-IP14PM-128','iPhone 14 Pro Max 128GB',    'Apple', 'iPhone 14 Pro Max',470, 819,  'IP_14_16'],
  ['DEV-IP14PM-256','iPhone 14 Pro Max 256GB',    'Apple', 'iPhone 14 Pro Max',510, 869,  'IP_14_16'],
  ['DEV-IP14PM-512','iPhone 14 Pro Max 512GB',    'Apple', 'iPhone 14 Pro Max',560, 929,  'IP_14_16'],
  ['DEV-IP14PM-1TB','iPhone 14 Pro Max 1TB',      'Apple', 'iPhone 14 Pro Max',610, 989,  'IP_14_16'],

  // ── iPhone 15 / 15 Plus / 15 Pro / 15 Pro Max ────────────────────────────
  ['DEV-IP15-128',  'iPhone 15 128GB',            'Apple', 'iPhone 15',        400, 699,  'IP_14_16'],
  ['DEV-IP15-256',  'iPhone 15 256GB',            'Apple', 'iPhone 15',        430, 739,  'IP_14_16'],
  ['DEV-IP15-512',  'iPhone 15 512GB',            'Apple', 'iPhone 15',        470, 789,  'IP_14_16'],
  ['DEV-IP15PL-128','iPhone 15 Plus 128GB',       'Apple', 'iPhone 15 Plus',   430, 739,  'IP_14_16'],
  ['DEV-IP15PL-256','iPhone 15 Plus 256GB',       'Apple', 'iPhone 15 Plus',   460, 779,  'IP_14_16'],
  ['DEV-IP15PL-512','iPhone 15 Plus 512GB',       'Apple', 'iPhone 15 Plus',   510, 839,  'IP_14_16'],
  ['DEV-IP15P-128', 'iPhone 15 Pro 128GB',        'Apple', 'iPhone 15 Pro',    510, 879,  'IP_14_16'],
  ['DEV-IP15P-256', 'iPhone 15 Pro 256GB',        'Apple', 'iPhone 15 Pro',    550, 929,  'IP_14_16'],
  ['DEV-IP15P-512', 'iPhone 15 Pro 512GB',        'Apple', 'iPhone 15 Pro',    600, 989,  'IP_14_16'],
  ['DEV-IP15P-1TB', 'iPhone 15 Pro 1TB',          'Apple', 'iPhone 15 Pro',    650, 1049, 'IP_14_16'],
  ['DEV-IP15PM-256','iPhone 15 Pro Max 256GB',    'Apple', 'iPhone 15 Pro Max',580, 999,  'IP_14_16'],
  ['DEV-IP15PM-512','iPhone 15 Pro Max 512GB',    'Apple', 'iPhone 15 Pro Max',640, 1069, 'IP_14_16'],
  ['DEV-IP15PM-1TB','iPhone 15 Pro Max 1TB',      'Apple', 'iPhone 15 Pro Max',700, 1139, 'IP_14_16'],

  // ── iPhone 16 / 16 Plus / 16 Pro / 16 Pro Max ────────────────────────────
  ['DEV-IP16-128',  'iPhone 16 128GB',            'Apple', 'iPhone 16',        480, 799,  'IP_14_16'],
  ['DEV-IP16-256',  'iPhone 16 256GB',            'Apple', 'iPhone 16',        510, 849,  'IP_14_16'],
  ['DEV-IP16-512',  'iPhone 16 512GB',            'Apple', 'iPhone 16',        560, 909,  'IP_14_16'],
  ['DEV-IP16PL-128','iPhone 16 Plus 128GB',       'Apple', 'iPhone 16 Plus',   510, 849,  'IP_14_16'],
  ['DEV-IP16PL-256','iPhone 16 Plus 256GB',       'Apple', 'iPhone 16 Plus',   540, 889,  'IP_14_16'],
  ['DEV-IP16PL-512','iPhone 16 Plus 512GB',       'Apple', 'iPhone 16 Plus',   590, 949,  'IP_14_16'],
  ['DEV-IP16P-128', 'iPhone 16 Pro 128GB',        'Apple', 'iPhone 16 Pro',    600, 999,  'IP_14_16'],
  ['DEV-IP16P-256', 'iPhone 16 Pro 256GB',        'Apple', 'iPhone 16 Pro',    640, 1049, 'IP_14_16'],
  ['DEV-IP16P-512', 'iPhone 16 Pro 512GB',        'Apple', 'iPhone 16 Pro',    690, 1109, 'IP_14_16'],
  ['DEV-IP16P-1TB', 'iPhone 16 Pro 1TB',          'Apple', 'iPhone 16 Pro',    740, 1169, 'IP_14_16'],
  ['DEV-IP16PM-256','iPhone 16 Pro Max 256GB',    'Apple', 'iPhone 16 Pro Max',660, 1099, 'IP_14_16'],
  ['DEV-IP16PM-512','iPhone 16 Pro Max 512GB',    'Apple', 'iPhone 16 Pro Max',720, 1169, 'IP_14_16'],
  ['DEV-IP16PM-1TB','iPhone 16 Pro Max 1TB',      'Apple', 'iPhone 16 Pro Max',780, 1239, 'IP_14_16'],

  // ── Samsung Galaxy S21 series ─────────────────────────────────────────────
  ['DEV-SSS21-128', 'Samsung Galaxy S21 128GB',   'Samsung', 'Galaxy S21',      200, 379, 'SS_S'],
  ['DEV-SSS21-256', 'Samsung Galaxy S21 256GB',   'Samsung', 'Galaxy S21',      230, 419, 'SS_S'],
  ['DEV-SSS21P-256','Samsung Galaxy S21+ 256GB',  'Samsung', 'Galaxy S21+',     270, 479, 'SS_S'],
  ['DEV-SSS21U-128','Samsung Galaxy S21 Ultra 128GB','Samsung','Galaxy S21 Ultra',350, 599, 'SS_S'],
  ['DEV-SSS21U-256','Samsung Galaxy S21 Ultra 256GB','Samsung','Galaxy S21 Ultra',390, 649, 'SS_S'],
  ['DEV-SSS21U-512','Samsung Galaxy S21 Ultra 512GB','Samsung','Galaxy S21 Ultra',440, 719, 'SS_S'],

  // ── Samsung Galaxy S22 series ─────────────────────────────────────────────
  ['DEV-SSS22-128', 'Samsung Galaxy S22 128GB',   'Samsung', 'Galaxy S22',      270, 459, 'SS_S'],
  ['DEV-SSS22-256', 'Samsung Galaxy S22 256GB',   'Samsung', 'Galaxy S22',      300, 499, 'SS_S'],
  ['DEV-SSS22P-128','Samsung Galaxy S22+ 128GB',  'Samsung', 'Galaxy S22+',     330, 549, 'SS_S'],
  ['DEV-SSS22P-256','Samsung Galaxy S22+ 256GB',  'Samsung', 'Galaxy S22+',     360, 589, 'SS_S'],
  ['DEV-SSS22U-128','Samsung Galaxy S22 Ultra 128GB','Samsung','Galaxy S22 Ultra',450, 749, 'SS_S'],
  ['DEV-SSS22U-256','Samsung Galaxy S22 Ultra 256GB','Samsung','Galaxy S22 Ultra',490, 799, 'SS_S'],
  ['DEV-SSS22U-512','Samsung Galaxy S22 Ultra 512GB','Samsung','Galaxy S22 Ultra',540, 869, 'SS_S'],
  ['DEV-SSS22U-1TB','Samsung Galaxy S22 Ultra 1TB','Samsung', 'Galaxy S22 Ultra',600, 949, 'SS_S'],

  // ── Samsung Galaxy S23 series ─────────────────────────────────────────────
  ['DEV-SSS23-128', 'Samsung Galaxy S23 128GB',   'Samsung', 'Galaxy S23',      340, 569, 'SS_S'],
  ['DEV-SSS23-256', 'Samsung Galaxy S23 256GB',   'Samsung', 'Galaxy S23',      370, 609, 'SS_S'],
  ['DEV-SSS23P-256','Samsung Galaxy S23+ 256GB',  'Samsung', 'Galaxy S23+',     430, 699, 'SS_S'],
  ['DEV-SSS23P-512','Samsung Galaxy S23+ 512GB',  'Samsung', 'Galaxy S23+',     470, 749, 'SS_S'],
  ['DEV-SSS23U-256','Samsung Galaxy S23 Ultra 256GB','Samsung','Galaxy S23 Ultra',560, 879, 'SS_S'],
  ['DEV-SSS23U-512','Samsung Galaxy S23 Ultra 512GB','Samsung','Galaxy S23 Ultra',610, 949, 'SS_S'],
  ['DEV-SSS23U-1TB','Samsung Galaxy S23 Ultra 1TB','Samsung', 'Galaxy S23 Ultra',670, 1029, 'SS_S'],

  // ── Samsung Galaxy S24 series ─────────────────────────────────────────────
  ['DEV-SSS24-128', 'Samsung Galaxy S24 128GB',   'Samsung', 'Galaxy S24',      420, 699, 'SS_S'],
  ['DEV-SSS24-256', 'Samsung Galaxy S24 256GB',   'Samsung', 'Galaxy S24',      450, 739, 'SS_S'],
  ['DEV-SSS24P-256','Samsung Galaxy S24+ 256GB',  'Samsung', 'Galaxy S24+',     510, 829, 'SS_S'],
  ['DEV-SSS24P-512','Samsung Galaxy S24+ 512GB',  'Samsung', 'Galaxy S24+',     560, 889, 'SS_S'],
  ['DEV-SSS24U-256','Samsung Galaxy S24 Ultra 256GB','Samsung','Galaxy S24 Ultra',660, 1049, 'SS_S'],
  ['DEV-SSS24U-512','Samsung Galaxy S24 Ultra 512GB','Samsung','Galaxy S24 Ultra',720, 1129, 'SS_S'],
  ['DEV-SSS24U-1TB','Samsung Galaxy S24 Ultra 1TB','Samsung', 'Galaxy S24 Ultra',790, 1219, 'SS_S'],

  // ── Samsung Galaxy S25 series ─────────────────────────────────────────────
  ['DEV-SSS25-128', 'Samsung Galaxy S25 128GB',   'Samsung', 'Galaxy S25',      500, 799, 'SS_S'],
  ['DEV-SSS25-256', 'Samsung Galaxy S25 256GB',   'Samsung', 'Galaxy S25',      540, 849, 'SS_S'],
  ['DEV-SSS25P-256','Samsung Galaxy S25+ 256GB',  'Samsung', 'Galaxy S25+',     600, 949, 'SS_S'],
  ['DEV-SSS25P-512','Samsung Galaxy S25+ 512GB',  'Samsung', 'Galaxy S25+',     650, 1009, 'SS_S'],
  ['DEV-SSS25U-256','Samsung Galaxy S25 Ultra 256GB','Samsung','Galaxy S25 Ultra',760, 1199, 'SS_S'],
  ['DEV-SSS25U-512','Samsung Galaxy S25 Ultra 512GB','Samsung','Galaxy S25 Ultra',820, 1279, 'SS_S'],
  ['DEV-SSS25U-1TB','Samsung Galaxy S25 Ultra 1TB','Samsung', 'Galaxy S25 Ultra',900, 1379, 'SS_S'],

  // ── Samsung Galaxy A series ───────────────────────────────────────────────
  ['DEV-SSA13-128', 'Samsung Galaxy A13 128GB',   'Samsung', 'Galaxy A13',       80, 159, 'SS_A'],
  ['DEV-SSA14-64',  'Samsung Galaxy A14 64GB',    'Samsung', 'Galaxy A14',       90, 169, 'SS_A'],
  ['DEV-SSA14-128', 'Samsung Galaxy A14 128GB',   'Samsung', 'Galaxy A14',      100, 189, 'SS_A'],
  ['DEV-SSA15-128', 'Samsung Galaxy A15 128GB',   'Samsung', 'Galaxy A15',      110, 209, 'SS_A'],
  ['DEV-SSA15-256', 'Samsung Galaxy A15 256GB',   'Samsung', 'Galaxy A15',      130, 239, 'SS_A'],
  ['DEV-SSA25-128', 'Samsung Galaxy A25 128GB',   'Samsung', 'Galaxy A25',      150, 279, 'SS_A'],
  ['DEV-SSA25-256', 'Samsung Galaxy A25 256GB',   'Samsung', 'Galaxy A25',      170, 309, 'SS_A'],
  ['DEV-SSA35-128', 'Samsung Galaxy A35 128GB',   'Samsung', 'Galaxy A35',      190, 349, 'SS_A'],
  ['DEV-SSA35-256', 'Samsung Galaxy A35 256GB',   'Samsung', 'Galaxy A35',      210, 379, 'SS_A'],
  ['DEV-SSA55-128', 'Samsung Galaxy A55 128GB',   'Samsung', 'Galaxy A55',      240, 429, 'SS_A'],
  ['DEV-SSA55-256', 'Samsung Galaxy A55 256GB',   'Samsung', 'Galaxy A55',      270, 469, 'SS_A'],
  ['DEV-SSA56-128', 'Samsung Galaxy A56 128GB',   'Samsung', 'Galaxy A56',      270, 469, 'SS_A'],
  ['DEV-SSA56-256', 'Samsung Galaxy A56 256GB',   'Samsung', 'Galaxy A56',      300, 509, 'SS_A'],

  // ── Samsung Galaxy Note series ────────────────────────────────────────────
  ['DEV-SSN20-256', 'Samsung Galaxy Note 20 256GB','Samsung','Galaxy Note 20',  280, 479, 'SS_NOTE'],
  ['DEV-SSN20U-256','Samsung Galaxy Note 20 Ultra 256GB','Samsung','Galaxy Note 20 Ultra',380, 629, 'SS_NOTE'],
  ['DEV-SSN20U-512','Samsung Galaxy Note 20 Ultra 512GB','Samsung','Galaxy Note 20 Ultra',430, 699, 'SS_NOTE'],

  // ── Samsung Galaxy Z Fold series ──────────────────────────────────────────
  ['DEV-SSZF4-256', 'Samsung Galaxy Z Fold 4 256GB','Samsung','Galaxy Z Fold 4', 600, 999,  'SS_FOLD'],
  ['DEV-SSZF4-512', 'Samsung Galaxy Z Fold 4 512GB','Samsung','Galaxy Z Fold 4', 650, 1079, 'SS_FOLD'],
  ['DEV-SSZF5-256', 'Samsung Galaxy Z Fold 5 256GB','Samsung','Galaxy Z Fold 5', 680, 1099, 'SS_FOLD'],
  ['DEV-SSZF5-512', 'Samsung Galaxy Z Fold 5 512GB','Samsung','Galaxy Z Fold 5', 730, 1179, 'SS_FOLD'],
  ['DEV-SSZF6-256', 'Samsung Galaxy Z Fold 6 256GB','Samsung','Galaxy Z Fold 6', 760, 1199, 'SS_FOLD'],
  ['DEV-SSZF6-512', 'Samsung Galaxy Z Fold 6 512GB','Samsung','Galaxy Z Fold 6', 820, 1289, 'SS_FOLD'],
  ['DEV-SSZF6-1TB', 'Samsung Galaxy Z Fold 6 1TB','Samsung', 'Galaxy Z Fold 6', 890, 1389, 'SS_FOLD'],

  // ── Samsung Galaxy Z Flip series ──────────────────────────────────────────
  ['DEV-SSZFL4-128','Samsung Galaxy Z Flip 4 128GB','Samsung','Galaxy Z Flip 4', 300, 519, 'SS_FLIP'],
  ['DEV-SSZFL4-256','Samsung Galaxy Z Flip 4 256GB','Samsung','Galaxy Z Flip 4', 330, 559, 'SS_FLIP'],
  ['DEV-SSZFL5-256','Samsung Galaxy Z Flip 5 256GB','Samsung','Galaxy Z Flip 5', 380, 619, 'SS_FLIP'],
  ['DEV-SSZFL5-512','Samsung Galaxy Z Flip 5 512GB','Samsung','Galaxy Z Flip 5', 430, 689, 'SS_FLIP'],
  ['DEV-SSZFL6-256','Samsung Galaxy Z Flip 6 256GB','Samsung','Galaxy Z Flip 6', 440, 719, 'SS_FLIP'],
  ['DEV-SSZFL6-512','Samsung Galaxy Z Flip 6 512GB','Samsung','Galaxy Z Flip 6', 490, 789, 'SS_FLIP'],
];

async function run() {
  await sequelize.authenticate();
  const store = await Store.findOne();
  if (!store) { console.error('No store found — run seed.js first'); process.exit(1); }

  let created = 0, skipped = 0;

  for (const [sku, name, brand, modelCompatibility, cost, price, imgKey] of DEVICES) {
    const exists = await InventoryItem.findOne({ where: { sku, storeId: store.id } });
    if (exists) { skipped++; continue; }
    await InventoryItem.create({
      storeId: store.id,
      sku,
      name,
      category: 'device',
      brand,
      modelCompatibility,
      quantity: 0,
      minQuantity: 2,
      cost,
      price,
      serialTracked: true,
      active: true,
      imageUrl: IMG[imgKey],
    });
    created++;
  }

  console.log(`Done! Created ${created} devices, skipped ${skipped} duplicates.`);
  console.log(`Total devices in system: ${created + skipped}`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
