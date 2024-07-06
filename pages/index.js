import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Home = () => {
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('All Venues');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    axios.get('/events.json')
      .then(response => {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
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

  const filteredEvents = events.filter(event => {
    const isVenueMatch = selectedVenue === 'All Venues' || event.venue === selectedVenue;
    const eventDate = new Date(event.date);
    const isDateMatch = (!startDate || eventDate >= startDate) && (!endDate || eventDate <= endDate);
    return isVenueMatch && isDateMatch;
  });

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const date = new Date(event.date).toLocaleDateString('en-UK', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-4 dark:bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-gray-100">PDX Shows</h1>
      <div className="flex flex-col items-center mb-4 space-y-4">
        <DatePicker
          selected={startDate}
          onChange={(dates) => {
            const [start, end] = dates;
            setStartDate(start);
            setEndDate(end);
          }}
          startDate={startDate}
          endDate={endDate}
          selectsRange
          className="p-2 text-center w-full max-w-xs md:max-w-sm lg:max-w-md bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
          placeholderText="Select Dates"
        />
        <select
          id="venue"
          value={selectedVenue}
          onChange={handleVenueChange}
          className="p-2 w-full max-w-xs md:max-w-sm lg:max-w-md bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100">
          {venues.map((venue, index) => (
            <option key={index} value={venue}>{venue}</option>
          ))}
        </select>
      </div>
      <ul className="space-y-4">
        {Object.keys(groupedEvents).map(date => (
          <li key={date} className="p-4 bg-gray-50 dark:bg-gray-800 shadow-sm">
            <h2 className="text-sm font-semibold text-center text-gray-900 dark:text-gray-100 mb-2">{date}</h2>
            <ul className="space-y-2">
              {groupedEvents[date].map((event, index, array) => (
                <li key={index} className={`p-2 ${index !== array.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{event.title}</p>
                  <p className="text-xs font-light text-gray-700 dark:text-gray-400">{event.venue}</p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
