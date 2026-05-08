import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

const client = new Client({
  connectionString
});

const TRANSPORT_HUBS = {
  airports: [
    { name: "Indira Gandhi International Airport", city: "New Delhi", code: "DEL" },
    { name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", code: "BOM" },
    { name: "Kempegowda International Airport", city: "Bangalore", code: "BLR" },
    { name: "Rajiv Gandhi International Airport", city: "Hyderabad", code: "HYD" },
    { name: "Netaji Subhas Chandra Bose International Airport", city: "Kolkata", code: "CCU" },
    { name: "Chennai International Airport", city: "Chennai", code: "MAA" },
    { name: "Sardar Vallabhbhai Patel International Airport", city: "Ahmedabad", code: "AMD" },
    { name: "Cochin International Airport", city: "Kochi", code: "COK" },
    { name: "Pune Airport", city: "Pune", code: "PNQ" },
    { name: "Goa International Airport", city: "Goa", code: "GOI" },
    { name: "Manohar International Airport", city: "Goa", code: "GOX" },
    { name: "Jaipur International Airport", city: "Jaipur", code: "JAI" },
    { name: "Thiruvananthapuram International Airport", city: "Thiruvananthapuram", code: "TRV" },
    { name: "Lokpriya Gopinath Bordoloi International Airport", city: "Guwahati", code: "GAU" },
    { name: "Chaudhary Charan Singh International Airport", city: "Lucknow", code: "LKO" },
    { name: "Biju Patnaik International Airport", city: "Bhubaneswar", code: "BBI" },
    { name: "Dr. Babasaheb Ambedkar International Airport", city: "Nagpur", code: "NAG" },
    { name: "Devi Ahilya Bai Holkar Airport", city: "Indore", code: "IDR" },
    { name: "Lal Bahadur Shastri International Airport", city: "Varanasi", code: "VNS" },
    { name: "Sri Guru Ram Dass Jee International Airport", city: "Amritsar", code: "ATQ" },
    { name: "Bagdogra Airport", city: "Siliguri", code: "IXB" },
    { name: "Jay Prakash Narayan Airport", city: "Patna", code: "PAT" },
    { name: "Chandigarh Airport", city: "Chandigarh", code: "IXC" },
    { name: "Swami Vivekananda Airport", city: "Raipur", code: "RPR" },
    { name: "Visakhapatnam Airport", city: "Visakhapatnam", code: "VTZ" }
  ],
  railwayStations: [
    { name: "New Delhi Railway Station", code: "NDLS", city: "New Delhi" },
    { name: "Chhatrapati Shivaji Maharaj Terminus", code: "CSMT", city: "Mumbai" },
    { name: "Howrah Junction", code: "HWH", city: "Kolkata" },
    { name: "Chennai Central", code: "MAS", city: "Chennai" },
    { name: "Krantivira Sangolli Rayanna Bengaluru", code: "SBC", city: "Bangalore" },
    { name: "Secunderabad Junction", code: "SC", city: "Hyderabad" },
    { name: "Ahmedabad Junction", code: "ADI", city: "Ahmedabad" },
    { name: "Pune Junction", code: "PUNE", city: "Pune" },
    { name: "Jaipur Junction", code: "JP", city: "Jaipur" },
    { name: "Kanpur Central", code: "CNB", city: "Kanpur" },
    { name: "Lucknow Charbagh", code: "LKO", city: "Lucknow" },
    { name: "Patna Junction", code: "PNBE", city: "Patna" },
    { name: "Varanasi Junction", code: "BSB", city: "Varanasi" },
    { name: "Guwahati Railway Station", code: "GHY", city: "Guwahati" },
    { name: "Bhopal Junction", code: "BPL", city: "Bhopal" },
    { name: "Nagpur Junction", code: "NGP", city: "Nagpur" },
    { name: "Surat Railway Station", code: "ST", city: "Surat" },
    { name: "Prayagraj Junction", code: "PRYJ", city: "Prayagraj" },
    { name: "Vijayawada Junction", code: "BZA", city: "Vijayawada" },
    { name: "Kharagpur Junction", code: "KGP", city: "Kharagpur" },
    { name: "Itarsi Junction", code: "ET", city: "Itarsi" },
    { name: "Gorakhpur Junction", code: "GKP", city: "Gorakhpur" },
    { name: "Amritsar Junction", code: "ASR", city: "Amritsar" },
    { name: "Sealdah Railway Station", code: "SDAH", city: "Kolkata" },
    { name: "Mumbai Central", code: "MMCT", city: "Mumbai" }
  ]
};

async function main() {
  await client.connect();
  console.log('✅ Connected to Supabase for Transport Hubs Seeding');

  const dataToInsert = [
    ...TRANSPORT_HUBS.airports.map(a => ({ 
      name: a.name, 
      type: 'AIRPORT', 
      tier: 'HUB',
      metadata: JSON.stringify({ city: a.city, code: a.code }) 
    })),
    ...TRANSPORT_HUBS.railwayStations.map(r => ({ 
      name: r.name, 
      type: 'RAILWAY_STATION', 
      tier: 'HUB',
      metadata: JSON.stringify({ city: r.city, code: r.code }) 
    }))
  ];

  let successCount = 0;
  let errorCount = 0;

  for (let idx = 0; idx < dataToInsert.length; idx++) {
      const item = dataToInsert[idx];
      try {
          await client.query("INSERT INTO public.yatra_destination_cache (name, type, tier, metadata, updated_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type, tier = EXCLUDED.tier, metadata = EXCLUDED.metadata, updated_at = NOW()", [item.name, item.type, item.tier, item.metadata]);
          successCount++;
      } catch (err) {
          console.error('Failed to insert: ' + item.name, err.message);
          errorCount++;
      }
  }

  console.log("Successfully injected " + successCount + " Transport Hubs into yatra_destination_cache");
  if (errorCount > 0) console.log("Encountered " + errorCount + " errors");
  
  await client.end();
}

main().catch(console.error);
