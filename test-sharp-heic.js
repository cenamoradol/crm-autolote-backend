const sharp = require('sharp');

async function testFormat() {
  const formats = sharp.format;
  console.log("HEIF Support:", formats.heif);
}

testFormat().catch(console.error);
