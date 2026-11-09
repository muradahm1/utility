/**
 * Construction Calculators Module
 * 
 * Contains construction-related calculator definitions:
 * - Concrete Calculator
 * - Paint Calculator
 * - Tile Calculator
 * 
 * @module calculators/construction
 */

import { safeNum, roundTo } from '../utils/index.js';
import { escapeHtml } from '../utils/index.js';

const errorResult = (message) => ({ error: true, stats: [{ label: 'Error', value: message, warn: true }] });

// ── Concrete Calculator ────────────────────────────────────────

export const concreteCalculator = {
    id: 'concrete-calculator',
    name: 'Concrete Calculator',
    category: 'Construction',
    icon: 'fa-truck-ramp-box',
    iconClass: 'icon-construction',
    tagClass: 'tag-construction',
    description: 'Calculate the volume of concrete needed for a slab, footing, or column — in cubic yards, cubic feet, or cubic meters — plus the number of 60lb/80lb bags required.',
    metaDescription: 'Free concrete calculator — estimate concrete volume in cubic yards, cubic feet, or cubic meters for slabs, footings, and columns, plus the number of 60lb and 80lb bags needed.',
    fields: [
        { id: 'shape', label: 'Shape', type: 'select', default: 'slab',
            options: [
                { value: 'slab',    label: 'Slab / Pad (rectangular)' },
                { value: 'footing', label: 'Footing / Wall (rectangular)' },
                { value: 'column',  label: 'Column / Cylinder (round)' },
            ],
            hint: 'Select the concrete shape you are pouring.' },
        { id: 'length', label: 'Length (ft)', type: 'number', default: 10, min: 0, step: 0.5,
            hint: 'Length of the slab or footing in feet.' },
        { id: 'width', label: 'Width (ft)', type: 'number', default: 10, min: 0, step: 0.5,
            hint: 'Width of the slab or footing in feet. Leave at 0 for a column.' },
        { id: 'diameter', label: 'Diameter (ft)', type: 'number', default: 1, min: 0, step: 0.25,
            hint: 'Diameter of the round column in feet.' },
        { id: 'depth', label: 'Depth / Height (in)', type: 'number', default: 4, min: 0, step: 0.5,
            hint: 'Slab thickness or column height in inches.' },
        { id: 'quantity', label: 'Quantity', type: 'number', default: 1, min: 1, max: 1000, step: 1,
            hint: 'Number of identical pours (e.g. 4 identical footings).' },
        { id: 'waste', label: 'Waste / Overages (%)', type: 'number', default: 10, min: 0, max: 25, step: 1,
            hint: 'Extra concrete for spillage, uneven subgrade, and rounding. Contractors typically add 10%.' },
    ],
    calculate(v) {
        const shape = v.shape || 'slab';
        const L = safeNum(v.length, 0);
        const W = safeNum(v.width, 0);
        const D = safeNum(v.diameter, 0);
        const depthIn = safeNum(v.depth, 0);
        const qty = Math.max(1, Math.round(safeNum(v.quantity, 1)));
        const waste = safeNum(v.waste, 10);

        // Volume in cubic feet (converted from inches for depth)
        let volumeCF = 0;
        if (shape === 'column') {
            // V = π r² h
            const r = D / 2;
            volumeCF = Math.PI * r * r * (depthIn / 12);
        } else {
            if (L <= 0 || W <= 0) {
                return errorResult('Enter a valid length and width. For a column, choose "Column / Cylinder".');
            }
            volumeCF = L * W * (depthIn / 12);
        }

        if (volumeCF <= 0 || depthIn <= 0) {
            return errorResult('Please enter positive dimensions.');
        }

        // Apply quantity and waste
        const totalCFRaw = volumeCF * qty;
        const totalCF = roundTo(totalCFRaw * (1 + waste / 100), 2);
        const totalCY = roundTo(totalCF / 27, 2);
        const totalM3 = roundTo(totalCF * 0.0283168, 2);

        // Bag estimates (approx: 0.45 cf per 60lb bag, 0.60 cf per 80lb bag)
        const bags60 = Math.ceil(totalCF / 0.45);
        const bags80 = Math.ceil(totalCF / 0.60);

        return {
            stats: [
                { label: 'Concrete Needed (cu yd)', value: roundTo(totalCY, 2) + ' yd³', highlight: true },
                { label: 'Concrete Needed (cu ft)', value: roundTo(totalCF, 2) + ' ft³' },
                { label: 'Concrete Needed (m³)', value: roundTo(totalM3, 2) + ' m³' },
                { label: '60lb Bags', value: bags60 + ' bags' },
                { label: '80lb Bags', value: bags80 + ' bags' },
                { label: 'Estimated Weight', value: roundTo(totalCF * 145, 0).toLocaleString('en-US') + ' lbs' },
            ],
            insight: {
                tone: 'neutral',
                icon: 'fa-truck-ramp-box',
                headline: 'You need approximately ' + roundTo(totalCY, 2) + ' cubic yards of concrete.',
                detail: 'Includes ' + waste + '% waste. Order ready-mix in whole yards (round up). For bagged concrete, ' + bags80 + ' eighty-pound bags is the closest estimate.',
            },
        };
    },
    article: {
        heading: 'How to Calculate Concrete Volume for Any Project',
        intro: 'Estimating concrete volume correctly is the difference between one truck delivery and two — or between a smooth pour and a short one. The GetCalcu Concrete Calculator computes the exact cubic yards, cubic feet, or cubic meters for slabs, footings, and round columns, then tells you how many 60lb or 80lb bags you need.',
        sections: [
            { heading: 'The Concrete Volume Formula', body: 'For a rectangular slab or footing: Volume = Length × Width × Depth. For a round column: Volume = π × r² × Height. Convert every measurement to the same unit first — our calculator handles the inches-to-feet conversion automatically.' },
            { heading: 'Why You Should Add Extra (Waste)', body: 'Concrete settles, spills, and slips into low spots. Contractors typically add 10% over the calculated volume. For small bagged projects, round up to the nearest full bag — you can always return unopened bags.' },
            { heading: 'Ordering Ready-Mix vs Bags', body: 'Ready-mix trucks deliver by the cubic yard and usually require a minimum order. For projects under roughly 2 cubic yards, bagged concrete is often simpler. A 60lb bag yields about 0.45 ft³ and an 80lb bag about 0.60 ft³.' },
        ],
    },
    howTo: [
        'Select the shape: slab/pad, footing/wall, or round column.',
        'Enter the length, width (or diameter), and depth in inches.',
        'Optionally enter a quantity if you are pouring multiple identical footings or pads.',
        'Add a waste percentage (10% is standard) and press Calculate.',
        'Review cubic yards for ready-mix ordering, or the 60lb/80lb bag count for bagged concrete.',
    ],
    formula: 'Rectangular: V = L × W × H | Column: V = π × r² × H | 1 yd³ = 27 ft³ | 60lb bag ≈ 0.45 ft³ | 80lb bag ≈ 0.60 ft³ | Concrete weight ≈ 145 lb/ft³',
    examples: [
        { title: '10×10 Patio Slab', input: 'Slab, 10 ft × 10 ft, 4 in deep', result: '1.36 yd³ (incl. 10% waste) ≈ 61-bags (80lb)' },
        { title: '4×4 Porch Footings ×3', input: 'Footing, 4 ft × 4 ft, 12 in deep, qty 3', result: '1.63 yd³ (incl. 10% waste) ≈ 74 bags (80lb)' },
        { title: 'Round Column', input: 'Column, 1.5 ft diameter, 8 ft height', result: '0.42 yd³ (incl. 10% waste) ≈ 19 bags (80lb)' },
    ],
    faqs: [
        { q: 'How do I calculate concrete for a slab?', a: 'Multiply the length by the width by the depth (in feet). One cubic yard equals 27 cubic feet. For a 10×10 slab that is 4 inches thick: 10 × 10 × 0.333 = 33.3 ft³, which is about 1.23 cubic yards before adding waste.' },
        { q: 'How many 80lb bags equal a yard of concrete?', a: 'An 80lb bag of concrete yields approximately 0.60 cubic feet. One cubic yard (27 ft³) therefore requires roughly 45 eighty-pound bags. A 60lb bag (0.45 ft³) needs about 60 bags per yard.' },
        { q: 'How much does concrete weigh?', a: 'Standard concrete weighs about 145 pounds per cubic foot, or roughly 3,915 pounds per cubic yard. This is important for structural loading and planning delivery.' },
        { q: 'How much extra concrete should I order?', a: 'Contractors typically order 10% extra to account for spillage, uneven subgrade, and rounding. Factor in the minimum truck order too — if your project needs 4.2 yards, expect to order at least 5 yards.' },
    ],
};

// ── Paint Calculator ────────────────────────────────────────────

export const paintCalculator = {
    id: 'paint-calculator',
    name: 'Paint Calculator',
    category: 'Construction',
    icon: 'fa-paint-roller',
    iconClass: 'icon-construction',
    tagClass: 'tag-construction',
    description: 'Estimate how many gallons of paint you need for walls and ceilings, including doors/windows subtraction and multiple coats.',
    metaDescription: 'Free paint calculator — estimate gallons of paint needed for walls and ceilings with coverage per gallon, coat count, and door/window allowances.',
    fields: [
        { id: 'surface', label: 'What are you painting?', type: 'select', default: 'walls',
            options: [
                { value: 'walls',   label: 'Walls' },
                { value: 'ceilings', label: 'Ceilings' },
                { value: 'walls-ceilings', label: 'Walls + Ceilings' },
            ],
            hint: 'Select the surface type. Ceilings often need a different finish.' },
        { id: 'room_length', label: 'Room Length (ft)', type: 'number', default: 14, min: 0, step: 0.5,
            hint: 'Longest wall dimension of the room.' },
        { id: 'room_width', label: 'Room Width (ft)', type: 'number', default: 12, min: 0, step: 0.5,
            hint: 'Shortest wall dimension of the room.' },
        { id: 'wall_height', label: 'Wall Height (ft)', type: 'number', default: 8, min: 0, step: 0.5,
            hint: 'Floor-to-ceiling height.' },
        { id: 'doors', label: 'Doors', type: 'number', default: 1, min: 0, max: 20, step: 1,
            hint: 'Standard doors subtract ~20 sq ft each.' },
        { id: 'windows', label: 'Windows', type: 'number', default: 2, min: 0, max: 40, step: 1,
            hint: 'Standard windows subtract ~15 sq ft each.' },
        { id: 'coats', label: 'Number of Coats', type: 'number', default: 2, min: 1, max: 5, step: 1,
            hint: 'Two coats is standard for most paints. Dark colors or dramatic color changes may need three.' },
        { id: 'coverage', label: 'Coverage per Gallon (sq ft)', type: 'number', default: 350, min: 100, max: 600, step: 25,
            hint: 'Most premium paints cover 350–400 sq ft per gallon. Check your can.' },
    ],
    calculate(v) {
        const surface = v.surface || 'walls';
        const L = safeNum(v.room_length, 0);
        const W = safeNum(v.room_width, 0);
        const H = safeNum(v.wall_height, 0);
        const doors = safeNum(v.doors, 0);
        const windows = safeNum(v.windows, 0);
        const coats = Math.max(1, Math.round(safeNum(v.coats, 2)));
        const coverage = Math.max(50, safeNum(v.coverage, 350));

        if (L <= 0 || W <= 0 || (surface !== 'ceilings' && H <= 0)) {
            return errorResult('Enter valid room dimensions.');
        }

        let wallArea = 0;
        let ceilingArea = 0;
        if (surface === 'walls' || surface === 'walls-ceilings') {
            wallArea = 2 * (L + W) * H;
        }
        if (surface === 'ceilings' || surface === 'walls-ceilings') {
            ceilingArea = L * W;
        }

        // Subtract openings from wall area
        const openings = doors * 20 + windows * 15;

        const netWalls = Math.max(0, wallArea - openings);
        const totalArea = roundTo(netWalls + ceilingArea, 2);
        const adjustedArea = totalArea * coats;

        // Paint sold in gallons; trim purchases up to the nearest gallon per coat
        const gallons = Math.ceil(adjustedArea / coverage);
        const fiveGallonBuckets = Math.floor(gallons / 5);
        const singleGallons = gallons % 5;

        return {
            stats: [
                { label: 'Total Paintable Area', value: roundTo(totalArea, 0).toLocaleString('en-US') + ' sq ft' },
                { label: 'Area with ' + coats + ' coats', value: roundTo(adjustedArea, 0).toLocaleString('en-US') + ' sq ft' },
                { label: 'Paint Needed', value: gallons + ' gal', highlight: true },
                { label: '5-Gallon Buckets', value: fiveGallonBuckets + ' bucket' + (fiveGallonBuckets === 1 ? '' : 's') },
                { label: 'Single Gallons', value: singleGallons + ' gal' },
            ],
            insight: {
                tone: 'neutral',
                icon: 'fa-paint-roller',
                headline: 'You will need approximately ' + gallons + ' gallon' + (gallons === 1 ? '' : 's') + ' of paint.',
                detail: 'This covers ' + roundTo(totalArea, 0).toLocaleString('en-US') + ' sq ft with ' + coats + ' coat' + (coats > 1 ? 's' : '') + ' at ' + coverage + ' sq ft/gallon. Buy with a 5-gallon bucket where possible — it is usually cheaper per gallon.',
            },
        };
    },
    article: {
        heading: 'How to Calculate How Much Paint You Need',
        intro: 'Buying too little paint means a trip back to the store mid-project; buying too much wastes money. The GetCalcu Paint Calculator estimates exactly how many gallons you need for walls and ceilings, subtracting doors and windows and accounting for multiple coats.',
        sections: [
            { heading: 'Measuring the Paintable Area', body: 'Find the wall area by multiplying the room perimeter (2 × length + 2 × width) by the wall height. Add the ceiling area (length × width) if painting ceilings. Subtract about 20 sq ft per door and 15 sq ft per window.' },
            { heading: 'Coverage and Coats', body: 'One gallon of quality paint covers roughly 350–400 sq ft. Multiply your net area by the number of coats (usually 2), then divide by coverage and round up to the nearest gallon.' },
            { heading: 'Buying in Bulk', body: 'A 5-gallon bucket is often 15–20% cheaper per gallon than single cans, and it keeps a consistent color batch — important when mixing a whole room from one lot.' },
        ],
    },
    howTo: [
        'Choose the surface: walls, ceilings, or both.',
        'Enter the room length, width, and wall height in feet.',
        'Count doors (≈20 sq ft each) and windows (≈15 sq ft each).',
        'Set the number of coats — 2 is standard.',
        'Enter the coverage from your paint can label (350 sq ft is typical).',
        'Review the total gallons, and pick up a 5-gallon bucket plus singles as shown.',
    ],
    formula: 'Wall Area = 2 × (L + W) × H | Net Area = Wall Area + Ceiling Area − (Doors × 20) − (Windows × 15) | Gallons = ceil((Net Area × Coats) ÷ Coverage)',
    examples: [
        { title: '14×12 Bedroom', input: 'Walls, 14 ft × 12 ft, 8 ft high, 1 door, 2 windows, 2 coats', result: '≈ 2 gallons' },
        { title: 'Ceiling Only', input: 'Ceilings, 14 ft × 12 ft, 2 coats', result: '≈ 1 gallon' },
        { title: 'Open Living Room', input: 'Walls+Ceilings, 20 ft × 16 ft, 9 ft high, 2 doors, 4 windows, 2 coats', result: '≈ 6 gallons' },
    ],
    faqs: [
        { q: 'How many square feet does a gallon of paint cover?', a: 'Most quality paints cover 350–400 square feet per gallon for a single coat on smooth, primed surfaces. Rough, textured, or unprimed surfaces can reduce coverage to 250–300 square feet.' },
        { q: 'Do I need to subtract doors and windows?', a: 'Yes. A standard door is about 20 sq ft and a standard window about 15 sq ft. Subtract them from the wall area so you do not overbuy.' },
        { q: 'How do I calculate paint for a room?', a: 'Compute the perimeter (2 × length + 2 × width), multiply by wall height, subtract door/window openings, multiply by the number of coats, then divide by the coverage per gallon and round up.' },
        { q: 'Is it cheaper to buy paint by the 5-gallon bucket?', a: 'Usually yes — 5-gallon buckets typically cost 15–20% less per gallon and ensure all paint comes from the same batch, avoiding slight color variation between cans.' },
    ],
};

// ── Tile Calculator ─────────────────────────────────────────────

export const tileCalculator = {
    id: 'tile-calculator',
    name: 'Tile Calculator',
    category: 'Construction',
    icon: 'fa-table-cells-large',
    iconClass: 'icon-construction',
    tagClass: 'tag-construction',
    description: 'Estimate how many tiles you need for a floor or wall, including grout lines, waste factor, and boxes of tile.',
    metaDescription: 'Free tile calculator — estimate the number of floor or wall tiles needed, including grout gaps, waste percentage, and full boxes required.',
    fields: [
        { id: 'area_length', label: 'Floor/Wall Length (ft)', type: 'number', default: 10, min: 0, step: 0.5,
            hint: 'Length of the surface to be tiled.' },
        { id: 'area_width', label: 'Floor/Wall Width (ft)', type: 'number', default: 8, min: 0, step: 0.5,
            hint: 'Width of the surface to be tiled.' },
        { id: 'tile_size', label: 'Tile Size (in)', type: 'select', default: '12x12',
            options: [
                { value: '12x12', label: '12 × 12 in (1 sq ft)' },
                { value: '12x24', label: '12 × 24 in (2 sq ft)' },
                { value: '18x18', label: '18 × 18 in (2.25 sq ft)' },
                { value: '24x24', label: '24 × 24 in (4 sq ft)' },
                { value: '6x24', label: '6 × 24 in (1 sq ft)' },
                { value: '2x2', label: '2 × 2 in (mosaic — 0.03 sq ft)' },
            ],
            hint: 'The size of each tile.' },
        { id: 'grout', label: 'Grout Gap (in)', type: 'number', default: 0.125, min: 0, max: 0.5, step: 0.0625,
            hint: 'Width of the grout line between tiles. Typically 1/8 in for floor tile, 1/16 in for wall tile.' },
        { id: 'waste', label: 'Waste Factor (%)', type: 'number', default: 10, min: 0, max: 30, step: 1,
            hint: 'Extra tiles for cuts, breakage, and future repairs. 10% is standard; use 15% for diagonal layouts or large formats.' },
        { id: 'per_box', label: 'Tiles per Box', type: 'number', default: 10, min: 1, max: 100, step: 1,
            hint: 'How many tiles come in one box (printed on the box).' },
    ],
    calculate(v) {
        const L = safeNum(v.area_length, 0);
        const W = safeNum(v.area_width, 0);
        const tileSize = v.tile_size || '12x12';
        const grout = safeNum(v.grout, 0.125);
        const waste = safeNum(v.waste, 10);
        const perBox = Math.max(1, Math.round(safeNum(v.per_box, 10)));

        if (L <= 0 || W <= 0) {
            return errorResult('Enter valid surface dimensions.');
        }

        const sizeMap = {
            '12x12': 12, '12x24': 12, '18x18': 18, '24x24': 24, '6x24': 6, '2x2': 2,
        };
        const tileIn = sizeMap[tileSize] || 12;
        const tileAreaFt = (tileIn / 12) * (tileIn / 12);

        const areaFt = L * W;
        // Effective tile spacing = tile size + grout gap
        const effectiveTile = (tileIn + grout) / 12;
        const effectiveArea = effectiveTile * effectiveTile;
        const tilesNeeded = Math.ceil(areaFt / effectiveArea);
        const wasteTiles = Math.ceil(tilesNeeded * waste / 100);
        const totalTiles = tilesNeeded + wasteTiles;
        const boxes = Math.ceil(totalTiles / perBox);

        return {
            stats: [
                { label: 'Surface Area', value: roundTo(areaFt, 2) + ' sq ft' },
                { label: 'Tiles Needed (excl. waste)', value: tilesNeeded + ' tiles' },
                { label: 'Waste / Extras', value: '+' + wasteTiles + ' tiles (' + waste + '%)' },
                { label: 'Total Tiles to Buy', value: totalTiles + ' tiles', highlight: true },
                { label: 'Boxes to Buy', value: boxes + ' box' + (boxes === 1 ? '' : 'es'), highlight: true },
            ],
            insight: {
                tone: 'neutral',
                icon: 'fa-table-cells-large',
                headline: 'Buy ' + boxes + ' box' + (boxes === 1 ? '' : 'es') + ' of tile (' + totalTiles + ' tiles total).',
                detail: 'That covers ' + roundTo(areaFt, 2) + ' sq ft with a ' + waste + '% waste allowance for cuts and breakage. Keep the unused tiles — they are invaluable for future repairs.',
            },
        };
    },
    article: {
        heading: 'How to Calculate How Many Tiles You Need',
        intro: 'Ordering tile is a two-step math problem: figure the surface area, then account for the grout lines, cuts, breakage, and future repairs. The GetCalcu Tile Calculator does both, calculating exactly how many tiles and boxes to buy.',
        sections: [
            { heading: 'Measuring and Accounting for Grout', body: 'Multiply the room length by the width for the surface area. A 1/8-inch grout gap slightly increases the effective spacing between tile centers, so fewer tiles are needed than a pure area calculation suggests — our calculator accounts for this automatically.' },
            { heading: 'The Waste Factor Is Essential', body: 'Tile is fragile and needs cutting at edges, corners, and obstacles. A 10% waste factor covers straight layouts; 15% is safer for diagonal patterns or large-format tile. Buying an extra box also guarantees matching dye-lot color for future repairs.' },
            { heading: 'Boxes and Coverage', body: 'Manufacturers print coverage per box, but box sizes vary (e.g., 10 tiles of 12×12 = 10 sq ft; 8 tiles of 12×24 = 16 sq ft). Always round the final box count up — you cannot buy a partial box of tile.' },
        ],
    },
    howTo: [
        'Enter the length and width of the surface in feet.',
        'Choose your tile size from the list.',
        'Set the grout gap (1/8 in is standard for floors).',
        'Enter a waste factor — 10% standard, 15% for diagonal layouts.',
        'Enter the tiles-per-box from the manufacturer label.',
        'Review total tiles and full boxes to buy.',
    ],
    formula: 'Area = L × W | Effective Tile = (Tile Size + Grout)² | Tiles = ceil(Area ÷ Effective Tile) | Total = Tiles + ceil(Tiles × Waste%) | Boxes = ceil(Total ÷ Tiles per Box)',
    examples: [
        { title: '10×8 Floor', input: '12×12 in tile, 1/8 in grout, 10% waste, 10/box', result: '≈ 91 tiles → 10 boxes' },
        { title: '8×5 Bathroom Wall', input: '12×24 in tile, 1/16 in grout, 10% waste, 8/box', result: '≈ 41 tiles → 6 boxes' },
        { title: 'Large-Format Kitchen', input: '24×24 in tile, 1/8 in grout, 15% waste, 6/box', result: '≈ 26 tiles → 5 boxes' },
    ],
    faqs: [
        { q: 'How many 12×12 tiles do I need for a 100 sq ft room?', a: 'A 12×12 tile covers exactly 1 sq ft, so you need about 100 tiles before waste. With a standard 10% waste factor, buy about 110 tiles. If tile comes 10 per box, that is 11 boxes.' },
        { q: 'What is a good waste factor for tile?', a: 'Use 10% for straight layouts and large open rooms. Use 15% or more for diagonal installations, herringbone patterns, small bathrooms with many cuts, or large-format tile that is harder to cut cleanly.' },
        { q: 'Does the grout gap affect how many tiles I need?', a: 'Slightly. A 1/8-inch grout gap increases the center-to-center spacing of 12-inch tiles to 12.125 inches, so you fit marginally more tiles per row. The difference matters most over large areas — our calculator includes it.' },
        { q: 'Should I keep extra tiles after my project?', a: 'Yes. Store unopened boxes for at least the warranty period or several years. Tile dyes are made in batches, and matching an old tile later is often impossible — extras make future repairs seamless.' },
    ],
};

// ── Stair Calculator ────────────────────────────────────────────
//
// Design basis (verified against IRC R311.7 and the "2R + T" rule):
//   • Risers    = round(Total Rise ÷ Preferred Riser)
//   • Riser in  = Total Rise ÷ Risers   → even, code-compliant risers
//   • Treads    = Risers − 1
//   • Tread in  = 25 − (2 × Riser)      → comfort rule (2R + T ≈ 24–25 in),
//                or a user-supplied custom tread depth
//   • Total Run = Treads × Tread
//   • Stringer length = √(Total Run² + Total Rise²)  (hypotenuse)
//   • Stringers ≈ ceil(Width ÷ 16 in) spacing        (≥ 2)
// IRC limits: max riser ≤ 7.75 in, min tread ≥ 10 in, min headroom 80 in.

export const stairCalculator = {
    id: 'stair-calculator',
    name: 'Stair Calculator',
    category: 'Construction',
    icon: 'fa-route',
    iconClass: 'icon-construction',
    tagClass: 'tag-construction',
    description: 'Design a staircase with the correct number of risers and treads from your total rise — includes even riser heights, comfortable tread depth, total run, stringer length, and an IRC code-compliance check.',
    metaDescription: 'Free stair calculator — design a staircase with the right number of risers and treads from your total rise, including even riser heights, comfortable tread depth, total run, stringer length, stringer count, and an IRC code-compliance check.',
    keywords: ['stair calculator', 'staircase calculator', 'risers and treads calculator', 'stringer calculator'],
    fields: [
        // ── Basic Inputs ──
        { id: 'sec_basic', type: 'section', label: 'Stair Dimensions', icon: 'fa-route' },
        { id: 'total_height', label: 'Total Rise (in)', type: 'number', default: 108, min: 1, max: 480, step: 1,
            hint: 'The total vertical height the staircase must climb — normally the floor-to-floor height.' },
        { id: 'preferred_riser', label: 'Preferred Riser Height (in)', type: 'number', default: 7, min: 3, max: 10, step: 0.25,
            hint: 'Your target riser height. 7 in is ideal; the calculator keeps every riser identical.' },
        { id: 'stair_width', label: 'Stair Width (in)', type: 'number', default: 36, min: 12, max: 240, step: 6,
            hint: 'Inside-to-inside width of the stair opening. Used to estimate stringer count.' },

        // ── Advanced Options (collapsible) ──
        { id: 'sec_adv', type: 'section', label: 'Advanced Options', icon: 'fa-gear', collapsible: true },
        { id: 'tread_mode', label: 'Tread Depth Mode', type: 'select', default: 'comfort',
            options: [
                { value: 'comfort', label: 'Comfort rule (2R + T = 25 in)' },
                { value: 'custom',  label: 'Use my own tread depth' },
            ],
            hint: 'Comfort mode auto-sizes the tread from the riser height; choose custom to set it exactly.' },
        { id: 'target_tread', label: 'Custom Tread Depth (in)', type: 'number', default: 10, min: 6, max: 16, step: 0.25,
            hint: 'Exact tread depth to use when "Custom" tread mode is selected.',
            condition: (v) => v.tread_mode === 'custom' },
        { id: 'building_code', label: 'Building Code Target', type: 'select', default: 'irc',
            options: [
                { value: 'irc',  label: 'IRC (max riser 7.75 in, min tread 10 in)' },
                { value: 'none', label: 'No code limits (bare minimum design)' },
            ],
            hint: 'IRC (International Residential Code) is the default US residential standard.' },
        { id: 'landing', label: 'Landing Configuration', type: 'select', default: 'none',
            options: [
                { value: 'none',   label: 'None' },
                { value: 'top',    label: 'Landing at top' },
                { value: 'bottom', label: 'Landing at bottom' },
                { value: 'both',   label: 'Landing at top and bottom' },
            ],
            hint: 'A level landing adds depth and material; note it in your framing plan.' },
        { id: 'headroom', label: 'Headroom Clearance (in)', type: 'number', default: 84, min: 60, max: 120, step: 1,
            hint: 'Vertical clearance above the stair tread nose. IRC requires at least 80 in.' },
        { id: 'material_waste', label: 'Material Waste (%)', type: 'number', default: 10, min: 0, max: 30, step: 1,
            hint: 'Extra material for cuts and errors when purchasing lumber and tread stock.' },
    ],
    calculate(v) {
        const totalRise = safeNum(v.total_height, 108);
        const preferred = safeNum(v.preferred_riser, 7);
        const width = safeNum(v.stair_width, 36);
        const treadMode = v.tread_mode || 'comfort';
        const customTread = safeNum(v.target_tread, 10);
        const code = v.building_code || 'irc';
        const landing = v.landing || 'none';
        const headroom = safeNum(v.headroom, 84);
        const waste = safeNum(v.material_waste, 10);

        if (totalRise <= 0 || preferred <= 0 || width <= 0) {
            return errorResult('Enter valid positive dimensions for total rise, riser height, and stair width.');
        }

        // Number of risers — always an integer so every riser is identical.
        let numRisers = Math.max(1, Math.round(totalRise / preferred));
        const riser = roundTo(totalRise / numRisers, 2);
        const numTreads = numRisers - 1;

        if (numTreads < 1) {
            return errorResult('Total rise is too small to build a staircase at the given riser height. Increase the rise or lower the preferred riser.');
        }

        // Tread depth: custom or the comfort rule 2R + T = 25.
        let tread;
        if (treadMode === 'custom' && customTread > 0) {
            tread = roundTo(Math.min(16, Math.max(6, customTread)), 2);
        } else {
            tread = roundTo(Math.min(14, Math.max(6, 25 - 2 * riser)), 2);
        }

        const totalRun = roundTo(numTreads * tread, 2);
        const stringerLength = roundTo(Math.sqrt(totalRun * totalRun + totalRise * totalRise), 2);
        const stringers = Math.max(2, Math.ceil(width / 16));
        const stairAngle = roundTo(Math.atan(totalRise / totalRun) * 180 / Math.PI, 1);

        // Code-compliance check (IRC R311.7).
        const maxRiser = code === 'irc' ? 7.75 : Infinity;
        const minTread = code === 'irc' ? 10 : 0;
        const riserOk = riser <= maxRiser;
        const treadOk = tread >= minTread;
        const compliant = riserOk && treadOk;
        const headroomOk = headroom >= 80;

        // Personalized insights.
        const insights = [];
        if (!riserOk) insights.push('Your riser height of ' + riser + ' in exceeds the IRC maximum of 7.75 in. Add another step so each riser is shorter.');
        if (!treadOk) insights.push('Your tread depth of ' + tread + ' in is shallower than the IRC minimum of 10 in. Use "Custom" tread mode to set a deeper, safer tread.');
        if (code === 'irc' && compliant) insights.push('Your risers and treads are within IRC limits — a compliant single-family residential stair.');
        if (landing !== 'none') insights.push('The ' + landing + ' landing adds a level walk-out depth of roughly 36 in and extra framing material beyond the stair run itself.');
        insights.push('For a ' + width + ' in wide stair, plan on about ' + stringers + ' stringers spaced roughly 16 in apart.');
        if (!headroomOk) insights.push('Your ' + headroom + ' in headroom is below the 80 in IRC minimum. Open up the stairwell or move the upper-floor opening.');

        // Step-by-step detail table (mirrors an amortization-style breakdown).
        const tableRows = [];
        const riserArr = [];
        const treadArr = [];
        for (let s = 1; s <= numTreads; s++) {
            tableRows.push({
                step: s,
                riser,
                tread,
                cumHeight: roundTo(s * riser, 2),
                cumRun: roundTo(s * tread, 2),
            });
            riserArr.push(riser);
            treadArr.push(tread);
        }

        const chartLabels = Array.from({ length: numTreads }, (_, s) => 'Step ' + (s + 1));

        return {
            stats: [
                { label: 'Risers Needed', value: numRisers + ' risers' },
                { label: 'Riser Height', value: riser + ' in', highlight: true },
                { label: 'Treads Needed', value: numTreads + ' treads' },
                { label: 'Tread Depth', value: tread + ' in', highlight: true },
                { label: 'Total Run', value: totalRun + ' in (' + roundTo(totalRun / 12, 2) + ' ft)' },
                { label: 'Stringer Length', value: stringerLength + ' in' },
                { label: 'Stringers Needed', value: stringers + ' stringers' },
                { label: 'Stair Angle', value: stairAngle + '°' },
            ],
            insight: {
                tone: compliant ? 'positive' : 'warning',
                icon: 'fa-route',
                headline: 'A ' + numRisers + '-riser staircase with ' + riser + ' in risers and ' + tread + ' in treads.',
                detail: compliant
                    ? ('Spans ' + totalRun + ' in across ' + numTreads + ' treads with a ' + stringerLength + ' in stringer. Add ~' + waste + '% material waste when buying lumber.')
                    : 'Check your riser and tread sizes against your local code before framing — the calculator flags which value is out of range.',
            },
            insights,
            chart: {
                type: 'bar',
                labels: chartLabels,
                datasets: [
                    { label: 'Riser (in)', data: riserArr, color: '#6366F1' },
                    { label: 'Tread (in)', data: treadArr, color: '#10B981' },
                ],
                legendPosition: 'bottom',
                format: 'number',
            },
            table: {
                mode: true,
                title: 'Step-by-Step Stair Detail',
                columns: [
                    { key: 'step', label: 'Step' },
                    { key: 'riser', label: 'Riser (in)', format: 'number' },
                    { key: 'tread', label: 'Tread (in)', format: 'number' },
                    { key: 'cumHeight', label: 'Cumulative Height (in)', format: 'number' },
                    { key: 'cumRun', label: 'Cumulative Run (in)', format: 'number' },
                ],
                rows: tableRows,
                footer: {
                    step: 'Totals',
                    riser: roundTo(totalRise, 2),
                    tread: '—',
                    cumHeight: roundTo(totalRise, 2),
                    cumRun: totalRun,
                },
            },
        };
    },
article: {
        heading: 'How to Calculate Stair Risers and Treads',
        intro: 'Good stairs feel effortless because every riser is identical and every tread is deep enough for a confident step. The GetCalcu Stair Calculator turns a single measurement — your total rise — into a full, code-compliant design: the number of risers, exact riser height, comfortable tread depth, total run, stringer length, and a step-by-step breakdown.',
        sections: [
            { heading: 'Start With Your Total Rise', body: 'Total rise is the vertical distance between the two finished floors. Measure it precisely — a quarter-inch error multiplied across eight risers is a two-inch problem at the top step. Once you have the rise, divide by your preferred riser height and round to a whole number of risers, then divide the total rise by that count so every step is exactly the same.' },
            { heading: 'The Comfort Rule: 2R + T = 25', body: 'Decades of stair design have produced a simple rule of thumb: two riser heights plus one tread depth should land near 25 inches. For a 7-inch riser that gives a 10-to-11-inch tread, which feels natural for an average stride. The GetCalcu Stair Calculator applies this automatically, or you can override it with your own tread depth.' },
            { heading: 'Meeting Building Code', body: 'The International Residential Code (IRC) caps risers at 7.75 inches and requires treads of at least 10 inches, with 80 inches of headroom measured vertically above the tread nose. Any interior stair (and most exterior ones) must meet these limits to pass inspection, so our calculator compares your design against them and flags violations.' },
            { heading: 'Framing the Stringers', body: 'Stringers are the inclined boards that carry the treads. Space them roughly every 16 inches across the stair width in addition to the two outer ones, and cut each one from a board at least as long as the diagonal distance between the top and bottom of the stair run.' },
        ],
    },
    howTo: [
        'Measure the total vertical rise between the two floors and enter it in inches.',
        'Enter a preferred riser height — 7 in is comfortable — and the stair width.',
        'Choose "Comfort rule" for an automatic tread depth, or "Custom" to set your own.',
        'Pick a building code target (IRC is the US default) and any landing/headroom requirements.',
        'Press Calculate to see the full design plus a step-by-step dimension table.',
    ],
    formula: 'Risers = round(Total Rise ÷ Preferred Riser) | Riser = Total Rise ÷ Risers | Treads = Risers − 1 | Tread = 25 − (2 × Riser) [comfort] | Total Run = Treads × Tread | Stringer = √(Run² + Rise²)',
    examples: [
        { title: '9 ft Floor-to-Floor', input: 'Total rise 108 in, preferred riser 7 in, width 36 in', result: '15 risers @ 7.2 in, 14 treads @ 10.6 in, run 148.4 in' },
        { title: 'Basement Stairs', input: 'Total rise 96 in, preferred riser 7 in, width 30 in', result: '14 risers @ 6.86 in, 13 treads @ 11.29 in, run 146.7 in' },
        { title: 'Deck Steps', input: 'Total rise 36 in, preferred riser 7 in, width 48 in', result: '5 risers @ 7.2 in, 4 treads @ 10.6 in, run 42.4 in' },
    ],
    faqs: [
        { q: 'How many steps do I need for a 9-foot ceiling?', a: 'Measure the total rise between finished floors (usually about 108-110 inches). Divide by a 7-inch riser and round: 108 ÷ 7 = 15.4, so 15 risers at 7.2 inches each. That gives 14 treads running about 148 inches out from the top step.' },
        { q: 'What is the maximum riser height allowed by code?', a: 'Under the International Residential Code (IRC), a single-family residential stair riser may not exceed 7.75 inches, and all risers in one flight must be within a tiny tolerance of each other. Treads must be at least 10 inches deep.' },
        { q: 'How do I find the comfortable tread depth?', a: 'Use the 2R + T rule: two riser heights plus the tread depth should equal about 25 inches. So for a 7-inch riser, a 10-to-11-inch tread feels natural. Too-shallow treads cause toe-catching; too-deep ones make the stride awkward.' },
        { q: 'How long should my stair stringers be?', a: 'A stringer is the hypotenuse of the right triangle formed by the total rise and the total run. For a 15-riser stair that is 108 inches high and 148 inches of run, the stringer is about 183 inches (15 feet 3 inches) on the long edge.' },
    ],
};
// ── Export all construction calculators ─────────────────────────

export const constructionCalculators = [
    concreteCalculator,
    paintCalculator,
    tileCalculator,
    stairCalculator,
];

/**
 * Register all construction calculators with the tool registry
 * @param {Function} registerTool - Tool registration function
 * @param {Function} toolExists - Tool existence check function
 */
export function registerConstructionCalculators(registerTool, toolExists) {
    constructionCalculators.forEach(calculator => {
        if (toolExists && toolExists(calculator.id)) {
            return;
        }
        registerTool(calculator.id, calculator);
    });
}