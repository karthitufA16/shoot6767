export type ClassLevel = 6 | 7 | 8 | 9 | 10;

export const CLASS_LEVELS: ClassLevel[] = [6, 7, 8, 9, 10];

export function getCambridgeStageLabel(cls: ClassLevel): string {
  if (cls === 6) return 'Cambridge Primary · Stage 6';
  if (cls <= 9) return `Cambridge Lower Secondary · Stage ${cls}`;
  return 'Cambridge IGCSE · Class 10';
}

export type SubjectId = 'mixed' | 'math' | 'science' | 'english' | 'history' | 'coding';

export interface SubjectMeta {
  id: SubjectId;
  label: string;
}

export const SUBJECTS: Record<SubjectId, SubjectMeta> = {
  mixed: { id: 'mixed', label: 'All Subjects' },
  math: { id: 'math', label: 'Mathematics' },
  science: { id: 'science', label: 'Science' },
  english: { id: 'english', label: 'English' },
  history: { id: 'history', label: 'History & Geo' },
  coding: { id: 'coding', label: 'Computing' },
};

export interface QuizQuestion {
  id: string;
  subject: Exclude<SubjectId, 'mixed'>;
  minClass: ClassLevel;
  maxClass: ClassLevel;
  cambridgeRef: string;
  prompt: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface RoundOverchargePerk {
  id: 'shield' | 'damage' | 'speed' | 'utility';
  label: string;
  bonusHp: number;
  damageMult: number;
  speedMult: number;
  extraUtility: number;
}

export const ROUND_PERKS: RoundOverchargePerk[] = [
  {
    id: 'shield',
    label: '+30 Knowledge Shield (180 Max HP)',
    bonusHp: 30,
    damageMult: 1,
    speedMult: 1,
    extraUtility: 0,
  },
  {
    id: 'damage',
    label: '+15% Overcharge Weapon Damage',
    bonusHp: 0,
    damageMult: 1.15,
    speedMult: 1,
    extraUtility: 0,
  },
  {
    id: 'speed',
    label: '+12% Agility & Slide Momentum',
    bonusHp: 0,
    damageMult: 1,
    speedMult: 1.12,
    extraUtility: 0,
  },
  {
    id: 'utility',
    label: '+1 Bonus Tactical Utility Charge',
    bonusHp: 0,
    damageMult: 1,
    speedMult: 1,
    extraUtility: 1,
  },
];

export const QUESTION_BANK: QuizQuestion[] = [
  // ==================== CLASS 6 (Cambridge Primary Checkpoint / Stage 6) ====================
  {
    id: 'c6-math-1',
    subject: 'math',
    minClass: 6,
    maxClass: 6,
    cambridgeRef: 'Primary Checkpoint · Number',
    prompt: 'Using the order of operations (BIDMAS), what is the value of 4 + 3 × 2?',
    choices: ['14', '10', '12', '9'],
    correctIndex: 1,
    explanation: 'Multiplication comes before addition: 3 × 2 = 6, then 4 + 6 = 10.',
  },
  {
    id: 'c6-math-2',
    subject: 'math',
    minClass: 6,
    maxClass: 6,
    cambridgeRef: 'Primary Checkpoint · Geometry',
    prompt: 'What is the sum of the three interior angles inside any triangle?',
    choices: ['90°', '180°', '270°', '360°'],
    correctIndex: 1,
    explanation: 'The three interior angles of every Euclidean triangle always add up to 180°.',
  },
  {
    id: 'c6-sci-1',
    subject: 'science',
    minClass: 6,
    maxClass: 6,
    cambridgeRef: 'Primary Checkpoint · Physics',
    prompt: 'Which material is a good electrical CONDUCTOR?',
    choices: ['Rubber', 'Plastic', 'Copper', 'Dry wood'],
    correctIndex: 2,
    explanation: 'Metals like copper have free-moving electrons that allow electric current to flow easily.',
  },
  {
    id: 'c6-sci-2',
    subject: 'science',
    minClass: 6,
    maxClass: 6,
    cambridgeRef: 'Primary Checkpoint · Biology',
    prompt: 'In a food chain, what do we call green plants that make their own food using sunlight?',
    choices: ['Producers', 'Herbivores', 'Decomposers', 'Apex predators'],
    correctIndex: 0,
    explanation: 'Plants are producers because they convert sunlight into glucose via photosynthesis.',
  },
  {
    id: 'c6-eng-1',
    subject: 'english',
    minClass: 6,
    maxClass: 6,
    cambridgeRef: 'Primary Checkpoint · English',
    prompt: '"The howling wind whispered warnings through the containers." Which technique gives human actions to the wind?',
    choices: ['Personification', 'Hyperbole', 'Pun', 'Oxymoron'],
    correctIndex: 0,
    explanation: 'Personification attributes human qualities ("whispered warnings") to non-human things.',
  },
  {
    id: 'c6-hist-1',
    subject: 'history',
    minClass: 6,
    maxClass: 6,
    cambridgeRef: 'Primary Checkpoint · History',
    prompt: 'The Magna Carta (1215), which limited royal power and established due process, was sealed in which country?',
    choices: ['France', 'England', 'Spain', 'Italy'],
    correctIndex: 1,
    explanation: 'King John of England sealed the Magna Carta at Runnymede in 1215.',
  },
  {
    id: 'c6-code-1',
    subject: 'coding',
    minClass: 6,
    maxClass: 6,
    cambridgeRef: 'Primary Checkpoint · Computing',
    prompt: 'In binary (base-2), what decimal number does 1011 represent?',
    choices: ['9', '10', '11', '13'],
    correctIndex: 2,
    explanation: '1011₂ = (1×8) + (0×4) + (1×2) + (1×1) = 11.',
  },

  // ==================== CLASS 7 (Cambridge Lower Secondary Stage 7) ====================
  {
    id: 'c7-math-1',
    subject: 'math',
    minClass: 7,
    maxClass: 7,
    cambridgeRef: 'Lower Secondary Stage 7 · Algebra',
    prompt: 'Simplify the algebraic expression: 4a + 3b − a + 2b',
    choices: ['3a + 5b', '5a + 5b', '3a + b', '4a + 5b'],
    correctIndex: 0,
    explanation: 'Combine like terms: (4a − a) = 3a and (3b + 2b) = 5b, giving 3a + 5b.',
  },
  {
    id: 'c7-math-2',
    subject: 'math',
    minClass: 7,
    maxClass: 7,
    cambridgeRef: 'Lower Secondary Stage 7 · Probability',
    prompt: 'Two fair 6-sided dice are rolled. How many total equally likely outcomes exist?',
    choices: ['12', '24', '36', '18'],
    correctIndex: 2,
    explanation: 'By the product rule for independent events, 6 × 6 = 36 total outcomes.',
  },
  {
    id: 'c7-sci-1',
    subject: 'science',
    minClass: 7,
    maxClass: 7,
    cambridgeRef: 'Lower Secondary Stage 7 · Biology',
    prompt: 'Which two structures are found in plant cells but NOT in animal cells?',
    choices: [
      'Nucleus and cytoplasm',
      'Cell wall and chloroplasts',
      'Cell membrane and mitochondria',
      'Ribosomes and nucleus',
    ],
    correctIndex: 1,
    explanation: 'Plant cells possess a rigid cellulose cell wall and chloroplasts for photosynthesis.',
  },
  {
    id: 'c7-sci-2',
    subject: 'science',
    minClass: 7,
    maxClass: 7,
    cambridgeRef: 'Lower Secondary Stage 7 · Chemistry',
    prompt: 'What is the pH value of pure neutral water at 25°C?',
    choices: ['0', '4', '7', '14'],
    correctIndex: 2,
    explanation: 'On the 0–14 pH scale, 7 is neutral, below 7 is acidic, and above 7 is alkaline.',
  },
  {
    id: 'c7-eng-1',
    subject: 'english',
    minClass: 7,
    maxClass: 7,
    cambridgeRef: 'Lower Secondary Stage 7 · English',
    prompt: 'Which word is an example of ONOMATOPOEIA?',
    choices: ['Silent', 'Crash', 'Golden', 'Swiftly'],
    correctIndex: 1,
    explanation: 'Onomatopoeia uses words that imitate the natural sound they describe, like "crash" or "buzz".',
  },
  {
    id: 'c7-hist-1',
    subject: 'history',
    minClass: 7,
    maxClass: 7,
    cambridgeRef: 'Lower Secondary Stage 7 · History',
    prompt: 'Which invention powered factories, trains, and ships during the 18th-century Industrial Revolution?',
    choices: ['Steam engine', 'Solar panel', 'Jet turbine', 'Microchip'],
    correctIndex: 0,
    explanation: 'James Watt’s improved steam engine unlocked mechanized factories and rail transport.',
  },
  {
    id: 'c7-code-1',
    subject: 'coding',
    minClass: 7,
    maxClass: 7,
    cambridgeRef: 'Lower Secondary Stage 7 · Computing',
    prompt: 'In boolean logic, what is the result of (true && false) || true?',
    choices: ['false', 'true', 'null', 'error'],
    correctIndex: 1,
    explanation: '(true && false) evaluates to false, and (false || true) evaluates to true.',
  },

  // ==================== CLASS 8 (Cambridge Lower Secondary Stage 8) ====================
  {
    id: 'c8-math-1',
    subject: 'math',
    minClass: 8,
    maxClass: 8,
    cambridgeRef: 'Lower Secondary Stage 8 · Algebra',
    prompt: 'Solve for x in the linear equation: 3x + 7 = 25',
    choices: ['5', '6', '7', '8'],
    correctIndex: 1,
    explanation: 'Subtract 7 to get 3x = 18, then divide by 3 to obtain x = 6.',
  },
  {
    id: 'c8-math-2',
    subject: 'math',
    minClass: 8,
    maxClass: 8,
    cambridgeRef: 'Lower Secondary Stage 8 · Geometry',
    prompt: 'A right-angled triangle has legs 6 m and 8 m. What is the length of its hypotenuse?',
    choices: ['10 m', '12 m', '14 m', '9 m'],
    correctIndex: 0,
    explanation: 'By Pythagoras’ theorem: √(6² + 8²) = √(36 + 64) = √100 = 10 m.',
  },
  {
    id: 'c8-sci-1',
    subject: 'science',
    minClass: 8,
    maxClass: 8,
    cambridgeRef: 'Lower Secondary Stage 8 · Physics',
    prompt: 'According to Newton’s Second Law, Force (F) equals mass (m) multiplied by what?',
    choices: ['Velocity', 'Acceleration', 'Density', 'Friction'],
    correctIndex: 1,
    explanation: 'Newton’s Second Law states F = m × a (Force = mass × acceleration).',
  },
  {
    id: 'c8-sci-2',
    subject: 'science',
    minClass: 8,
    maxClass: 8,
    cambridgeRef: 'Lower Secondary Stage 8 · Chemistry',
    prompt: 'Which element has the chemical symbol "Au" on the periodic table?',
    choices: ['Silver', 'Aluminum', 'Gold', 'Argon'],
    correctIndex: 2,
    explanation: '"Au" comes from aurum, the Latin word for gold.',
  },
  {
    id: 'c8-eng-1',
    subject: 'english',
    minClass: 8,
    maxClass: 8,
    cambridgeRef: 'Lower Secondary Stage 8 · Punctuation',
    prompt: 'Which punctuation mark correctly joins two closely related independent clauses without a conjunction?',
    choices: ['Comma (,)', 'Semicolon (;)', 'Apostrophe (’)', 'Question mark (?)'],
    correctIndex: 1,
    explanation: 'A semicolon links two complete, closely related clauses without creating a comma splice.',
  },
  {
    id: 'c8-hist-1',
    subject: 'history',
    minClass: 8,
    maxClass: 8,
    cambridgeRef: 'Lower Secondary Stage 8 · History',
    prompt: 'Who introduced the movable-type printing press in Europe around 1440?',
    choices: ['Johannes Gutenberg', 'Galileo Galilei', 'Leonardo da Vinci', 'Isaac Newton'],
    correctIndex: 0,
    explanation: 'Johannes Gutenberg’s printing press transformed literacy and the spread of Renaissance ideas.',
  },
  {
    id: 'c8-code-1',
    subject: 'coding',
    minClass: 8,
    maxClass: 8,
    cambridgeRef: 'Lower Secondary Stage 8 · Computer Science',
    prompt: 'Which data structure follows LIFO (Last-In, First-Out) order?',
    choices: ['Queue', 'Stack', 'Hash Table', 'Linked Array'],
    correctIndex: 1,
    explanation: 'A stack pushes and pops items at the top, so the last item added is the first removed.',
  },

  // ==================== CLASS 9 (Cambridge Lower Secondary Checkpoint / Stage 9) ====================
  {
    id: 'c9-math-1',
    subject: 'math',
    minClass: 9,
    maxClass: 9,
    cambridgeRef: 'Lower Secondary Checkpoint · Algebra',
    prompt: 'Factorize the difference of two squares: x² − 25',
    choices: ['(x − 5)²', '(x − 5)(x + 5)', '(x − 25)(x + 1)', '(x + 5)²'],
    correctIndex: 1,
    explanation: 'Using a² − b² = (a − b)(a + b), x² − 25 factors to (x − 5)(x + 5).',
  },
  {
    id: 'c9-math-2',
    subject: 'math',
    minClass: 9,
    maxClass: 9,
    cambridgeRef: 'Lower Secondary Checkpoint · Trigonometry',
    prompt: 'In a right-angled triangle, sin(θ) is equal to which ratio?',
    choices: [
      'Adjacent / Hypotenuse',
      'Opposite / Hypotenuse',
      'Opposite / Adjacent',
      'Hypotenuse / Opposite',
    ],
    correctIndex: 1,
    explanation: 'By SOH-CAH-TOA, sin(θ) = Opposite ÷ Hypotenuse.',
  },
  {
    id: 'c9-sci-1',
    subject: 'science',
    minClass: 9,
    maxClass: 9,
    cambridgeRef: 'Lower Secondary Checkpoint · Physics',
    prompt: 'If you double the velocity of a moving object, what happens to its kinetic energy (KE = ½mv²)?',
    choices: ['It stays the same', 'It doubles', 'It triples', 'It quadruples'],
    correctIndex: 3,
    explanation: 'Because KE depends on v², doubling velocity multiplies kinetic energy by 2² = 4.',
  },
  {
    id: 'c9-sci-2',
    subject: 'science',
    minClass: 9,
    maxClass: 9,
    cambridgeRef: 'Lower Secondary Checkpoint · Physics',
    prompt: 'According to Ohm’s Law, what is the voltage across a 4 Ω resistor carrying a current of 3 A?',
    choices: ['0.75 V', '1.33 V', '7 V', '12 V'],
    correctIndex: 3,
    explanation: 'Ohm’s Law states V = I × R, so V = 3 A × 4 Ω = 12 V.',
  },
  {
    id: 'c9-eng-1',
    subject: 'english',
    minClass: 9,
    maxClass: 9,
    cambridgeRef: 'Lower Secondary Checkpoint · English',
    prompt: '"Deafening silence filled the arena before the final round." What literary device pairs two opposite words together?',
    choices: ['Oxymoron', 'Euphemism', 'Anaphora', 'Assonance'],
    correctIndex: 0,
    explanation: 'An oxymoron places contradictory terms side by side ("deafening silence") for dramatic contrast.',
  },
  {
    id: 'c9-hist-1',
    subject: 'history',
    minClass: 9,
    maxClass: 9,
    cambridgeRef: 'Lower Secondary Checkpoint · Geography',
    prompt: 'Which atmospheric gas makes up approximately 78% of Earth’s dry atmosphere?',
    choices: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Argon'],
    correctIndex: 2,
    explanation: 'Dry air consists of about 78% nitrogen, 21% oxygen, and 1% trace gases.',
  },
  {
    id: 'c9-code-1',
    subject: 'coding',
    minClass: 9,
    maxClass: 9,
    cambridgeRef: 'Lower Secondary Checkpoint · Algorithms',
    prompt: 'What is the worst-case time complexity of binary search on a sorted list of n items?',
    choices: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctIndex: 1,
    explanation: 'Binary search cuts the search interval in half each step, taking O(log n) steps.',
  },

  // ==================== CLASS 10 (Cambridge IGCSE) ====================
  {
    id: 'c10-math-1',
    subject: 'math',
    minClass: 10,
    maxClass: 10,
    cambridgeRef: 'Cambridge IGCSE · Mathematics (0580)',
    prompt: 'By the IGCSE circle theorem, what is the angle subtended by a diameter at any point on the circumference?',
    choices: ['45°', '60°', '90°', '180°'],
    correctIndex: 2,
    explanation: 'Thales’ theorem (angle in a semicircle) states the angle subtended by a diameter at the circumference is always 90°.',
  },
  {
    id: 'c10-math-2',
    subject: 'math',
    minClass: 10,
    maxClass: 10,
    cambridgeRef: 'Cambridge IGCSE · Calculus',
    prompt: 'For the curve y = x³ − 4x, what is the gradient function dy/dx?',
    choices: ['3x² − 4', 'x² − 4', '3x³ − 4', '3x² − 4x'],
    correctIndex: 0,
    explanation: 'Using the power rule d/dx(xⁿ) = nxⁿ⁻¹, d/dx(x³ − 4x) = 3x² − 4.',
  },
  {
    id: 'c10-sci-1',
    subject: 'science',
    minClass: 10,
    maxClass: 10,
    cambridgeRef: 'Cambridge IGCSE · Physics (0625)',
    prompt: 'Ignoring air resistance, which launch angle gives a projectile its maximum horizontal range on level ground?',
    choices: ['30°', '45°', '60°', '75°'],
    correctIndex: 1,
    explanation: 'Horizontal range R = (v² sin 2θ)/g reaches its peak when sin(2θ) = 1, i.e., θ = 45°.',
  },
  {
    id: 'c10-sci-2',
    subject: 'science',
    minClass: 10,
    maxClass: 10,
    cambridgeRef: 'Cambridge IGCSE · Chemistry (0620)',
    prompt: 'How do atoms achieve stability in an IONIC bond (such as NaCl)?',
    choices: [
      'Sharing electrons equally',
      'Transferring electrons to form oppositely charged ions',
      'Fusing atomic nuclei together',
      'Losing all protons',
    ],
    correctIndex: 1,
    explanation: 'Ionic bonding occurs when a metal transfers valence electrons to a non-metal, creating electrostatic attraction between ions.',
  },
  {
    id: 'c10-eng-1',
    subject: 'english',
    minClass: 10,
    maxClass: 10,
    cambridgeRef: 'Cambridge IGCSE · First Language English (0500)',
    prompt: 'In drama or fiction, when the audience knows a crucial danger that the character on stage does not, what is this called?',
    choices: ['Dramatic irony', 'Pathetic fallacy', 'Verbal pun', 'Epilogue'],
    correctIndex: 0,
    explanation: 'Dramatic irony builds tension because the reader or audience holds knowledge hidden from the characters.',
  },
  {
    id: 'c10-hist-1',
    subject: 'history',
    minClass: 10,
    maxClass: 10,
    cambridgeRef: 'Cambridge IGCSE · Geography (0460)',
    prompt: 'At a destructive (convergent) plate boundary where oceanic crust meets continental crust, what happens?',
    choices: [
      'The denser oceanic plate subducts beneath the continental plate',
      'Both plates shrink and vanish',
      'Plates only slide sideways without earthquakes',
      'New ocean floor expands outward',
    ],
    correctIndex: 0,
    explanation: 'Denser basaltic oceanic crust sinks into the mantle beneath lighter granitic continental crust, forming trenches and volcanoes.',
  },
  {
    id: 'c10-code-1',
    subject: 'coding',
    minClass: 10,
    maxClass: 10,
    cambridgeRef: 'Cambridge IGCSE · Computer Science (0478)',
    prompt: 'In 3D engines, which vector dot product property checks if a player is facing a target?',
    choices: [
      'a · b gives the cosine of the angle between unit vectors',
      'a · b returns a perpendicular 3D vector',
      'a · b sorts polygons by depth',
      'a · b compresses texture memory',
    ],
    correctIndex: 0,
    explanation: 'For unit vectors a and b, dot(a, b) = cos(θ): positive when facing the same direction, 0 at 90°, negative when behind.',
  },
];

// ==================== PROCEDURAL NON-REPEATING CAMBRIDGE GENERATORS ====================

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildShuffledChoices(
  correct: string,
  distractors: string[]
): { choices: [string, string, string, string]; correctIndex: 0 | 1 | 2 | 3 } {
  const uniqueDistractors = Array.from(new Set(distractors.filter((d) => d !== correct))).slice(0, 3);
  while (uniqueDistractors.length < 3) {
    uniqueDistractors.push(`Option ${uniqueDistractors.length + 1}`);
  }
  const items = [correct, ...uniqueDistractors];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return {
    choices: items as [string, string, string, string],
    correctIndex: items.indexOf(correct) as 0 | 1 | 2 | 3,
  };
}

function generateMathQuestion(cls: ClassLevel): QuizQuestion {
  const ref = `${getCambridgeStageLabel(cls)} · Mathematics`;
  const variant = randInt(0, 2);

  if (cls === 6) {
    if (variant === 0) {
      const a = randInt(3, 15);
      const b = randInt(2, 8);
      const c = randInt(2, 7);
      const ans = a + b * c;
      const { choices, correctIndex } = buildShuffledChoices(String(ans), [
        String((a + b) * c),
        String(ans + 3),
        String(Math.max(1, ans - 4)),
      ]);
      return {
        id: `gen-c6-bidmas-${a}-${b}-${c}`,
        subject: 'math',
        minClass: 6,
        maxClass: 6,
        cambridgeRef: ref,
        prompt: `Using order of operations (BIDMAS), calculate: ${a} + ${b} × ${c}`,
        choices,
        correctIndex,
        explanation: `Multiply first (${b} × ${c} = ${b * c}), then add ${a} to get ${ans}.`,
      };
    }
    const a1 = randInt(35, 75);
    const a2 = randInt(35, 75);
    const a3 = 180 - a1 - a2;
    const { choices, correctIndex } = buildShuffledChoices(`${a3}°`, [
      `${a3 + 10}°`,
      `${Math.max(10, a3 - 10)}°`,
      `${360 - a1 - a2}°`,
    ]);
    return {
      id: `gen-c6-tri-${a1}-${a2}`,
      subject: 'math',
      minClass: 6,
      maxClass: 6,
      cambridgeRef: ref,
      prompt: `Two angles of a triangle are ${a1}° and ${a2}°. What is the third angle?`,
      choices,
      correctIndex,
      explanation: `Triangle angles sum to 180°, so 180° − ${a1}° − ${a2}° = ${a3}°.`,
    };
  }

  if (cls === 7) {
    if (variant === 0) {
      const a = randInt(-14, -3);
      const b = randInt(5, 22);
      const ans = a + b;
      const { choices, correctIndex } = buildShuffledChoices(String(ans), [
        String(ans - 2),
        String(ans + 4),
        String(Math.abs(a) + b),
      ]);
      return {
        id: `gen-c7-int-${a}-${b}`,
        subject: 'math',
        minClass: 7,
        maxClass: 7,
        cambridgeRef: ref,
        prompt: `Evaluate the directed number calculation: (${a}) + ${b}`,
        choices,
        correctIndex,
        explanation: `Starting at ${a} on the number line and moving ${b} steps right reaches ${ans}.`,
      };
    }
    const n1 = randInt(4, 14);
    const n2 = n1 + 2;
    const n3 = n1 + 4;
    const n4 = n1 + 6;
    const mean = n1 + 3;
    const { choices, correctIndex } = buildShuffledChoices(String(mean), [
      String(mean + 1),
      String(mean - 1),
      String(n4),
    ]);
    return {
      id: `gen-c7-mean-${n1}`,
      subject: 'math',
      minClass: 7,
      maxClass: 7,
      cambridgeRef: ref,
      prompt: `Find the mean (average) of the four scores: ${n1}, ${n2}, ${n3}, ${n4}`,
      choices,
      correctIndex,
      explanation: `Sum = ${n1 + n2 + n3 + n4}, and dividing by 4 gives ${mean}.`,
    };
  }

  if (cls === 8) {
    if (variant === 0) {
      const m = randInt(2, 7);
      const x = randInt(2, 11);
      const b = randInt(3, 15);
      const rhs = m * x + b;
      const { choices, correctIndex } = buildShuffledChoices(`x = ${x}`, [
        `x = ${x + 1}`,
        `x = ${Math.max(1, x - 1)}`,
        `x = ${x + 3}`,
      ]);
      return {
        id: `gen-c8-lin-${m}-${x}-${b}`,
        subject: 'math',
        minClass: 8,
        maxClass: 8,
        cambridgeRef: ref,
        prompt: `Solve for x: ${m}x + ${b} = ${rhs}`,
        choices,
        correctIndex,
        explanation: `Subtract ${b} to get ${m}x = ${m * x}, then divide by ${m} to get x = ${x}.`,
      };
    }
    const k = randInt(1, 5);
    const a = 3 * k;
    const b = 4 * k;
    const c = 5 * k;
    const { choices, correctIndex } = buildShuffledChoices(`${c} m`, [
      `${a + b} m`,
      `${c + 2} m`,
      `${Math.max(2, c - 2)} m`,
    ]);
    return {
      id: `gen-c8-pyth-${a}-${b}`,
      subject: 'math',
      minClass: 8,
      maxClass: 8,
      cambridgeRef: ref,
      prompt: `A right-angled triangle has legs ${a} m and ${b} m. Find the hypotenuse.`,
      choices,
      correctIndex,
      explanation: `√(${a}² + ${b}²) = √(${a * a + b * b}) = ${c} m.`,
    };
  }

  if (cls === 9) {
    const k = randInt(2, 12);
    const kSq = k * k;
    const { choices, correctIndex } = buildShuffledChoices(`(x − ${k})(x + ${k})`, [
      `(x − ${k})²`,
      `(x + ${k})²`,
      `(x − ${kSq})(x + 1)`,
    ]);
    return {
      id: `gen-c9-sq-${k}`,
      subject: 'math',
      minClass: 9,
      maxClass: 9,
      cambridgeRef: ref,
      prompt: `Factorize completely: x² − ${kSq}`,
      choices,
      correctIndex,
      explanation: `Difference of two squares: a² − b² = (a − b)(a + b), giving (x − ${k})(x + ${k}).`,
    };
  }

  // Class 10 IGCSE
  const c3 = randInt(2, 6);
  const c1 = randInt(2, 9);
  const ans = `${3 * c3}x² + ${c1}`;
  const { choices, correctIndex } = buildShuffledChoices(ans, [
    `${c3}x² + ${c1}`,
    `${3 * c3}x² − ${c1}`,
    `${3 * c3}x + ${c1}`,
  ]);
  return {
    id: `gen-c10-deriv-${c3}-${c1}`,
    subject: 'math',
    minClass: 10,
    maxClass: 10,
    cambridgeRef: ref,
    prompt: `Find the derivative dy/dx of y = ${c3}x³ + ${c1}x − 7`,
    choices,
    correctIndex,
    explanation: `Using the power rule d/dx(axⁿ) = naxⁿ⁻¹, dy/dx = ${3 * c3}x² + ${c1}.`,
  };
}

function generateScienceQuestion(cls: ClassLevel): QuizQuestion {
  const ref = `${getCambridgeStageLabel(cls)} · Science`;
  if (cls <= 7) {
    const t = randInt(3, 9);
    const v = randInt(4, 15);
    const d = v * t;
    const { choices, correctIndex } = buildShuffledChoices(`${v} m/s`, [
      `${d * t} m/s`,
      `${v + 3} m/s`,
      `${Math.max(1, v - 2)} m/s`,
    ]);
    return {
      id: `gen-sci-spd-${d}-${t}`,
      subject: 'science',
      minClass: cls,
      maxClass: cls,
      cambridgeRef: ref,
      prompt: `A runner covers ${d} meters in ${t} seconds. What is their average speed?`,
      choices,
      correctIndex,
      explanation: `Speed = distance ÷ time = ${d} ÷ ${t} = ${v} m/s.`,
    };
  }
  if (cls === 8) {
    const m = randInt(3, 12);
    const a = randInt(2, 9);
    const f = m * a;
    const { choices, correctIndex } = buildShuffledChoices(`${f} N`, [
      `${m + a} N`,
      `${f + m} N`,
      `${Math.max(2, f - a)} N`,
    ]);
    return {
      id: `gen-sci-fma-${m}-${a}`,
      subject: 'science',
      minClass: 8,
      maxClass: 8,
      cambridgeRef: ref,
      prompt: `Using Newton’s Second Law (F = ma), what force accelerates a ${m} kg object at ${a} m/s²?`,
      choices,
      correctIndex,
      explanation: `F = m × a = ${m} kg × ${a} m/s² = ${f} N.`,
    };
  }
  if (cls === 9) {
    const i = randInt(2, 8);
    const r = randInt(3, 12);
    const v = i * r;
    const { choices, correctIndex } = buildShuffledChoices(`${v} V`, [
      `${i + r} V`,
      `${v + r} V`,
      `${Math.max(1, v - i)} V`,
    ]);
    return {
      id: `gen-sci-ohm-${i}-${r}`,
      subject: 'science',
      minClass: 9,
      maxClass: 9,
      cambridgeRef: ref,
      prompt: `By Ohm’s Law (V = IR), find the voltage across a ${r} Ω resistor with a ${i} A current.`,
      choices,
      correctIndex,
      explanation: `V = I × R = ${i} A × ${r} Ω = ${v} V.`,
    };
  }
  const m = [2, 4, 6, 8][randInt(0, 3)];
  const v = randInt(3, 9);
  const ke = 0.5 * m * v * v;
  const { choices, correctIndex } = buildShuffledChoices(`${ke} J`, [
    `${m * v} J`,
    `${m * v * v} J`,
    `${ke + 10} J`,
  ]);
  return {
    id: `gen-sci-ke-${m}-${v}`,
    subject: 'science',
    minClass: 10,
    maxClass: 10,
    cambridgeRef: ref,
    prompt: `Calculate the kinetic energy (KE = ½mv²) of a ${m} kg object moving at ${v} m/s.`,
    choices,
    correctIndex,
    explanation: `KE = 0.5 × ${m} × ${v}² = 0.5 × ${m} × ${v * v} = ${ke} J.`,
  };
}

function generateCodingQuestion(cls: ClassLevel): QuizQuestion {
  const ref = `${getCambridgeStageLabel(cls)} · Computing`;
  const minVal = cls <= 7 ? 5 : 16;
  const maxVal = cls <= 7 ? 31 : 255;
  const dec = randInt(minVal, maxVal);
  const bin = dec.toString(2);
  const { choices, correctIndex } = buildShuffledChoices(String(dec), [
    String(dec + 2),
    String(Math.max(1, dec - 1)),
    String(dec + 4),
  ]);
  return {
    id: `gen-code-bin-${dec}`,
    subject: 'coding',
    minClass: cls,
    maxClass: cls,
    cambridgeRef: ref,
    prompt: `Convert the binary number ${bin}₂ to decimal (base-10).`,
    choices,
    correctIndex,
    explanation: `Evaluating powers of 2 for binary ${bin}₂ gives ${dec}.`,
  };
}

const VOCAB_PAIRS: Array<{
  word: string;
  synonym: string;
  distractors: [string, string, string];
  minClass: ClassLevel;
  maxClass: ClassLevel;
}> = [
  { word: 'peculiar', synonym: 'unusual', distractors: ['ordinary', 'generous', 'punctual'], minClass: 6, maxClass: 7 },
  { word: 'reluctant', synonym: 'hesitant', distractors: ['eager', 'reckless', 'cheerful'], minClass: 6, maxClass: 9 },
  { word: 'resilient', synonym: 'adaptable', distractors: ['brittle', 'careless', 'hostile'], minClass: 6, maxClass: 10 },
  { word: 'meticulous', synonym: 'thorough', distractors: ['hasty', 'vague', 'clumsy'], minClass: 7, maxClass: 10 },
  { word: 'ephemeral', synonym: 'short-lived', distractors: ['permanent', 'ancient', 'tedious'], minClass: 8, maxClass: 10 },
  { word: 'ubiquitous', synonym: 'everywhere', distractors: ['scarce', 'invisible', 'fragile'], minClass: 9, maxClass: 10 },
];

const PREFIX_BANK: Array<{ prefix: string; meaning: string; example: string; distractors: [string, string, string] }> = [
  { prefix: 're-', meaning: 'again', example: 'rebuild', distractors: ['without', 'against', 'small'] },
  { prefix: 'pre-', meaning: 'before', example: 'preview', distractors: ['after', 'under', 'around'] },
  { prefix: 'sub-', meaning: 'under / below', example: 'submarine', distractors: ['above', 'twice', 'across'] },
  { prefix: 'mis-', meaning: 'wrongly', example: 'misread', distractors: ['quickly', 'twice', 'together'] },
  { prefix: 'inter-', meaning: 'between', example: 'international', distractors: ['inside', 'without', 'opposite'] },
  { prefix: 'anti-', meaning: 'against', example: 'antifreeze', distractors: ['with', 'before', 'many'] },
];

function generateEnglishQuestion(cls: ClassLevel): QuizQuestion {
  const ref = `${getCambridgeStageLabel(cls)} · English`;
  const matchingVocab = VOCAB_PAIRS.filter((v) => cls >= v.minClass && cls <= v.maxClass);
  if (Math.random() < 0.65 && matchingVocab.length > 0) {
    const v = matchingVocab[randInt(0, matchingVocab.length - 1)];
    const { choices, correctIndex } = buildShuffledChoices(v.synonym, v.distractors);
    return {
      id: `gen-eng-syn-${v.word}`,
      subject: 'english',
      minClass: cls,
      maxClass: cls,
      cambridgeRef: ref,
      prompt: `Which word is the closest synonym (same meaning) to "${v.word}"?`,
      choices,
      correctIndex,
      explanation: `"${v.synonym}" shares the same meaning as "${v.word}".`,
    };
  }
  const p = PREFIX_BANK[randInt(0, PREFIX_BANK.length - 1)];
  const { choices, correctIndex } = buildShuffledChoices(p.meaning, p.distractors);
  return {
    id: `gen-eng-pre-${p.prefix}`,
    subject: 'english',
    minClass: cls,
    maxClass: cls,
    cambridgeRef: ref,
    prompt: `In words like "${p.example}", what does the prefix "${p.prefix}" mean?`,
    choices,
    correctIndex,
    explanation: `The prefix "${p.prefix}" means "${p.meaning}" (e.g., "${p.example}").`,
  };
}

const CAPITALS: Array<{ country: string; capital: string; distractors: [string, string, string] }> = [
  { country: 'Japan', capital: 'Tokyo', distractors: ['Kyoto', 'Osaka', 'Seoul'] },
  { country: 'Australia', capital: 'Canberra', distractors: ['Sydney', 'Melbourne', 'Perth'] },
  { country: 'Canada', capital: 'Ottawa', distractors: ['Toronto', 'Vancouver', 'Montreal'] },
  { country: 'Brazil', capital: 'Brasília', distractors: ['Rio de Janeiro', 'São Paulo', 'Salvador'] },
  { country: 'Egypt', capital: 'Cairo', distractors: ['Alexandria', 'Luxor', 'Giza'] },
  { country: 'France', capital: 'Paris', distractors: ['Lyon', 'Marseille', 'Nice'] },
  { country: 'Kenya', capital: 'Nairobi', distractors: ['Mombasa', 'Kampala', 'Lagos'] },
  { country: 'India', capital: 'New Delhi', distractors: ['Mumbai', 'Bengaluru', 'Kolkata'] },
  { country: 'United Kingdom', capital: 'London', distractors: ['Manchester', 'Edinburgh', 'Birmingham'] },
  { country: 'South Korea', capital: 'Seoul', distractors: ['Busan', 'Incheon', 'Tokyo'] },
  { country: 'Germany', capital: 'Berlin', distractors: ['Munich', 'Hamburg', 'Frankfurt'] },
  { country: 'Italy', capital: 'Rome', distractors: ['Milan', 'Venice', 'Florence'] },
];

const LANDMARKS: Array<{ prompt: string; answer: string; distractors: [string, string, string]; exp: string }> = [
  {
    prompt: 'Which desert is the largest hot desert on Earth?',
    answer: 'Sahara',
    distractors: ['Gobi', 'Kalahari', 'Atacama'],
    exp: 'The Sahara covers ~9.2 million km² across North Africa.',
  },
  {
    prompt: 'Which ancient civilization built Machu Picchu in the Andes Mountains?',
    answer: 'Inca',
    distractors: ['Maya', 'Aztec', 'Olmec'],
    exp: 'The Inca Empire constructed Machu Picchu in the 15th century in modern Peru.',
  },
  {
    prompt: 'In what year did Apollo 11 first land humans on the Moon?',
    answer: '1969',
    distractors: ['1961', '1965', '1973'],
    exp: 'Apollo 11 landed on the Moon on July 20, 1969.',
  },
  {
    prompt: 'Which ocean is the largest and deepest ocean on Earth?',
    answer: 'Pacific Ocean',
    distractors: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
    exp: 'The Pacific Ocean covers nearly one-third of Earth’s surface and contains the Mariana Trench.',
  },
  {
    prompt: 'Which imaginary line at 0° latitude divides Earth into Northern and Southern Hemispheres?',
    answer: 'Equator',
    distractors: ['Prime Meridian', 'Tropic of Cancer', 'Arctic Circle'],
    exp: 'The Equator lies at 0° latitude halfway between the North and South Poles.',
  },
];

function generateHistoryQuestion(cls: ClassLevel): QuizQuestion {
  const ref = `${getCambridgeStageLabel(cls)} · History & Geography`;
  if (Math.random() < 0.6) {
    const c = CAPITALS[randInt(0, CAPITALS.length - 1)];
    const { choices, correctIndex } = buildShuffledChoices(c.capital, c.distractors);
    return {
      id: `gen-geo-cap-${c.country}`,
      subject: 'history',
      minClass: cls,
      maxClass: cls,
      cambridgeRef: ref,
      prompt: `What is the capital city of ${c.country}?`,
      choices,
      correctIndex,
      explanation: `${c.capital} is the official capital city of ${c.country}.`,
    };
  }
  const l = LANDMARKS[randInt(0, LANDMARKS.length - 1)];
  const { choices, correctIndex } = buildShuffledChoices(l.answer, l.distractors);
  return {
    id: `gen-hist-lm-${l.answer}`,
    subject: 'history',
    minClass: cls,
    maxClass: cls,
    cambridgeRef: ref,
    prompt: l.prompt,
    choices,
    correctIndex,
    explanation: l.exp,
  };
}

function generateQuestionForSubject(
  subj: Exclude<SubjectId, 'mixed'>,
  cls: ClassLevel
): QuizQuestion {
  switch (subj) {
    case 'math':
      return generateMathQuestion(cls);
    case 'science':
      return generateScienceQuestion(cls);
    case 'english':
      return generateEnglishQuestion(cls);
    case 'history':
      return generateHistoryQuestion(cls);
    case 'coding':
      return generateCodingQuestion(cls);
  }
}

export const ARENA_FACTS: Array<{
  subject: Exclude<SubjectId, 'mixed'>;
  minClass: ClassLevel;
  maxClass: ClassLevel;
  fact: string;
}> = [
  {
    subject: 'math',
    minClass: 6,
    maxClass: 10,
    fact: '3D aim sensitivity scales turn angle Δθ = Δx × sensitivity—zooming in (ADS) lowers sensitivity for precision.',
  },
  {
    subject: 'science',
    minClass: 6,
    maxClass: 10,
    fact: 'Parabolic grenade arcs follow y(t) = y₀ + vᵧt − ½gt² under constant downward acceleration g.',
  },
  {
    subject: 'english',
    minClass: 6,
    maxClass: 10,
    fact: 'The word "arena" comes from the Latin harena ("sand"), originally used on Roman amphitheater floors.',
  },
  {
    subject: 'history',
    minClass: 6,
    maxClass: 10,
    fact: 'Standardized shipping containers (1956) transformed global ports by making cargo stacks modular worldwide.',
  },
  {
    subject: 'coding',
    minClass: 6,
    maxClass: 10,
    fact: '3D games use raycasting and AABB bounding boxes in O(1) time to block bullets on shipping containers.',
  },
];

const USED_QUESTIONS_STORAGE_KEY = 'rivals_used_cambridge_q_v1';

export function loadUsedQuestionKeys(): Set<string> {
  try {
    const raw = window.localStorage.getItem(USED_QUESTIONS_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr.slice(-400) : []);
  } catch {
    return new Set();
  }
}

export function saveUsedQuestionKeys(used: Set<string>): void {
  try {
    const arr = Array.from(used).slice(-400);
    window.localStorage.setItem(USED_QUESTIONS_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // Ignore storage quota errors
  }
}

export function getQuestionsForClassAndSubject(
  classLevel: ClassLevel,
  subject: SubjectId
): QuizQuestion[] {
  const bySubject =
    subject === 'mixed'
      ? QUESTION_BANK
      : QUESTION_BANK.filter((q) => q.subject === subject);
  const exact = bySubject.filter((q) => classLevel >= q.minClass && classLevel <= q.maxClass);
  return exact.length > 0 ? exact : bySubject;
}

const ALL_SUBJECT_KEYS: Array<Exclude<SubjectId, 'mixed'>> = [
  'math',
  'science',
  'english',
  'history',
  'coding',
];

/**
 * Picks a guaranteed non-repeating Cambridge question for the chosen Class & Subject.
 * Never resets seen questions mid-session or across rematches unless every candidate is exhausted.
 */
export function pickQuestion(
  subject: SubjectId,
  classLevel: ClassLevel,
  usedKeys: Set<string>,
  excludePrompt?: string
): QuizQuestion {
  const isUsed = (q: QuizQuestion) =>
    usedKeys.has(q.id) || usedKeys.has(q.prompt) || (excludePrompt !== undefined && q.prompt === excludePrompt);
  const markUsed = (q: QuizQuestion) => {
    usedKeys.add(q.id);
    usedKeys.add(q.prompt);
    saveUsedQuestionKeys(usedKeys);
  };

  // 1. Try unseen curated questions for exact (classLevel, subject)
  const exactPool = getQuestionsForClassAndSubject(classLevel, subject).filter((q) => !isUsed(q));

  // 2. Also try procedural generator for fresh non-repeating variations (50% mix or when curated used up)
  const targetSubj =
    subject === 'mixed'
      ? ALL_SUBJECT_KEYS[Math.floor(Math.random() * ALL_SUBJECT_KEYS.length)]
      : subject;

  if (exactPool.length === 0 || Math.random() < 0.5) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const s =
        subject === 'mixed'
          ? ALL_SUBJECT_KEYS[(attempt + Math.floor(Math.random() * 5)) % ALL_SUBJECT_KEYS.length]
          : targetSubj;
      const gen = generateQuestionForSubject(s, classLevel);
      if (!isUsed(gen)) {
        markUsed(gen);
        return gen;
      }
    }
  }

  if (exactPool.length > 0) {
    const q = exactPool[Math.floor(Math.random() * exactPool.length)];
    markUsed(q);
    return q;
  }

  // 3. Expand across other classes in the same subject before ever recycling
  const subjectPool =
    subject === 'mixed'
      ? QUESTION_BANK
      : QUESTION_BANK.filter((q) => q.subject === subject);
  const unusedAcrossClasses = subjectPool.filter((q) => !isUsed(q));
  if (unusedAcrossClasses.length > 0) {
    const q = unusedAcrossClasses[Math.floor(Math.random() * unusedAcrossClasses.length)];
    markUsed(q);
    return q;
  }

  // 4. Fallback: try procedural generation across math/science/coding if all static items in narrow pool were exhausted
  for (let attempt = 0; attempt < 30; attempt++) {
    const gen = generateQuestionForSubject(targetSubj, classLevel);
    if (!isUsed(gen)) {
      markUsed(gen);
      return gen;
    }
  }

  // 5. Only if literally every single question in that narrow subject was answered, clear only that subject's keys (except excludePrompt)
  subjectPool.forEach((q) => {
    usedKeys.delete(q.id);
    if (q.prompt !== excludePrompt) usedKeys.delete(q.prompt);
  });
  for (let attempt = 0; attempt < 20; attempt++) {
    const fresh = generateQuestionForSubject(targetSubj, classLevel);
    if (fresh.prompt !== excludePrompt) {
      markUsed(fresh);
      return fresh;
    }
  }
  const fallbackPool = subjectPool.filter((q) => q.prompt !== excludePrompt);
  const fresh =
    fallbackPool.length > 0
      ? fallbackPool[Math.floor(Math.random() * fallbackPool.length)]
      : generateQuestionForSubject(targetSubj, classLevel);
  markUsed(fresh);
  return fresh;
}

export function pickArenaFact(
  subject: SubjectId,
  classLevel: ClassLevel
): { subjectLabel: string; fact: string } {
  const bySubject =
    subject === 'mixed'
      ? ARENA_FACTS
      : ARENA_FACTS.filter((f) => f.subject === subject);
  const byClass = bySubject.filter((f) => classLevel >= f.minClass && classLevel <= f.maxClass);
  const pool = byClass.length > 0 ? byClass : bySubject;
  const entry = pool[Math.floor(Math.random() * pool.length)];
  return {
    subjectLabel: SUBJECTS[entry.subject].label,
    fact: entry.fact,
  };
}
