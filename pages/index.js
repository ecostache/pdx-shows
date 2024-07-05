import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Home = () => {
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('All Venues');

  useEffect(() => {
    axios.get('/events.json')
      .then(response => {
        setEvents(response.data);
        const uniqueVenues = [...new Set(response.data.map(event => event.venue))];
        uniqueVenues.sort(); // Sort venues alphabetically
        setVenues(['All Venues', ...uniqueVenues]);
      })
      .catch(error => {
        console.error("Error fetching data: ", error);
      });
  }, []);

  const handleVenueChange = (e) => {
    setSelectedVenue(e.target.value);
  };

  const filteredEvents = selectedVenue === 'All Venues' ? events : events.filter(event => event.venue === selectedVenue);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-8">PDX Shows</h1>
      <div className="flex justify-center mb-4">
        <select
          id="venue"
          value={selectedVenue}
          onChange={handleVenueChange}
          className="p-2 bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-400">
          {venues.map((venue, index) => (
            <option key={index} value={venue}>{venue}</option>
          ))}
        </select>
      </div>
      <ul className="space-y-4">
        {filteredEvents.map((event, index) => (
          <li key={index} className="p-6 bg-gray-100 shadow-md dark:bg-gray-700">
            <p className="text-sm dark:text-gray-400">{new Date(event.date).toLocaleDateString()}</p>
            <p className="mt-2 font-semibold dark:text-gray-400">{event.title}</p>
            <p className="text-sm font-light mt-1 dark:text-gray-400">{event.venue}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
