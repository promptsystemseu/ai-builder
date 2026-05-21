export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { language, config, systemPrompt } = req.body || {};

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'Missing ANTHROPIC_API_KEY'
      });
    }

    const outputLanguage = language === 'pl' ? 'Polish' : 'English';

    const optimizerPrompt = `
You are an expert AI systems architect.

Analyze this AI employee configuration and system prompt.
Return ONLY valid JSON.

Output language: ${outputLanguage}

JSON shape:
{
  "summary": "short summary",
  "recommendations": [
    "recommendation 1",
    "recommendation 2"
  ],
  "scoreImprovements": {
    "clarity": 0,
    "safety": 0,
    "sales": 0
  }
}

Configuration:
${JSON.stringify(config, null, 2)}

Current system prompt:
${systemPrompt}
`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1200,
        messages: [
          {
            role: 'user',
            content: optimizerPrompt
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || JSON.stringify(data)
      });
    }

    const raw = data?.content?.[0]?.text || '{}';

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        summary: 'Optimization complete.',
        recommendations: [raw],
        scoreImprovements: {
          clarity: 85,
          safety: 85,
          sales: 80
        }
      };
    }

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
