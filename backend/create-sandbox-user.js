// backend/create-sandbox-user.js
import 'dotenv/config';
import bmoniClient from './src/services/bmoniClient.js';

async function createSandboxUser() {
  console.log('--- Registering BMoni Sandbox User ---');
  console.log(`Base URL: ${process.env.BMONI_BASE_URL || 'https://embedded-dev.bmoni.com'}`);

  const timestamp = Date.now();
  const payload = {
    firstName: 'GenuineNG',
    lastName: 'Sandbox',
    email: `sandbox_dev_${timestamp}@genuineng.com`,
    phoneNumber: `+23480${Math.floor(10000000 + Math.random() * 90000000)}`,
  };

  try {
    const response = await bmoniClient.post('/v1/users', payload);

    console.log('\nUser Creation Successful (HTTP 201/200)!');
    console.log('Full API Response:');
    console.dir(response.data, { depth: null });

    const bmoniUserId =
      response.data?.bmoniUserId ||
      response.data?.data?.bmoniUserId ||
      response.data?.id ||
      response.data?.data?.id;

    console.log('\n======================================================');
    console.log(`>>> BMONI_USER_ID: ${bmoniUserId}`);
    console.log('======================================================\n');
    console.log('Add this to your .env and Render variables:');
    console.log(`BMONI_USER_ID=${bmoniUserId}\n`);

    return bmoniUserId;
  } catch (err) {
    console.error('\nFailed to create sandbox user:');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error('Error Details:', err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

createSandboxUser();