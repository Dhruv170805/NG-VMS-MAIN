import dotenv from 'dotenv';

// Load environment variables from .env file
const result = dotenv.config();

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET'];

export const validateEnv = () => {
  const missing = requiredEnv.filter(key => {
    const val = process.env[key];
    return !val || val.trim() === '';
  });
  
  if (missing.length > 0) {
    console.error('-------------------------------------------------');
    console.error('❌ CRITICAL ERROR: Missing Environment Variables');
    console.error('-------------------------------------------------');
    console.error(`The following required variables are missing or empty:`);
    missing.forEach(key => console.error(` - ${key}`));
    console.error('\nPossible reasons:');
    console.error('1. Your .env file is missing from the backend root.');
    console.error('2. The variables are defined but have no values.');
    console.error('3. You are running the server from a different directory.');
    console.error('\nCheck your .env file or environment configuration.');
    console.error('-------------------------------------------------\n');
    process.exit(1);
  }
};
