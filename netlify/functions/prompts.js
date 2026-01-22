// ========================================
// NETLIFY FUNCTION: Prompts API
// ========================================
// Speichert und lädt Prompts via Netlify Blobs

import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    const store = getStore("prompts-data");
    const BLOB_KEY = "library";

    // CORS Headers
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Content-Type": "application/json"
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
    }

    try {
        // GET - Daten laden
        if (req.method === "GET") {
            const data = await store.get(BLOB_KEY, { type: "json" });

            if (!data) {
                return new Response(
                    JSON.stringify({ prompts: [], categories: [] }),
                    { status: 200, headers }
                );
            }

            return new Response(JSON.stringify(data), { status: 200, headers });
        }

        // POST - Daten speichern
        if (req.method === "POST") {
            const body = await req.json();

            // Validierung
            if (!body.prompts || !Array.isArray(body.prompts)) {
                return new Response(
                    JSON.stringify({ error: "Invalid data: prompts array required" }),
                    { status: 400, headers }
                );
            }

            const dataToSave = {
                prompts: body.prompts,
                categories: body.categories || [],
                lastModified: new Date().toISOString()
            };

            await store.setJSON(BLOB_KEY, dataToSave);

            return new Response(
                JSON.stringify({ success: true, message: "Data saved successfully" }),
                { status: 200, headers }
            );
        }

        // Method not allowed
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers }
        );

    } catch (error) {
        console.error("Function error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: error.message }),
            { status: 500, headers }
        );
    }
};

