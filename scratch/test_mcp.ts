import { searchFlights } from './frontend/lib/services/flights/flightsMcpService';
searchFlights({origin: 'BOM', destination: 'DEL', date: '2026-05-15', adults: 1, seat: 'economy'})
  .then(console.log)
  .catch(console.error);
