import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

const client = new Client({
  connectionString
});

const INDIAN_TIER_CITIES = {
  tier1: [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune"
  ],
  tier2: [
    "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara",
    "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli", "Varanasi",
    "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore",
    "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", "Mysore",
    "Gurgaon", "Aligarh", "Jalandhar", "Bhubaneswar", "Salem", "Warangal", "Thiruvananthapuram", "Guntur", "Noida",
    "Jamshedpur", "Bhilai", "Cuttack", "Kochi", "Nellore", "Dehradun", "Rourkela", "Nanded", "Kolhapur", "Ajmer",
    "Gulbarga", "Jamnagar", "Ujjain", "Siliguri", "Jhansi", "Mangalore", "Belgaum", "Mangalore", "Udaipur", "Gaya"
  ],
  tier3: [
    "Shimla", "Manali", "Rishikesh", "Haridwar", "Dharamshala", "Mussoorie", "Nainital", "Mount Abu", "Udhagamandalam",
    "Kodaikanal", "Munnar", "Wayanad", "Alappuzha", "Thekkady", "Varkala", "Kanyakumari", "Madurai", "Rameshwaram",
    "Thanjavur", "Hampi", "Gokarna", "Murudeshwar", "Udupi", "Jog Falls", "Chikmagalur", "Coorg", "Badami", "Bijapur",
    "Bidar", "Gulbarga", "Solapur", "Kolhapur", "Ratnagiri", "Ganpatipule", "Mahabaleshwar", "Panchgani", "Lonavala",
    "Khandala", "Matheran", "Alibaug", "Murud-Janjira", "Tarkarli", "Malvan", "Shirdi", "Nashik", "Trimbakeshwar",
    "Aurangabad", "Ahmednagar", "Jalgaon", "Amravati", "Nagpur", "Wardha", "Chandrapur", "Tadoba", "Pench", "Kanha",
    "Bandhavgarh", "Panna", "Khajuraho", "Orchha", "Gwalior", "Bhopal", "Sanchi", "Bhimbetka", "Pachmarhi", "Jabalpur",
    "Bhedaghat", "Amarkantak", "Raipur", "Bastar", "Jagdalpur", "Chitrakoot", "Mainpat", "Sirpur", "Bilaspur", "Bhilai",
    "Durg", "Rajnandgaon", "Jagdalpur", "Dantewada", "Nagaur", "Bikaner", "Jaisalmer", "Barmer", "Jodhpur", "Osian",
    "Rohet", "Khimsar", "Ajmer", "Pushkar", "Udaipur", "Chittorgarh", "Kumbhalgarh", "Ranakpur", "Mount Abu", "Sirohi"
  ],
  famousDestinations: [
    // Famous Monuments
    { name: "Taj Mahal", city: "Agra", type: "HERITAGE" },
    { name: "Golden Temple", city: "Amritsar", type: "RELIGIOUS" },
    { name: "Gateway of India", city: "Mumbai", type: "LANDMARK" },
    { name: "Hawa Mahal", city: "Jaipur", type: "HERITAGE" },
    { name: "Qutub Minar", city: "Delhi", type: "HERITAGE" },
    { name: "Victoria Memorial", city: "Kolkata", type: "HERITAGE" },
    { name: "Charminar", city: "Hyderabad", type: "HERITAGE" },
    { name: "Ajanta Caves", city: "Aurangabad", type: "HERITAGE" },
    { name: "Ellora Caves", city: "Aurangabad", type: "HERITAGE" },
    { name: "Hampi Ruins", city: "Hampi", type: "HERITAGE" },
    { name: "Sanchi Stupa", city: "Sanchi", type: "HERITAGE" },
    { name: "India Gate", city: "Delhi", type: "LANDMARK" },
    { name: "Mysore Palace", city: "Mysore", type: "HERITAGE" },
    
    // Historic Forts
    { name: "Red Fort", city: "Delhi", type: "HERITAGE" },
    { name: "Agra Fort", city: "Agra", type: "HERITAGE" },
    { name: "Amber Fort", city: "Jaipur", type: "HERITAGE" },
    { name: "Mehrangarh Fort", city: "Jodhpur", type: "HERITAGE" },
    { name: "Gwalior Fort", city: "Gwalior", type: "HERITAGE" },
    { name: "Golconda Fort", city: "Hyderabad", type: "HERITAGE" },
    { name: "Chittorgarh Fort", city: "Chittorgarh", type: "HERITAGE" },
    { name: "Jaisalmer Fort", city: "Jaisalmer", type: "HERITAGE" },
    { name: "Kumbhalgarh Fort", city: "Kumbhalgarh", type: "HERITAGE" },
    { name: "Kangra Fort", city: "Kangra", type: "HERITAGE" },
    { name: "Sindhudurg Fort", city: "Malvan", type: "HERITAGE" },
    
    // Temples & Religious
    { name: "Kashi Vishwanath Temple", city: "Varanasi", type: "RELIGIOUS" },
    { name: "Vaishno Devi", city: "Katra", type: "RELIGIOUS" },
    { name: "Tirupati Balaji", city: "Tirupati", type: "RELIGIOUS" },
    { name: "Kedarnath Temple", city: "Kedarnath", type: "RELIGIOUS" },
    { name: "Badrinath Temple", city: "Badrinath", type: "RELIGIOUS" },
    { name: "Somnath Temple", city: "Somnath", type: "RELIGIOUS" },
    { name: "Rameshwaram Temple", city: "Rameshwaram", type: "RELIGIOUS" },
    { name: "Meenakshi Amman Temple", city: "Madurai", type: "RELIGIOUS" },
    { name: "Jagannath Temple", city: "Puri", type: "RELIGIOUS" },
    { name: "Siddhivinayak Temple", city: "Mumbai", type: "RELIGIOUS" },
    { name: "Akshardham Temple", city: "Delhi", type: "RELIGIOUS" },
    { name: "Konark Sun Temple", city: "Konark", type: "HERITAGE" },
    { name: "Padmanabhaswamy Temple", city: "Thiruvananthapuram", type: "RELIGIOUS" },
    { name: "Khajuraho Temples", city: "Khajuraho", type: "HERITAGE" },
    
    // Rivers & Valleys
    { name: "Ganga River", city: "Varanasi", type: "NATURE" },
    { name: "Yamuna River", city: "Agra", type: "NATURE" },
    { name: "Brahmaputra River", city: "Guwahati", type: "NATURE" },
    { name: "Narmada River", city: "Jabalpur", type: "NATURE" },
    { name: "Kaveri River", city: "Tiruchirappalli", type: "NATURE" },
    { name: "Godavari River", city: "Nashik", type: "NATURE" },
    { name: "Valley of Flowers", city: "Uttarakhand", type: "NATURE" },
    { name: "Nubra Valley", city: "Ladakh", type: "NATURE" },
    { name: "Zanskar River", city: "Ladakh", type: "NATURE" },
    
    // Beaches
    { name: "Baga Beach", city: "Goa", type: "NATURE" },
    { name: "Palolem Beach", city: "Goa", type: "NATURE" },
    { name: "Radhanagar Beach", city: "Andaman", type: "NATURE" },
    { name: "Marina Beach", city: "Chennai", type: "NATURE" },
    { name: "Varkala Beach", city: "Varkala", type: "NATURE" },
    { name: "Gokarna Beaches", city: "Gokarna", type: "NATURE" },
    { name: "Puri Beach", city: "Puri", type: "NATURE" },
    { name: "Kovalam Beach", city: "Thiruvananthapuram", type: "NATURE" },
    { name: "Arambol Beach", city: "Goa", type: "NATURE" },
    
    // Famous Gatherings & Festivals
    { name: "Kumbh Mela", city: "Prayagraj", type: "FESTIVAL" },
    { name: "Pushkar Camel Fair", city: "Pushkar", type: "FESTIVAL" },
    { name: "Rann Utsav", city: "Kutch", type: "FESTIVAL" },
    { name: "Hornbill Festival", city: "Nagaland", type: "FESTIVAL" },
    { name: "Hemis Festival", city: "Ladakh", type: "FESTIVAL" },
    { name: "Durga Puja Gatherings", city: "Kolkata", type: "FESTIVAL" },
    { name: "Ganesh Chaturthi", city: "Mumbai", type: "FESTIVAL" },
    
    // Famous Holi Places
    { name: "Vrindavan Holi", city: "Vrindavan", type: "FESTIVAL" },
    { name: "Mathura Holi", city: "Mathura", type: "FESTIVAL" },
    { name: "Barsana Lathmar Holi", city: "Barsana", type: "FESTIVAL" },
    { name: "Nandgaon Holi", city: "Nandgaon", type: "FESTIVAL" },
    { name: "Udaipur Royal Holi", city: "Udaipur", type: "FESTIVAL" },
    { name: "Pushkar Holi", city: "Pushkar", type: "FESTIVAL" },
    { name: "Hampi Holi", city: "Hampi", type: "FESTIVAL" },
    { name: "Shantiniketan Basanta Utsav", city: "Shantiniketan", type: "FESTIVAL" },
    { name: "Anandpur Sahib Hola Mohalla", city: "Anandpur Sahib", type: "FESTIVAL" }
  ]
};

async function main() {
  await client.connect();
  console.log('✅ Connected to Supabase for Seeding Destination Cache');

  const dataToInsert = [
    ...INDIAN_TIER_CITIES.tier1.map(c => ({ name: c, type: 'CITY', tier: 'TIER1' })),
    ...INDIAN_TIER_CITIES.tier2.map(c => ({ name: c, type: 'CITY', tier: 'TIER2' })),
    ...INDIAN_TIER_CITIES.tier3.map(c => ({ name: c, type: 'CITY', tier: 'TIER3' })),
    ...INDIAN_TIER_CITIES.famousDestinations.map(d => ({ 
      name: d.name, 
      type: d.type, 
      tier: 'FAMOUS',
      metadata: JSON.stringify({ city: d.city, original_type: d.type }) 
    }))
  ];

  let successCount = 0;
  let errorCount = 0;

  for (let idx = 0; idx < dataToInsert.length; idx++) {
      const item = dataToInsert[idx];
      try {
          await client.query("INSERT INTO public.yatra_destination_cache (name, type, tier, metadata, updated_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type, tier = EXCLUDED.tier, metadata = EXCLUDED.metadata, updated_at = NOW()", [item.name, item.type, item.tier, typeof item.metadata === 'string' ? item.metadata : '{}']);
          successCount++;
      } catch (err) {
          console.error('Failed to insert: ' + item.name, err.message);
          errorCount++;
      }
  }

  console.log("Successfully injected " + successCount + " destinations into yatra_destination_cache");
  if (errorCount > 0) console.log("Encountered " + errorCount + " errors");
  
  await client.end();
}

main().catch(console.error);
