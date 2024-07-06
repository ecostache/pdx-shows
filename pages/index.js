import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Home = () => {
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('All Venues');

  useEffect(() => {
    axios.get('/events.json')
      .then(response => {
        const currentDate = new Date();
        currentDate.setHours(0,0,0,0);
        const futureEvents = response.data.filter(event => new Date(event.date) >= currentDate);
        setEvents(futureEvents);
        const uniqueVenues = [...new Set(futureEvents.map(event => event.venue))];
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
      <h1 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">PDX Shows</h1>
      <div className="flex justify-center mb-4">
        <select
          id="venue"
          value={selectedVenue}
          onChange={handleVenueChange}
          className="p-2 bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
          {venues.map((venue, index) => (
            <option key={index} value={venue}>{venue}</option>
          ))}
        </select>
      </div>
      <ul className="space-y-4">
        {filteredEvents.map((event, index) => (
          <li key={index} className="p-6 bg-gray-100 dark:bg-gray-900">
            <p className="text-sm font-light text-gray-700 dark:text-gray-400">{new Date(event.date).toLocaleDateString()}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{event.title}</p>
            <p className="mt-1 text-sm font-light text-gray-700 dark:text-gray-400">{event.venue}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
