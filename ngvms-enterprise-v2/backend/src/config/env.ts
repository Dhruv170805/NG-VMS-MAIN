import dotenv from 'dotenv';
dotenv.config();

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET'];

export const validateEnv = () => {
  const missing = requiredEnv.filter(key => !process.env[requiredKey(key)]);
  
  if (missing.length > 0) {
    console.error(`\nCRITICAL ERROR: Missing environment variables: ${missing.join(', ')}`);
    console.error(`Ensure these are defined in your .env file before starting the server.\n`);
    process.exit(1);
  }
};

// Helper for dev clarity
function requiredKey(key: string) {
    return key;
}
