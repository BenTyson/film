const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 2024 Oscar Data (96th Academy Awards)
const oscar2024Data = [
  // Best Actor 2024
  { category: 'Best Actor', year: 2024, nominees: [
    { name: 'Cillian Murphy', movie: 'Oppenheimer', tmdb_id: 872585, won: true },
    { name: 'Bradley Cooper', movie: 'Maestro', tmdb_id: 523607, won: false },
    { name: 'Colman Domingo', movie: 'Rustin', tmdb_id: 831815, won: false },
    { name: 'Paul Giamatti', movie: 'The Holdovers', tmdb_id: 840430, won: false },
    { name: 'Jeffrey Wright', movie: 'American Fiction', tmdb_id: 1056360, won: false }
  ]},

  // Best Actress 2024
  { category: 'Best Actress', year: 2024, nominees: [
    { name: 'Emma Stone', movie: 'Poor Things', tmdb_id: 792307, won: true },
    { name: 'Annette Bening', movie: 'Nyad', tmdb_id: 895549, won: false },
    { name: 'Lily Gladstone', movie: 'Killers of the Flower Moon', tmdb_id: 466420, won: false },
    { name: 'Sandra Hüller', movie: 'Anatomy of a Fall', tmdb_id: 915935, won: false },
    { name: 'Carey Mulligan', movie: 'Maestro', tmdb_id: 523607, won: false }
  ]},

  // Best Director 2024
  { category: 'Best Director', year: 2024, nominees: [
    { name: 'Christopher Nolan', movie: 'Oppenheimer', tmdb_id: 872585, won: true },
    { name: 'Justine Triet', movie: 'Anatomy of a Fall', tmdb_id: 915935, won: false },
    { name: 'Martin Scorsese', movie: 'Killers of the Flower Moon', tmdb_id: 466420, won: false },
    { name: 'Yorgos Lanthimos', movie: 'Poor Things', tmdb_id: 792307, won: false },
    { name: 'Jonathan Glazer', movie: 'The Zone of Interest', tmdb_id: 467244, won: false }
  ]}
];

// 2025 Oscar Data (97th Academy Awards)
const oscar2025Data = [
  // Best Actor 2025
  { category: 'Best Actor', year: 2025, nominees: [
    { name: 'Adrien Brody', movie: 'The Brutalist', tmdb_id: 974453, won: true },
    { name: 'Timothée Chalamet', movie: 'A Complete Unknown', tmdb_id: 661539, won: false },
    { name: 'Colman Domingo', movie: 'Sing Sing', tmdb_id: 1100782, won: false },
    { name: 'Ralph Fiennes', movie: 'Conclave', tmdb_id: 974576, won: false },
    { name: 'Sebastian Stan', movie: 'The Apprentice', tmdb_id: 939243, won: false }
  ]},

  // Best Actress 2025
  { category: 'Best Actress', year: 2025, nominees: [
    { name: 'Mikey Madison', movie: 'Anora', tmdb_id: 1064213, won: true },
    { name: 'Cynthia Erivo', movie: 'Wicked', tmdb_id: 402431, won: false },
    { name: 'Karla Sofía Gascón', movie: 'Emilia Pérez', tmdb_id: 974950, won: false },
    { name: 'Demi Moore', movie: 'The Substance', tmdb_id: 933260, won: false },
    { name: 'Fernanda Torres', movie: 'I\'m Still Here', tmdb_id: 43939, won: false }
  ]},

  // Best Director 2025
  { category: 'Best Director', year: 2025, nominees: [
    { name: 'Sean Baker', movie: 'Anora', tmdb_id: 1064213, won: true },
    { name: 'Brady Corbet', movie: 'The Brutalist', tmdb_id: 974453, won: false },
    { name: 'James Mangold', movie: 'A Complete Unknown', tmdb_id: 661539, won: false },
    { name: 'Jacques Audiard', movie: 'Emilia Pérez', tmdb_id: 974950, won: false },
    { name: 'Coralie Fargeat', movie: 'The Substance', tmdb_id: 933260, won: false }
  ]}
];

async function addMissingOscarData() {
  try {
    console.log('🎬 Starting to add missing Oscar categories for 2024-2025...\n');

    let totalAdded = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Combine all data
    const allData = [...oscar2024Data, ...oscar2025Data];

    for (const categoryData of allData) {
      console.log(`\n📋 Processing ${categoryData.category} ${categoryData.year}...`);

      // Get category ID
      const category = await prisma.oscarCategory.findUnique({
        where: { name: categoryData.category }
      });

      if (!category) {
        console.log(`❌ Category "${categoryData.category}" not found in database`);
        totalErrors++;
        continue;
      }

      for (const nominee of categoryData.nominees) {
        try {
          // Find or create oscar movie
          let oscarMovie = await prisma.oscarMovie.findFirst({
            where: { tmdb_id: nominee.tmdb_id }
          });

          if (!oscarMovie) {
            console.log(`➕ Creating new oscar movie: ${nominee.movie}`);
            oscarMovie = await prisma.oscarMovie.create({
              data: {
                tmdb_id: nominee.tmdb_id,
                title: nominee.movie
              }
            });
          }

          // Check if nomination already exists
          const existingNomination = await prisma.oscarNomination.findFirst({
            where: {
              ceremony_year: categoryData.year,
              category_id: category.id,
              movie_id: oscarMovie.id,
              nominee_name: nominee.name
            }
          });

          if (existingNomination) {
            console.log(`⏭️  Already exists: ${nominee.name} for ${nominee.movie}`);
            totalSkipped++;
            continue;
          }

          // Create nomination
          await prisma.oscarNomination.create({
            data: {
              ceremony_year: categoryData.year,
              category_id: category.id,
              movie_id: oscarMovie.id,
              nominee_name: nominee.name,
              is_winner: nominee.won
            }
          });

          const status = nominee.won ? '🏆 WON' : '🎭 NOMINATED';
          console.log(`✅ Added: ${nominee.name} - ${nominee.movie} ${status}`);
          totalAdded++;

        } catch (error) {
          console.error(`❌ Error processing ${nominee.name} for ${nominee.movie}:`, error.message);
          totalErrors++;
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Added: ${totalAdded}`);
    console.log(`⏭️  Skipped: ${totalSkipped}`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log(`📝 Total processed: ${totalAdded + totalSkipped + totalErrors}`);

    // Verify the additions
    console.log('\n🔍 Verification - Current 2024-2025 categories:');
    const verification = await prisma.oscarNomination.findMany({
      where: {
        ceremony_year: { in: [2024, 2025] }
      },
      include: {
        category: true
      },
      distinct: ['ceremony_year', 'category_id']
    });

    const grouped = verification.reduce((acc, nom) => {
      const key = nom.ceremony_year;
      if (!acc[key]) acc[key] = [];
      acc[key].push(nom.category.name);
      return acc;
    }, {});

    Object.keys(grouped).forEach(year => {
      console.log(`${year}: ${grouped[year].join(', ')}`);
    });

  } catch (error) {
    console.error('💥 Fatal error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addMissingOscarData();