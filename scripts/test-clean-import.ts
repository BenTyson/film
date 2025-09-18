#!/usr/bin/env npx tsx

import { resetDatabase } from './reset-database';

async function testCleanImport() {
  console.log('🧪 Testing clean CSV import...');

  try {
    // First reset the database
    console.log('1. Resetting database...');
    await resetDatabase();

    // Test dry run first
    console.log('\n2. Testing dry run with 5 movies...');
    const dryRunResponse = await fetch('http://localhost:3002/api/import/clean-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dryRun: true,
        limitRows: 5
      })
    });

    if (!dryRunResponse.ok) {
      throw new Error(`Dry run failed: ${dryRunResponse.status}`);
    }

    const dryRunData = await dryRunResponse.json();
    console.log('✅ Dry run successful!');
    console.log('Stats:', dryRunData.data.stats);
    console.log('Sample results:', dryRunData.data.results.slice(0, 2));

    // Now do actual import with 20 movies
    console.log('\n3. Performing actual import with 20 movies...');
    const importResponse = await fetch('http://localhost:3002/api/import/clean-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dryRun: false,
        limitRows: 20
      })
    });

    if (!importResponse.ok) {
      throw new Error(`Import failed: ${importResponse.status}`);
    }

    const importData = await importResponse.json();
    console.log('✅ Import successful!');
    console.log('Final stats:', importData.data.stats);

    // Test the pending approval API
    console.log('\n4. Testing pending approval API...');
    const approvalResponse = await fetch('http://localhost:3002/api/movies/pending-approval');

    if (!approvalResponse.ok) {
      throw new Error(`Approval API failed: ${approvalResponse.status}`);
    }

    const approvalData = await approvalResponse.json();
    console.log('✅ Approval API working!');
    console.log('Pending movies found:', approvalData.data?.movies?.length || 0);

    if (approvalData.data?.movies?.length > 0) {
      console.log('Sample pending movie:', {
        title: approvalData.data.movies[0].movieTitle,
        csvTitle: approvalData.data.movies[0].csvTitle,
        confidence: approvalData.data.movies[0].confidenceScore,
        severity: approvalData.data.movies[0].severity
      });
    }

    console.log('\n🎉 All tests passed! Clean import workflow is working.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testCleanImport()
    .then(() => {
      console.log('✅ Test completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to run test:', error);
      process.exit(1);
    });
}

export { testCleanImport };