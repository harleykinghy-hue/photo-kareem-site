import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

serve(async (req) => {
  try {
    // 1. استقبال الطلب (CORS Handling)
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }});
    }

    const { prompt } = await req.json();
    console.log("🚀 Prompt received:", prompt);

    // 2. تحسين الوصف بـ Gemini
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `Enhance this image prompt for an AI art generator, make it detailed and creative: ${prompt}` }] }] })
    });
    
    const geminiData = await geminiRes.json();
    const improvedPrompt = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || prompt;
    console.log("✨ Improved Prompt:", improvedPrompt);

    // 3. التوليد بـ Replicate
    const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "ac732d839923294274339039e81305106191fe773e320493649692120e5c6a1e",
        input: { prompt: improvedPrompt }
      }),
    });

    const prediction = await replicateRes.json();
    
    if (prediction.error) throw new Error(prediction.error);

    return new Response(JSON.stringify(prediction), { 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
})

// Ready to launch
