import fs, { writeFile, readFile } from 'fs/promises'
const URL_TO_BE_CONTACTED= "https://skak-score-db-api.onrender.com/skak"

async function checkAccess(): Promise<void> {

  try {
    const response: Response = await fetch(URL_TO_BE_CONTACTED, {
      headers: {
        // 'Authorization': 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64')
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP-fejl: ${response.status}`);
    }

    const data = await response.json();

    console.log('data modtaget', data)
    const filename = `data.txt`;
    await fs.appendFile(filename, JSON.stringify(data)+ '\n', 'utf-8');
    console.log(`Data gemt som ${filename}`);
  } catch (err) {
    console.error('Fejl ved hentning af data:', err);
  }
}

export default checkAccess();