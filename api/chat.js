const { MistralClient } = require('@mistralai/mistralai');

const client = new MistralClient(process.env.MISTRAL_API_KEY);

module.exports = async (req, res) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { message } = req.body;
    const chatResponse = await client.chat({
      model: 'mistral-tiny',
      messages: [{ role: 'user', content: message }],
    });
    const reply = chatResponse.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch response from Mistral' });
  }
};
