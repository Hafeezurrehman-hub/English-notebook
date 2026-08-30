// EnglishNotebook — Cloudflare Worker (Groq API Proxy)
// Secure proxy for Groq API calls — uses FREE Llama 3 model
// API key is stored in environment variable GROQ_API_KEY

export default {
  async fetch(request, env) {

    const ALLOWED_ORIGIN = "https://hafeezurrehman-hub.github.io";
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = origin.startsWith("https://hafeezurrehman-hub.github.io")
      ? origin : ALLOWED_ORIGIN;

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const body = await request.json();

      // Convert from the client's format to Groq (OpenAI-compatible) format
      // Client sends: { model, max_tokens, system, messages }
      // Groq expects: { model, max_tokens, messages: [{role,content}...] }
      const groqMessages = [];

      // Add system message if provided
      if (body.system) {
        groqMessages.push({ role: "system", content: body.system });
      }

      // Add user messages
      if (body.messages && Array.isArray(body.messages)) {
        body.messages.forEach(function(m) {
          groqMessages.push({ role: m.role, content: m.content });
        });
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + env.GROQ_API_KEY,
        },
        body: JSON.stringify({
          model: body.model || "llama-3.3-70b-versatile",
          max_tokens: body.max_tokens || 350,
          temperature: 0.7,
          messages: groqMessages,
        }),
      });

      const data = await response.json();

      // Return in a format compatible with the client
      // Client expects: { content: [{ type: "text", text: "..." }] }
      // Groq returns: { choices: [{ message: { content: "..." } }] }
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return new Response(JSON.stringify({
          content: [{ type: "text", text: data.choices[0].message.content }]
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Pass through error from Groq
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: { message: err.message } }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  },
};
