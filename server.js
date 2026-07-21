const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'channu0012';
const DB_FILE = path.join(__dirname, 'database.json');

/* ───────────────────────────────────────────────────────────────
   DATABASE PERSISTENCE LAYER & FALLBACK
   ─────────────────────────────────────────────────────────────── */

let products = [];
let clickLogs = [];
let impressionLogs = [];
let subscribers = [];
let firebaseDb = null;

// Graceful Firebase Cloud Realtime Database Initializer
function initFirebase() {
  try {
    const serviceAccountPath = path.join(__dirname, 'firebase-credentials.json');
    if (fs.existsSync(serviceAccountPath)) {
      const admin = require('firebase-admin');
      const serviceAccount = require(serviceAccountPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
      });
      
      firebaseDb = admin.database();
      console.log(`\n  [Firebase] Realtime Database initialized successfully.`);
      console.log(`  [Firebase] Sync active for project: ${serviceAccount.project_id}\n`);
      
      // Proactively pull existing cloud catalog on startup to sync local data
      firebaseDb.ref('affiliate_hub/products').once('value', (snapshot) => {
        const cloudProducts = snapshot.val();
        if (cloudProducts && Array.isArray(cloudProducts) && cloudProducts.length > 0) {
          products = cloudProducts;
          saveDatabase();
          console.log(`  [Firebase] Synced ${products.length} products from Firebase Cloud RTDB.`);
        }
      });
    } else {
      console.log('\n  [Firebase] No firebase-credentials.json found. Running high-performance local database.json mode.\n');
    }
  } catch (err) {
    console.warn('\n  [Firebase] Skipped cloud sync initialization:', err.message);
    console.log('  [Firebase] Defaulting to high-performance local database.json mode.\n');
  }
}

// Loads catalog, click logs, and alert subscribers from the database
function loadDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const db = JSON.parse(raw);
      
      products = db.products || [];
      clickLogs = db.clickLogs || [];
      impressionLogs = db.impressionLogs || [];
      subscribers = db.subscribers || [];
      
      console.log(`  [Database] Local database.json loaded successfully.`);
      console.log(`  [Database] Products: ${products.length} | Subscribers: ${subscribers.length} | Clicks: ${clickLogs.length}\n`);
      
      if (products.length === 0) {
        loadDefaultProducts();
        saveDatabase();
      }
      return;
    } catch (err) {
      console.error('  [Database] Failed to read database.json, loading defaults...', err);
    }
  }
  
  // First startup: load defaults and write database
  loadDefaultProducts();
  saveDatabase();
  console.log(`  [Database] Fresh database.json initialized with default ${products.length} products.\n`);
}

// Saves catalog, clicks, and subscribers to disk & cloud
function saveDatabase() {
  try {
    const db = {
      products,
      clickLogs: clickLogs.slice(-500), // restrict log history in file for quick I/O
      impressionLogs: impressionLogs.slice(-500),
      subscribers
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('  [Database] Error saving data locally:', err);
  }

  // Cloud sync to Firebase Realtime Database
  if (firebaseDb) {
    try {
      firebaseDb.ref('affiliate_hub').set({
        products: products,
        clickLogs: clickLogs.slice(-200), // optimized array sizes
        subscribers: subscribers,
        generated: new Date().toISOString()
      }).catch(err => {
        console.error('  [Firebase] Failed to write cloud nodes:', err);
      });
    } catch (err) {
      console.error('  [Firebase] Cloud sync exception:', err);
    }
  }
}

// Core default 15 items catalog
function loadDefaultProducts() {
  products = [
    // ── CATEGORY 1: SELF-HELP & MINDSET (3 products) ──
    {
      id: 1,
      slug: 'atomic-habits',
      name: 'Atomic Habits: An Easy & Proven Way to Build Good Habits & Break Bad Ones',
      brand: 'James Clear',
      category: 'Self-Help & Mindset',
      price: 149,
      mrp: 499,
      discount: 70,
      badge: '#1 BESTSELLER',
      badgeColor: '#FFA41C',
      rating: 4.8,
      ratingCount: 120450,
      image: null,
      specs: [
        { label: 'Author', value: 'James Clear' },
        { label: 'Publisher', value: 'Avery' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '320 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-0735213180' }
      ],
      pros: ['Extremely actionable with clear frameworks', 'Easy-to-read narrative style', 'Based on solid psychological principles', 'Includes downloadable bonus templates'],
      cons: ['Some concepts are repetition of classic habit psychology', 'Requires persistent effort to apply'],
      affiliateUrl: 'https://www.amazon.in/dp/B07D2RYQQH?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B07D2RYQQH?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/atomic-habits/p/itm54?affid=amzbooks'
      },
      active: true
    },
    {
      id: 2,
      slug: 'cant-hurt-me',
      name: 'Can\'t Hurt Me: Master Your Mind and Defy the Odds',
      brand: 'David Goggins',
      category: 'Self-Help & Mindset',
      price: 199,
      mrp: 599,
      discount: 67,
      badge: 'UNCOMMON AMONGST UNCOMMON',
      badgeColor: '#10B981',
      rating: 4.9,
      ratingCount: 78500,
      image: null,
      specs: [
        { label: 'Author', value: 'David Goggins' },
        { label: 'Publisher', value: 'Lioncrest Publishing' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '364 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-1544512280' }
      ],
      pros: ['Highly motivating raw memoir', 'Includes structured challenges at the end of chapters', 'Very candid and unfiltered account', 'Inspiring work ethic lessons'],
      cons: ['Extremely intense vocabulary', 'His extreme methods may not suit everyone'],
      affiliateUrl: 'https://www.amazon.in/dp/B07H453KGH?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B07H453KGH?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/cant-hurt-me/p/itm21?affid=amzbooks'
      },
      active: true
    },
    {
      id: 3,
      slug: 'thinking-fast-and-slow',
      name: 'Thinking, Fast and Slow',
      brand: 'Daniel Kahneman',
      category: 'Self-Help & Mindset',
      price: 249,
      mrp: 699,
      discount: 64,
      badge: 'NOBEL PRIZE WINNER',
      badgeColor: '#3B82F6',
      rating: 4.6,
      ratingCount: 42150,
      image: null,
      specs: [
        { label: 'Author', value: 'Daniel Kahneman' },
        { label: 'Publisher', value: 'Farrar, Straus and Giroux' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '499 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-0374533557' }
      ],
      pros: ['Deeply researched cognitive psychology', 'Explains System 1 and System 2 thinking clearly', 'Fascinating insights into human error and biases', 'Life-changing perspective on decision making'],
      cons: ['Dense academic writing style', 'Can be a slow read for some'],
      affiliateUrl: 'https://www.amazon.in/dp/B00555X8OA?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B00555X8OA?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/thinking-fast-and-slow/p/itm87?affid=amzbooks'
      },
      active: true
    },

    // ── CATEGORY 2: BUSINESS & STARTUPS (3 products) ──
    {
      id: 4,
      slug: 'zero-to-one',
      name: 'Zero to One: Notes on Startups, or How to Build the Future',
      brand: 'Peter Thiel',
      category: 'Business & Startups',
      price: 189,
      mrp: 499,
      discount: 62,
      badge: 'SILICON VALLEY CLASSIC',
      badgeColor: '#8B5CF6',
      rating: 4.6,
      ratingCount: 56900,
      image: null,
      specs: [
        { label: 'Author', value: 'Peter Thiel' },
        { label: 'Publisher', value: 'Crown Business' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '195 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-0804139298' }
      ],
      pros: ['Unique philosophy on monopolies vs competition', 'Short, concise, and punchy', 'Provocative contrarian questions', 'Great guidance on technology startups'],
      cons: ['Somewhat opinionated and idealistic', 'Less focus on early-stage execution details'],
      affiliateUrl: 'https://www.amazon.in/dp/B00J6YBOFQ?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B00J6YBOFQ?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/zero-to-one/p/itm19?affid=amzbooks'
      },
      active: true
    },
    {
      id: 5,
      slug: 'the-lean-startup',
      name: 'The Lean Startup: How Today\'s Entrepreneurs Use Continuous Innovation',
      brand: 'Eric Ries',
      category: 'Business & Startups',
      price: 220,
      mrp: 599,
      discount: 63,
      badge: 'FOUNDER BIBLE',
      badgeColor: '#EC4899',
      rating: 4.7,
      ratingCount: 31200,
      image: null,
      specs: [
        { label: 'Author', value: 'Eric Ries' },
        { label: 'Publisher', value: 'Crown Business' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '336 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-0307887894' }
      ],
      pros: ['Build-Measure-Learn feedback loop framework', 'Minimizes wasted capital and resources', 'Clear definition of Minimum Viable Product (MVP)', 'Highly practical metrics tracking guidance'],
      cons: ['Better suited for tech startups than traditional business', 'Can feel repetitive in later sections'],
      affiliateUrl: 'https://www.amazon.in/dp/B004J4XGN6?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B004J4XGN6?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/the-lean-startup/p/itm38?affid=amzbooks'
      },
      active: true
    },
    {
      id: 6,
      slug: 'the-100-startup',
      name: 'The $100 Startup: Reinvent the Way You Make a Living',
      brand: 'Chris Guillebeau',
      category: 'Business & Startups',
      price: 139,
      mrp: 399,
      discount: 65,
      badge: 'SIDE HUSTLE MANUAL',
      badgeColor: '#3B82F6',
      rating: 4.5,
      ratingCount: 15600,
      image: null,
      specs: [
        { label: 'Author', value: 'Chris Guillebeau' },
        { label: 'Publisher', value: 'Crown Business' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '304 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-0307951526' }
      ],
      pros: ['Excellent case studies of micropreneurs', 'Very approachable low-risk ideas', 'Practical action plans for quick launch', 'Focuses on turning passions into profit'],
      cons: ['Mostly digital/lifestyle business focus', 'Lacks detailed legal or tax accounting guidance'],
      affiliateUrl: 'https://www.amazon.in/dp/B007361BEU?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B007361BEU?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/100-startup/p/itm20?affid=amzbooks'
      },
      active: true
    },

    // ── CATEGORY 3: TECHNOLOGY & CODING (3 products) ──
    {
      id: 7,
      slug: 'clean-code',
      name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      brand: 'Robert C. Martin',
      category: 'Technology & Coding',
      price: 499,
      mrp: 1499,
      discount: 67,
      badge: 'DEVELOPER ESSENTIAL',
      badgeColor: '#F59E0B',
      rating: 4.7,
      ratingCount: 22100,
      image: null,
      specs: [
        { label: 'Author', value: 'Robert C. Martin' },
        { label: 'Publisher', value: 'Prentice Hall' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '464 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-0132350884' }
      ],
      pros: ['Practical principles for writing clean code', 'Tons of clear code examples and refactoring', 'Timeless Agile software craftsmanship tips', 'Explains meaningful naming, functions, and testing'],
      cons: ['Examples are strictly in Java', 'Highly opinionated guidelines'],
      affiliateUrl: 'https://www.amazon.in/dp/B001GSTOAM?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B001GSTOAM?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/clean-code/p/itm09?affid=amzbooks'
      },
      active: true
    },
    {
      id: 8,
      slug: 'the-pragmatic-programmer',
      name: 'The Pragmatic Programmer: Your Journey to Mastery',
      brand: 'Andrew Hunt',
      category: 'Technology & Coding',
      price: 520,
      mrp: 1599,
      discount: 67,
      badge: 'DEV WORLD STANDARD',
      badgeColor: '#10B981',
      rating: 4.8,
      ratingCount: 16400,
      image: null,
      specs: [
        { label: 'Author', value: 'David Thomas & Andrew Hunt' },
        { label: 'Publisher', value: 'Addison-Wesley Professional' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '352 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-0135957059' }
      ],
      pros: ['Full of practical software development wisdom', 'Highly entertaining stories and analogies', 'Focuses on careers, code maintenance, and automation', 'Great advice on testing and debugging'],
      cons: ['Broad overview rather than deep coding tutorials', 'Kindle formatting could be slightly better'],
      affiliateUrl: 'https://www.amazon.in/dp/B07VXS47H2?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B07VXS47H2?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/pragmatic-programmer/p/itm41?affid=amzbooks'
      },
      active: true
    },
    {
      id: 9,
      slug: 'designing-data-intensive-applications',
      name: 'Designing Data-Intensive Applications',
      brand: 'Martin Kleppmann',
      category: 'Technology & Coding',
      price: 649,
      mrp: 1899,
      discount: 66,
      badge: 'ARCHITECT BIBLE',
      badgeColor: '#8B5CF6',
      rating: 4.9,
      ratingCount: 14200,
      image: null,
      specs: [
        { label: 'Author', value: 'Martin Kleppmann' },
        { label: 'Publisher', value: 'O\'Reilly Media' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '611 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-1449373320' }
      ],
      pros: ['Masterful breakdown of databases and storage engines', 'Explains consensus, replication, and scaling perfectly', 'Beautiful hand-drawn conceptual architecture diagrams', 'Highly educational for senior software engineers'],
      cons: ['Extremely dense and technical', 'Requires basic systems understanding beforehand'],
      affiliateUrl: 'https://www.amazon.in/dp/B06XP5FCYC?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B06XP5FCYC?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/designing-data-intensive-applications/p/itm12?affid=amzbooks'
      },
      active: true
    },

    // ── CATEGORY 4: FINANCE & INVESTING (3 products) ──
    {
      id: 10,
      slug: 'psychology-of-money',
      name: 'The Psychology of Money: Timeless lessons on wealth, greed, and happiness',
      brand: 'Morgan Housel',
      category: 'Finance & Investing',
      price: 129,
      mrp: 399,
      discount: 68,
      badge: 'POPULAR CHOICE',
      badgeColor: '#FFA41C',
      rating: 4.8,
      ratingCount: 98500,
      image: null,
      specs: [
        { label: 'Author', value: 'Morgan Housel' },
        { label: 'Publisher', value: 'Harriman House' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '256 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-0857197689' }
      ],
      pros: ['Brilliant short stories about money management behavior', 'Shows how emotional intelligence beats mathematical IQ', 'Fascinating thoughts on long-term compounded growth', 'Very easy to read and understand'],
      cons: ['Lacks stock picking formulas or deep market math', 'Some stories might feel repetitive if you read Housel\'s blog'],
      affiliateUrl: 'https://www.amazon.in/dp/B08D79TV6V?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B08D79TV6V?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/psychology-money/p/itm11?affid=amzbooks'
      },
      active: true
    },
    {
      id: 11,
      slug: 'rich-dad-poor-dad',
      name: 'Rich Dad Poor Dad: What the Rich Teach Their Kids About Money',
      brand: 'Robert T. Kiyosaki',
      category: 'Finance & Investing',
      price: 149,
      mrp: 499,
      discount: 70,
      badge: 'GLOBAL BLOCKBUSTER',
      badgeColor: '#EF4444',
      rating: 4.6,
      ratingCount: 189400,
      image: null,
      specs: [
        { label: 'Author', value: 'Robert T. Kiyosaki' },
        { label: 'Publisher', value: 'Plata Publishing' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '336 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-1612680194' }
      ],
      pros: ['Eye-opening ideas about assets vs liabilities', 'Excellent financial literacy foundations', 'Inspires business building and real estate investing', 'Highly readable dialogue-driven chapters'],
      cons: ['Contains some financial advice that might be outdated', 'Kiyosaki\'s stories are heavily dramatized'],
      affiliateUrl: 'https://www.amazon.in/dp/B0175AE562?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B0175AE562?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/rich-dad-poor-dad/p/itm31?affid=amzbooks'
      },
      active: true
    },
    {
      id: 12,
      slug: 'the-intelligent-investor',
      name: 'The Intelligent Investor: The Definitive Book on Value Investing',
      brand: 'Benjamin Graham',
      category: 'Finance & Investing',
      price: 299,
      mrp: 799,
      discount: 63,
      badge: 'INVESTING CLASSIC',
      badgeColor: '#3B82F6',
      rating: 4.5,
      ratingCount: 35400,
      image: null,
      specs: [
        { label: 'Author', value: 'Benjamin Graham' },
        { label: 'Publisher', value: 'Harper Business' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '640 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-0060555665' }
      ],
      pros: ['Warren Buffett\'s recommended investing guide', 'Teaches margin of safety and value investing concepts', 'Invaluable strategies for defensive & enterprising investors', 'Focuses on emotional discipline and analytical logic'],
      cons: ['Extremely dense and dry language', 'Financial examples are historically dated (1970s)'],
      affiliateUrl: 'https://www.amazon.in/dp/B000FC0KB0?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B000FC0KB0?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/intelligent-investor/p/itm32?affid=amzbooks'
      },
      active: true
    },

    // ── CATEGORY 5: FICTION & SCI-FI (3 products) ──
    {
      id: 13,
      slug: 'dune',
      name: 'Dune: The Deluxe Edition',
      brand: 'Frank Herbert',
      category: 'Fiction & Sci-Fi',
      price: 199,
      mrp: 599,
      discount: 67,
      badge: 'SCI-FI MASTERPIECE',
      badgeColor: '#8B5CF6',
      rating: 4.7,
      ratingCount: 54600,
      image: null,
      specs: [
        { label: 'Author', value: 'Frank Herbert' },
        { label: 'Publisher', value: 'Ace Books' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '608 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-0441172719' }
      ],
      pros: ['Masterful worldbuilding and deep ecology themes', 'Engaging mix of politics, religion, and philosophy', 'Iconic characters like Paul Atreides', 'Pioneered modern space-opera sci-fi'],
      cons: ['Includes complex lists of jargon and terminologies', 'Slow pacing in the second act'],
      affiliateUrl: 'https://www.amazon.in/dp/B00B7D055A?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B00B7D055A?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/dune/p/itm100?affid=amzbooks'
      },
      active: true
    },
    {
      id: 14,
      slug: 'project-hail-mary',
      name: 'Project Hail Mary: A Novel',
      brand: 'Andy Weir',
      category: 'Fiction & Sci-Fi',
      price: 249,
      mrp: 699,
      discount: 64,
      badge: '#1 BEST SCI-FI 2021',
      badgeColor: '#10B981',
      rating: 4.8,
      ratingCount: 38900,
      image: null,
      specs: [
        { label: 'Author', value: 'Andy Weir' },
        { label: 'Publisher', value: 'Ballantine Books' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '476 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-0593135204' }
      ],
      pros: ['Incredibly detailed and engaging hard science', 'Brilliant and heartwarming buddy-sci-fi dynamic', 'Fast-paced, high-stakes space survival mission', 'Written by author of The Martian'],
      cons: ['Main character shares similar humor as Mark Watney', 'Some science calculations can be dense for casual readers'],
      affiliateUrl: 'https://www.amazon.in/dp/B08FBFQ4DE?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B08FBFQ4DE?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/project-hail-mary/p/itm88?affid=amzbooks'
      },
      active: true
    },
    {
      id: 15,
      slug: 'neuromancer',
      name: 'Neuromancer: The Cyberpunk Classic',
      brand: 'William Gibson',
      category: 'Fiction & Sci-Fi',
      price: 149,
      mrp: 399,
      discount: 63,
      badge: 'CYBERPUNK INVENTOR',
      badgeColor: '#EC4899',
      rating: 4.4,
      ratingCount: 18400,
      image: null,
      specs: [
        { label: 'Author', value: 'William Gibson' },
        { label: 'Publisher', value: 'Ace Books' },
        { label: 'Format', value: 'Kindle Edition' },
        { label: 'Pages', value: '271 Pages' },
        { label: 'Language', value: 'English' },
        { label: 'ISBN-13', value: '978-0441569595' }
      ],
      pros: ['Invented the term "Cyberspace" and Cyberpunk style', 'Incredibly rich, futuristic descriptions', 'Cohesive atmosphere and gritty world', 'Hugely influential for movies like The Matrix'],
      cons: ['Highly complex prose and quick jargon shifts', 'Very fast-paced plot requires full attention'],
      affiliateUrl: 'https://www.amazon.in/dp/B000O76ONU?tag=amzbooks-21',
      affiliateLinks: {
        amazon: 'https://www.amazon.in/dp/B000O76ONU?tag=amzbooks-21',
        flipkart: 'https://www.flipkart.com/neuromancer/p/itm23?affid=amzbooks'
      },
      active: true
    }
  ];
}

/* ───────────────────────────────────────────────────────────────
   UTILITY FUNCTIONS
   ─────────────────────────────────────────────────────────────── */

function parseDeviceType(ua) {
  if (!ua) return 'Unknown';
  const lower = ua.toLowerCase();
  if (/mobile|android.*mobile|iphone|ipod|blackberry|iemobile|opera mini|windows phone/i.test(lower)) return 'Mobile';
  if (/ipad|android(?!.*mobile)|tablet|kindle|silk|playbook/i.test(lower)) return 'Tablet';
  if (/bot|crawl|spider|slurp|mediapartners/i.test(lower)) return 'Bot';
  return 'Desktop';
}

function parseBrowser(ua) {
  if (!ua) return 'Unknown';
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/chrome/i.test(ua) && !/edg/i.test(ua) && !/opr/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  return 'Other';
}

function parseOS(ua) {
  if (!ua) return 'Unknown';
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}

function resolveClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.connection.remoteAddress || req.ip || '0.0.0.0';
}

function generateClickId() {
  return crypto.randomBytes(8).toString('hex');
}

function maskSlug(slug) {
  if (!slug || slug.length <= 6) return slug;
  return slug.substring(0, 3) + '***' + slug.substring(slug.length - 3);
}

function formatTimestamp(date) {
  return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

function logImpression(type, slug, req, utmSrc, utmMed, utmCamp) {
  const userAgent = req.headers['user-agent'] || '';
  const clientIP = resolveClientIP(req);
  const timestamp = new Date();
  
  const record = {
    id: impressionLogs.length + 1,
    type: type, // 'page_view', 'card_view'
    slug: slug,
    utmSource: utmSrc || req.query.utm_source || 'direct',
    utmMedium: utmMed || req.query.utm_medium || '',
    utmCampaign: utmCamp || req.query.utm_campaign || '',
    clientIP: clientIP,
    deviceType: parseDeviceType(userAgent),
    browser: parseBrowser(userAgent),
    os: parseOS(userAgent),
    timestamp: timestamp
  };
  
  impressionLogs.push(record);
  saveDatabase();
}

/* ───────────────────────────────────────────────────────────────
   MIDDLEWARE & EXPRESS STATIC ROUTING
   ─────────────────────────────────────────────────────────────── */

app.use(express.json());

// Enable cross-origin resource sharing (CORS) for direct file access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Click-Id');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Database & Firebase (conditional sync)
initFirebase();
loadDatabase();

/* ───────────────────────────────────────────────────────────────
   ADMIN PANEL DIRECT PATHWAY
   ─────────────────────────────────────────────────────────────── */

app.get('/admin', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

/* ───────────────────────────────────────────────────────────────
   DYNAMIC SERVER ROUTING & SEO TEMPLATE INJECTION (Moved to secure templates/)
   ─────────────────────────────────────────────────────────────── */

// Dynamic Product Detail Page (/product/:slug)
app.get('/product/:slug', (req, res) => {
  const product = products.find(p => p.slug === req.params.slug && p.active);
  if (!product) {
    return res.status(404).send('<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="font-family:system-ui;text-align:center;padding:60px"><h1>Product Not Found</h1><p>The product you are looking for is unavailable.</p><a href="/">← Back to Home</a></body></html>');
  }

  // Track impression
  logImpression('page_view', product.slug, req);

  try {
    const templatePath = path.join(__dirname, 'templates', 'product.html');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).send('Product template file missing in view folders.');
    }

    let html = fs.readFileSync(templatePath, 'utf8');

    // Find similar products in the same category (cross-selling)
    const similar = products
      .filter(p => p.active && p.slug !== product.slug && p.category === product.category)
      .slice(0, 3);

    // Dynamic replacements
    const title = `${product.name} Kindle Price in India, Specs & Honest Review | AmzBooks Hub`;
    const desc = `Compare lowest price for ${product.name} on Amazon Kindle and Flipkart Kobo. Read full specifications, pros, cons, ratings, and expert book recommendations.`;
    
    html = html
      .replace(/{{TITLE}}/g, title)
      .replace(/{{META_DESCRIPTION}}/g, desc)
      .replace(/{{PRODUCT_DATA}}/g, JSON.stringify(product))
      .replace(/{{SIMILAR_PRODUCTS}}/g, JSON.stringify(similar));

    res.send(html);
  } catch (err) {
    console.error('Error rendering product detail page:', err);
    res.status(500).send('Error loading product page.');
  }
});

// Dynamic Comparison Page (/compare)
app.get('/compare', (req, res) => {
  logImpression('page_view', 'compare', req);

  try {
    const templatePath = path.join(__dirname, 'templates', 'compare.html');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).send('Comparison template file missing in view folders.');
    }

    let html = fs.readFileSync(templatePath, 'utf8');

    const productsParam = req.query.products || req.query.slugs || '';
    const slugs = productsParam.split(',').map(s => s.trim()).filter(Boolean);
    const compared = products.filter(p => p.active && slugs.includes(p.slug));

    // Dynamic titles
    let title = 'Compare Bestselling E-Books Side-by-Side | AmzBooks Hub';
    let desc = 'Compare Kindle and Kobo e-books side-by-side in India. Check winner specs, page counts, author details, prices, and direct affiliate deals.';
    
    if (compared.length > 0) {
      const names = compared.map(p => p.name).join(' vs ');
      title = `${names} — Which is Better? E-Book Specs & Price Comparison | AmzBooks Hub`;
      desc = `Compare ${names} side-by-side in India. See detailed winner specifications, page counts, authors, ratings, and best buying options.`;
    }

    // Pass the list of all available active products for selection dropdowns
    const allActiveList = products.filter(p => p.active).map(p => ({
      slug: p.slug,
      name: p.name,
      category: p.category
    }));

    html = html
      .replace(/{{TITLE}}/g, title)
      .replace(/{{META_DESCRIPTION}}/g, desc)
      .replace(/{{COMPARED_PRODUCTS_DATA}}/g, JSON.stringify(compared))
      .replace(/{{ALL_PRODUCTS_LIST}}/g, JSON.stringify(allActiveList));

    res.send(html);
  } catch (err) {
    console.error('Error rendering compare page:', err);
    res.status(500).send('Error loading compare page.');
  }
});

// Dedicated Alerts Subscription Page (/subscribe)
app.get('/subscribe', (req, res) => {
  logImpression('page_view', 'subscribe', req);
  try {
    const templatePath = path.join(__dirname, 'templates', 'subscribe.html');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).send('Subscription template file missing in view folders.');
    }
    const html = fs.readFileSync(templatePath, 'utf8');
    res.send(html);
  } catch (err) {
    console.error('Error loading subscription page:', err);
    res.status(500).send('Error loading subscription page.');
  }
});

// Robots.txt Route (/robots.txt)
app.get('/robots.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  const baseUrl = process.env.HOST || `${req.protocol}://${req.get('host')}`;
  res.send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /go/\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

// XML SEO Sitemap (/sitemap.xml)
app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  const baseUrl = process.env.HOST || `${req.protocol}://${req.get('host')}`;
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  // Home
  xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  // Subscribe
  xml += `  <url>\n    <loc>${baseUrl}/subscribe</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
  // Compare
  xml += `  <url>\n    <loc>${baseUrl}/compare</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  
  // Product pages
  products.filter(p => p.active).forEach(p => {
    xml += `  <url>\n    <loc>${baseUrl}/product/${p.slug}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  });
  
  xml += `</urlset>`;
  res.send(xml);
});

/* ───────────────────────────────────────────────────────────────
   STATIC FILE SERVING & CACHING POLICY (Secured static HTML file serves)
   ─────────────────────────────────────────────────────────────── */

// Redirect any direct static requests to raw HTML template files to prevent browser console SyntaxErrors
app.get('/:page.html', (req, res, next) => {
  const page = req.params.page.toLowerCase();
  if (page === 'product') return res.status(404).send('Dynamic parameters required. Use /product/:slug');
  if (page === 'compare') return res.redirect(301, '/compare');
  if (page === 'subscribe') return res.redirect(301, '/subscribe');
  if (page === 'admin') return res.redirect(301, '/admin');
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  setHeaders: function(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else {
      res.set('Cache-Control', 'public, max-age=3600');
    }
  }
}));

/* ───────────────────────────────────────────────────────────────
   PRODUCTS API (Supports Category Filtering, Search & Sorting)
   ─────────────────────────────────────────────────────────────── */

app.get('/api/products', (req, res) => {
  const categoryFilter = req.query.category;
  const searchQuery = (req.query.q || '').trim().toLowerCase();
  const sortBy = req.query.sort;
  
  let filtered = products.filter(p => p.active);

  // Category filter
  if (categoryFilter) {
    filtered = filtered.filter(p => p.category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-') === categoryFilter.toLowerCase());
  }

  // Search filter (searches title, author/brand, category, pros, specs)
  if (searchQuery) {
    filtered = filtered.filter(p => {
      const text = `${p.name} ${p.brand} ${p.category} ${p.pros.join(' ')}`.toLowerCase();
      return text.includes(searchQuery);
    });
  }

  // Sorting logic
  if (sortBy === 'price_asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price_desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === 'discount') {
    filtered.sort((a, b) => b.discount - a.discount);
  }

  const publicProducts = filtered.map(p => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    mrp: p.mrp,
    discount: p.discount,
    badge: p.badge,
    badgeColor: p.badgeColor,
    rating: p.rating,
    ratingCount: p.ratingCount,
    image: p.image || null,
    specs: p.specs,
    pros: p.pros,
    cons: p.cons,
    affiliateLinks: p.affiliateLinks
  }));

  res.set('Cache-Control', 'public, max-age=60');
  res.json({ success: true, products: publicProducts, count: publicProducts.length });
});

/* ───────────────────────────────────────────────────────────────
   AFFILIATE REDIRECT ENGINE — /go/:slug
   ─────────────────────────────────────────────────────────────── */

app.get('/go/:slug', (req, res) => {
  const slug = req.params.slug;
  const product = products.find(p => p.slug === slug && p.active);

  if (!product) {
    res.status(404).send('<!DOCTYPE html><html><head><title>Not Found</title></head><body style="font-family:system-ui;text-align:center;padding:60px"><h1>Product Link Broken</h1><p>The requested deal link is no longer available.</p><a href="/">← Back to Home</a></body></html>');
    return;
  }

  const platform = req.query.platform || 'amazon';
  const userAgent = req.headers['user-agent'] || '';
  const clientIP = resolveClientIP(req);
  const clickId = req.query.click_id || generateClickId();
  const utmSource = req.query.utm_source || 'direct';
  const utmMedium = req.query.utm_medium || '';
  const utmCampaign = req.query.utm_campaign || '';
  const referer = req.headers['referer'] || req.headers['referrer'] || '';
  const timestamp = new Date();

  let destinationUrl = product.affiliateUrl;
  if (product.affiliateLinks && product.affiliateLinks[platform]) {
    destinationUrl = product.affiliateLinks[platform];
  }

  const clickRecord = {
    id: clickLogs.length + 1,
    clickId: clickId,
    slug: slug,
    platform: platform,
    productName: product.name,
    destinationUrl: destinationUrl,
    utmSource: utmSource,
    utmMedium: utmMedium,
    utmCampaign: utmCampaign,
    referer: referer,
    clientIP: clientIP,
    userAgent: userAgent,
    deviceType: parseDeviceType(userAgent),
    browser: parseBrowser(userAgent),
    os: parseOS(userAgent),
    timestamp: timestamp,
    timestampFormatted: formatTimestamp(timestamp),
    maskedSlug: maskSlug(slug)
  };

  setImmediate(() => {
    clickLogs.push(clickRecord);
    saveDatabase();
  });

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('X-Click-Id', clickId);

  res.redirect(302, destinationUrl);
});

/* ───────────────────────────────────────────────────────────────
   LEAD CAPTURE SUBSCRIBER API
   ─────────────────────────────────────────────────────────────── */

app.post('/api/subscribe', (req, res) => {
  const { email, whatsapp, categories } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'A valid email is required.' });
  }

  const duplicate = subscribers.some(s => s.email.toLowerCase() === email.toLowerCase());
  if (duplicate) {
    return res.status(400).json({ success: false, error: 'You are already signed up for alerts!' });
  }

  const subscriber = {
    id: subscribers.length + 1,
    email: email,
    whatsapp: whatsapp || 'N/A',
    categories: categories || [],
    timestamp: formatTimestamp(new Date())
  };

  subscribers.push(subscriber);
  saveDatabase();
  res.json({ success: true, message: 'Subscribed successfully!' });
});

/* ───────────────────────────────────────────────────────────────
   IMPRESSION TRACKING API
   ─────────────────────────────────────────────────────────────── */

app.post('/api/track/impression', (req, res) => {
  const { type, slug, utmSource, utmMedium, utmCampaign } = req.body;
  logImpression(type || 'card_view', slug || 'general', req, utmSource, utmMedium, utmCampaign);
  res.json({ success: true });
});

/* ───────────────────────────────────────────────────────────────
   DYNAMIC SOCIAL PROOF API
   ─────────────────────────────────────────────────────────────── */

app.get('/api/social-proof', (req, res) => {
  const cities = ['New Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Gurugram', 'Noida', 'Jaipur', 'Lucknow', 'Chandigarh'];
  const actions = ['is comparing', 'clicked lowest price for', 'subscribed to alerts for', 'unlocked discount on'];
  
  const randomCity = cities[Math.floor(Math.random() * cities.length)];
  const randomAction = actions[Math.floor(Math.random() * actions.length)];
  const activeProducts = products.filter(p => p.active);
  const randomProduct = activeProducts[Math.floor(Math.random() * activeProducts.length)];
  const minsAgo = Math.floor(Math.random() * 9) + 1;

  res.json({
    success: true,
    city: randomCity,
    action: randomAction,
    productName: randomProduct.name,
    productSlug: randomProduct.slug,
    timeAgo: `${minsAgo} min${minsAgo > 1 ? 's' : ''} ago`
  });
});

/* ───────────────────────────────────────────────────────────────
   COMPARE PRODUCTS DETAILS API
   ─────────────────────────────────────────────────────────────── */

app.get('/api/compare', (req, res) => {
  const productsQuery = req.query.slugs || req.query.products || '';
  const slugs = productsQuery.split(',').map(s => s.trim()).filter(Boolean);
  const matchedProducts = products.filter(p => p.active && slugs.includes(p.slug));
  res.json({ success: true, products: matchedProducts });
});

/* ───────────────────────────────────────────────────────────────
   ADMIN METRICS CENTER API
   ─────────────────────────────────────────────────────────────── */

app.get('/api/admin/metrics', (req, res) => {
  const token = req.query.token;

  if (!token || token !== ADMIN_TOKEN) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized. Provide a valid token parameter.'
    });
    return;
  }

  const totalClicks = clickLogs.length;
  const totalImpressions = impressionLogs.length;

  const deviceBreakdown = {};
  const sourceBreakdown = {};
  const browserBreakdown = {};
  const osBreakdown = {};
  const productBreakdown = {};
  const hourlyBreakdown = {};
  const platformBreakdown = { amazon: 0, flipkart: 0 };

  for (let i = 0; i < clickLogs.length; i++) {
    const log = clickLogs[i];

    deviceBreakdown[log.deviceType] = (deviceBreakdown[log.deviceType] || 0) + 1;
    sourceBreakdown[log.utmSource] = (sourceBreakdown[log.utmSource] || 0) + 1;
    browserBreakdown[log.browser] = (browserBreakdown[log.browser] || 0) + 1;
    osBreakdown[log.os] = (osBreakdown[log.os] || 0) + 1;
    productBreakdown[log.productName] = (productBreakdown[log.productName] || 0) + 1;
    platformBreakdown[log.platform || 'amazon'] = (platformBreakdown[log.platform || 'amazon'] || 0) + 1;

    const hour = log.timestamp ? new Date(log.timestamp).toISOString().substring(0, 13) : new Date().toISOString().substring(0, 13);
    hourlyBreakdown[hour] = (hourlyBreakdown[hour] || 0) + 1;
  }

  const uniqueIPs = new Set(clickLogs.map(l => l.clientIP)).size;
  const uniqueViews = new Set(impressionLogs.map(i => i.clientIP)).size;

  const estimatedConversions = (totalClicks * 0.08).toFixed(1);
  const estimatedRevenue = Math.round(totalClicks * 0.08 * 220);

  const ctrPercent = totalImpressions > 0
    ? ((totalClicks / totalImpressions) * 100).toFixed(1)
    : '0.0';

  const pageViews = impressionLogs.filter(i => i.type === 'page_view').length;
  const cardViews = impressionLogs.filter(i => i.type === 'card_view').length || (pageViews * 3);
  
  const funnel = {
    pageViews: pageViews,
    cardViews: cardViews,
    clicks: totalClicks,
    conversions: parseFloat(estimatedConversions)
  };

  const recentLogs = clickLogs.slice(-100).reverse().map(log => ({
    id: log.id,
    maskedSlug: log.maskedSlug,
    platform: log.platform || 'amazon',
    utmSource: log.utmSource,
    deviceType: log.deviceType,
    browser: log.browser,
    os: log.os,
    timestamp: log.timestampFormatted,
    destinationPath: log.destinationUrl.includes('flipkart') ? 'Flipkart Kobo Referral' : 'Amazon Kindle Referral'
  }));

  res.set('Cache-Control', 'no-store');
  res.json({
    success: true,
    generated: formatTimestamp(new Date()),
    summary: {
      totalClicks: totalClicks,
      uniqueVisitors: uniqueIPs || uniqueViews,
      estimatedCTR: ctrPercent + '%',
      activeProducts: products.filter(p => p.active).length,
      estimatedRevenue: estimatedRevenue,
      subscribersCount: subscribers.length
    },
    funnel: funnel,
    subscribers: subscribers.slice(-50).reverse(),
    products: products,
    breakdown: {
      byDevice: deviceBreakdown,
      bySource: sourceBreakdown,
      byBrowser: browserBreakdown,
      byOS: osBreakdown,
      byProduct: productBreakdown,
      byHour: hourlyBreakdown,
      byPlatform: platformBreakdown
    },
    recentLogs: recentLogs
  });
});

/* ───────────────────────────────────────────────────────────────
   ADMIN PRODUCTS CREATION & MANAGEMENT API
   ─────────────────────────────────────────────────────────────── */

app.post('/api/admin/products', (req, res) => {
  const token = req.query.token;
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Provide a valid token.' });
  }

  const { name, brand, category, price, mrp, badge, badgeColor, specs, pros, cons, amazonUrl, flipkartUrl } = req.body;

  if (!name || !brand || !category || !price || !mrp) {
    return res.status(400).json({ success: false, error: 'Name, Brand, Category, Price, and MRP are required fields.' });
  }

  const slug = name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  const duplicate = products.some(p => p.slug === slug);
  if (duplicate) {
    return res.status(400).json({ success: false, error: 'A product with a matching slug already exists.' });
  }

  const parsedPrice = parseFloat(price);
  const parsedMrp = parseFloat(mrp);
  const discount = Math.round(((parsedMrp - parsedPrice) / parsedMrp) * 100);

  const newProduct = {
    id: products.length + 1,
    slug: slug,
    name: name,
    brand: brand,
    category: category,
    price: parsedPrice,
    mrp: parsedMrp,
    discount: discount > 0 ? discount : 0,
    badge: badge || 'SPECIAL DEAL',
    badgeColor: badgeColor || '#3B82F6',
    rating: 4.2,
    ratingCount: 1,
    image: req.body.image || null,
    specs: specs || [],
    pros: pros || [],
    cons: cons || [],
    affiliateUrl: amazonUrl || 'https://www.amazon.in',
    affiliateLinks: {
      amazon: amazonUrl || 'https://www.amazon.in',
      flipkart: flipkartUrl || 'https://www.flipkart.com'
    },
    active: true
  };

  products.push(newProduct);
  saveDatabase();
  res.json({ success: true, message: 'Product added successfully!', product: newProduct });
});

app.post('/api/admin/products/toggle', (req, res) => {
  const token = req.query.token;
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  const { slug } = req.body;
  if (!slug) {
    return res.status(400).json({ success: false, error: 'Slug parameter is required.' });
  }

  const product = products.find(p => p.slug === slug);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  product.active = !product.active;
  saveDatabase();
  res.json({ success: true, message: `Product is now ${product.active ? 'Active' : 'Hidden'}.`, active: product.active });
});

/* ───────────────────────────────────────────────────────────────
   HEALTH CHECK
   ─────────────────────────────────────────────────────────────── */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime().toFixed(2) + 's',
    memoryUsage: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
    totalClicks: clickLogs.length,
    totalImpressions: impressionLogs.length,
    subscribers: subscribers.length,
    timestamp: formatTimestamp(new Date())
  });
});

/* ───────────────────────────────────────────────────────────────
   FALLBACK
   ─────────────────────────────────────────────────────────────── */

app.use((req, res) => {
  res.status(404).send('<!DOCTYPE html><html><head><title>404 — Not Found</title></head><body style="font-family:system-ui;text-align:center;padding:60px"><h1>404 — Page Not Found</h1><p>The page you are looking for does not exist.</p><a href="/">← Back to Home</a></body></html>');
});

/* ───────────────────────────────────────────────────────────────
   SERVER START
   ─────────────────────────────────────────────────────────────── */

app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║   Affiliate Marketing Hub — Server Running      ║');
  console.log('  ╠══════════════════════════════════════════════════╣');
  console.log(`  ║   Local:   http://localhost:${PORT}                ║`);
  console.log(`  ║   Admin:   http://localhost:${PORT}/admin          ║`);
  console.log(`  ║   Health:  http://localhost:${PORT}/api/health     ║`);
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Products loaded: ' + products.length);
  console.log('  Admin token:     ' + ADMIN_TOKEN);
  console.log('');
});
