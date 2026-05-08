const AMADEUS_BASE_URL = "https://test.api.amadeus.com/v1";
const AMADEUS_V2_BASE_URL = "https://test.api.amadeus.com/v2";

let accessToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken() {
    const clientId = process.env.AMADEUS_API_KEY;
    const clientSecret = process.env.AMADEUS_API_SECRET;

    if (!clientId || !clientSecret || clientId === 'YOUR_AMADEUS_KEY') {
        throw new Error("Amadeus credentials not configured");
    }

    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`
    });

    const data = await response.json();
    if (!data.access_token) {
        throw new Error("Failed to get Amadeus access token");
    }

    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer
    return accessToken;
}

export async function searchFlights(params: {
    origin: string;
    destination: string;
    date: string;
    adults?: number;
    maxPrice?: number;
}) {
    try {
        const token = await getAccessToken();
        const { origin, destination, date, adults = 1, maxPrice } = params;

        let url = `${AMADEUS_V2_BASE_URL}/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${date}&adults=${adults}&currencyCode=INR&max=10`;
        
        if (maxPrice) {
            url += `&maxPrice=${maxPrice}`;
        }

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();
        return data;
    } catch (error: any) {
        console.error("Amadeus Search Error:", error);
        return { errors: [{ detail: error.message }] };
    }
}

export async function getCityCodes(keyword: string) {
    try {
        const token = await getAccessToken();
        const url = `${AMADEUS_BASE_URL}/reference-data/locations?subType=CITY,AIRPORT&keyword=${keyword}&max=5`;

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();
        return data;
    } catch (error: any) {
        console.error("Amadeus City Search Error:", error);
        return { errors: [{ detail: error.message }] };
    }
}
