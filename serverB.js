// File: serverB.js
// Commit: remove file output and insert generated wordsets directly into Supabase

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

console.log('=== Running serverB.js ===');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const COMPONENT_COLUMNS = [
  'noun1',
  'noun2',
  'verb',
  'adjective1',
  'adjective2',
  'style',
  'setting',
  'era',
  'mood'
];

async function getRandomValue(column) {
  const { data, error } = await supabase
    .from('prompt_components')
    .select(column);

  if (error || !data || data.length === 0) {
    console.warn(`✗ Failed to fetch ${column}:`, error || 'No data');
    return null;
  }

  const values = data.map(row => row[column]).filter(Boolean);
  if (values.length === 0) {
    console.warn(`✗ No non-null values for ${column}`);
    return null;
  }

  const randomIndex = Math.floor(Math.random() * values.length);
  return values[randomIndex];
}

async function createWordset() {
  const wordset = {};

  for (const column of COMPONENT_COLUMNS) {
    const value = await getRandomValue(column);
    if (!value) {
      console.warn(`✗ Missing value for ${column}, skipping wordset`);
      return null;
    }
    wordset[column] = value;
  }

  return wordset;
}

async function run(batchSize = 20) {
  for (let i = 0; i < batchSize; i++) {
    const wordset = await createWordset();
    if (!wordset) continue;

    const { error } = await supabase.from('wordsets').insert(wordset);
    if (error) {
      console.error('✗ Failed to insert wordset:', error);
    } else {
      console.log(`✓ Inserted wordset #${i + 1}: ${JSON.stringify(wordset)}`);
    }
  }

  console.log(`✓ Batch complete.`);
}

async function loopForever(intervalMs = 30000) {
  while (true) {
    try {
      await run(20);
    } catch (err) {
      console.error('✗ serverB batch failed:', err);
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

loopForever();
