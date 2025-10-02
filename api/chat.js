const { parse } = require('pdf-parse');
const mammoth = require('mammoth');
const FormData = require('form-data');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY is not set');
    }

    // Parse FormData
    const formData = await new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body));
    });

    // Use a library like `formidable` or `busboy` to parse multipart form data
    // For simplicity, we'll use `formidable` here
    const formidable = require('formidable');
    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Error parsing files:', err);
        return res.status(500).json({ error: 'Failed to parse files' });
      }

      const { prompt } = fields;
      const documents = files.documents || [];

      // Extract text from each document
      let extractedTexts = [];
      for (const doc of Array.isArray(documents) ? documents : [documents]) {
        const fileBuffer = require('fs').readFileSync(doc.filepath);
        let text = '';

        if (doc.mimetype === 'application/pdf') {
          // Extract text from PDF
          const pdfData = await parse(fileBuffer);
          text = pdfData.text;
        } else if (doc.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // Extract text from DOCX
          const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
          text = docxData.value;
        } else {
          throw new Error('Unsupported file type');
        }

        extractedTexts.push(text);
      }

      // Combine extracted text and prompt
      const combinedText = extractedTexts.join('\n\n') + '\n\n' + prompt;

      // Call Mistral API
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'mistral-tiny',
          messages: [{ role: 'user', content: combinedText }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.statusText}`);
      }

      const data = await response.json();
      const reply = data.choices[0].message.content;
      return res.status(200).json({ reply });
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

