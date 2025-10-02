const { MistralClient } = require('@mistralai/mistralai');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY is not set');
    }

    const client = new MistralClient(process.env.MISTRAL_API_KEY);
    const { message } = req.body;

    console.log('Received message:', message);  // Debugging log

    if (!message) {
      throw new Error('Message is required');
    }

    const chatResponse = await client.chat({
      model: 'mistral-tiny',
      messages: [{ role: 'user', content: message }],
    });

    const reply = chatResponse.choices[0].message.content;
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};



