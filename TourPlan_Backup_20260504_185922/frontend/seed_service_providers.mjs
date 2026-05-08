import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

const client = new Client({
  connectionString
});

const SERVICE_PROVIDERS = {
  busProviders: [
    { name: "Zingbus", type: "BUS_PROVIDER", metadata: { category: "Premium Private", features: ["AC", "Sleeper", "WiFi"] } },
    { name: "IntrCity SmartBus", type: "BUS_PROVIDER", metadata: { category: "Premium Private", features: ["AC", "Lounge", "Washroom"] } },
    { name: "KSRTC", type: "BUS_PROVIDER", metadata: { category: "State Owned", full_name: "Karnataka State Road Transport" } },
    { name: "MSRTC (Shivneri)", type: "BUS_PROVIDER", metadata: { category: "State Owned", full_name: "Maharashtra State Road Transport" } },
    { name: "APSRTC", type: "BUS_PROVIDER", metadata: { category: "State Owned", full_name: "Andhra Pradesh State Road Transport" } },
    { name: "TSRTC", type: "BUS_PROVIDER", metadata: { category: "State Owned", full_name: "Telangana State Road Transport" } },
    { name: "UPSRTC", type: "BUS_PROVIDER", metadata: { category: "State Owned", full_name: "Uttar Pradesh State Road Transport" } },
    { name: "HRTC", type: "BUS_PROVIDER", metadata: { category: "State Owned", full_name: "Himachal Road Transport Corporation", features: ["Hill routes"] } },
    { name: "RSRTC", type: "BUS_PROVIDER", metadata: { category: "State Owned", full_name: "Rajasthan State Road Transport" } },
    { name: "VRL Travels", type: "BUS_PROVIDER", metadata: { category: "Private", regions: ["South India", "West India"] } },
    { name: "SRS Travels", type: "BUS_PROVIDER", metadata: { category: "Private", regions: ["South India"] } },
    { name: "Neeta Travels", type: "BUS_PROVIDER", metadata: { category: "Private", regions: ["West India", "Maharashtra", "Goa"] } },
    { name: "Orange Travels", type: "BUS_PROVIDER", metadata: { category: "Premium Private", regions: ["South India", "Maharashtra"] } },
    { name: "Jabbar Travels", type: "BUS_PROVIDER", metadata: { category: "Private", regions: ["South India"] } },
    { name: "RedBus Integrator", type: "BUS_PROVIDER", metadata: { category: "Aggregator", features: ["Pan India"] } }
  ],
  taxiProviders: [
    { name: "Ola Cabs", type: "TAXI_PROVIDER", metadata: { category: "Ride Hailing", types: ["Mini", "Prime", "Sedan", "SUV", "Outstation"] } },
    { name: "Uber India", type: "TAXI_PROVIDER", metadata: { category: "Ride Hailing", types: ["UberGo", "Premier", "XL", "Intercity"] } },
    { name: "BluSmart", type: "TAXI_PROVIDER", metadata: { category: "EV Ride Hailing", features: ["Zero Emissions", "No Surge Pricing", "Scheduled Rides"] } },
    { name: "Savaari Car Rentals", type: "TAXI_PROVIDER", metadata: { category: "Outstation Rentals", features: ["Chauffeur Driven", "Intercity"] } },
    { name: "Meru Cabs", type: "TAXI_PROVIDER", metadata: { category: "Ride Hailing & Airport", features: ["Airport Transfers", "City Rides"] } },
    { name: "MakeMyTrip Cabs", type: "TAXI_PROVIDER", metadata: { category: "Aggregator", features: ["Outstation", "Airport Drop"] } },
    { name: "InDrive", type: "TAXI_PROVIDER", metadata: { category: "Bidding Ride Hailing", features: ["Fair price bidding"] } },
    { name: "Mega Cabs", type: "TAXI_PROVIDER", metadata: { category: "Airport & City", features: ["Airport Kiosks"] } },
    { name: "Rapido", type: "TAXI_PROVIDER", metadata: { category: "Ride Hailing", types: ["Bike", "Auto", "Cab"] } },
    { name: "Fasttrack Cabs", type: "TAXI_PROVIDER", metadata: { category: "Ride Hailing", regions: ["South India"] } }
  ]
};

async function main() {
  await client.connect();
  console.log('✅ Connected to Supabase for Service Providers Seeding');

  const dataToInsert = [
    ...SERVICE_PROVIDERS.busProviders.map(p => ({ 
      name: p.name, 
      type: p.type, 
      tier: 'SERVICE',
      metadata: JSON.stringify(p.metadata) 
    })),
    ...SERVICE_PROVIDERS.taxiProviders.map(p => ({ 
      name: p.name, 
      type: p.type, 
      tier: 'SERVICE',
      metadata: JSON.stringify(p.metadata) 
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

  console.log("Successfully injected " + successCount + " Service Providers into yatra_destination_cache");
  if (errorCount > 0) console.log("Encountered " + errorCount + " errors");
  
  await client.end();
}

main().catch(console.error);
