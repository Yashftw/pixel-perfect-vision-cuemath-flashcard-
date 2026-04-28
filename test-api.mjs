import fs from 'fs';

async function test() {
    const key = "AIzaSyAAKDCC4KgBdV_feZbDIwdYwKAMDaSbymU";
    const prompt = "what is the pythagores equation";
    
    console.log("Testing API...");
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1 }
            })
        }
    );
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
}

test();
