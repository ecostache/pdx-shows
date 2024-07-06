import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import Select from 'react-select';
import 'react-datepicker/dist/react-datepicker.css';

const Home = () => {
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedVenues, setSelectedVenues] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    axios.get('/events.json')
      .then(response => {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const futureEvents = response.data.filter(event => new Date(event.date) >= currentDate);
        setEvents(futureEvents);
        const uniqueVenues = [...new Set(futureEvents.map(event => event.venue))];
        uniqueVenues.sort(); // Sort venues alphabetically
        setVenues(uniqueVenues.map(venue => ({ value: venue, label: venue })));
      })
      .catch(error => {
        console.error("Error fetching data: ", error);
      });

    // Function to update the dark mode state
    const updateDarkMode = () => {
      setIsDarkMode(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    };

    // Initial check
    updateDarkMode();

    // Listen for changes to the color scheme
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', updateDarkMode);

    // Cleanup event listener on component unmount
    return () => {
      darkModeMediaQuery.removeEventListener('change', updateDarkMode);
    };
  }, []);

  const handleVenueChange = (selectedOptions) => {
    setSelectedVenues(selectedOptions || []);
  };

  const filteredEvents = events.filter(event => {
    const isVenueMatch = selectedVenues.length === 0 || selectedVenues.some(venue => venue.value === event.venue);
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

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: isDarkMode ? '#2d3748' : '#fff',
      borderColor: isDarkMode ? '#4a5568' : '#ccc',
      color: isDarkMode ? '#e2e8f0' : '#000',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: isDarkMode ? '#2d3748' : '#fff',
      color: isDarkMode ? '#e2e8f0' : '#000',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused
        ? isDarkMode
          ? '#4a5568'
          : '#e2e8f0'
        : isDarkMode
        ? '#2d3748'
        : '#fff',
      color: state.isFocused ? (isDarkMode ? '#e2e8f0' : '#000') : isDarkMode ? '#e2e8f0' : '#000',
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: isDarkMode ? '#4a5568' : '#e2e8f0',
      color: isDarkMode ? '#e2e8f0' : '#000',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: isDarkMode ? '#e2e8f0' : '#000',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: isDarkMode ? '#e2e8f0' : '#000',
      ':hover': {
        backgroundColor: isDarkMode ? '#e53e3e' : '#e2e8f0',
        color: isDarkMode ? '#fff' : '#000',
      },
    }),
    input: (provided) => ({
      ...provided,
      color: isDarkMode ? '#e2e8f0' : '#000',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: isDarkMode ? '#a0aec0' : '#9cafa3', // Adjusted for light mode
    }),
    singleValue: (provided) => ({
      ...provided,
      color: isDarkMode ? '#e2e8f0' : '#000',
    }),
  };  

  return (
    <div className="container mx-auto p-4 min-h-screen">
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
          className="p-2 text-center w-full max-w-xs md:max-w-sm lg:max-w-md bg-white text-gray-400 dark:bg-gray-700 dark:text-gray-400"
          placeholderText="Select Dates"
        />
        <Select
          isMulti
          value={selectedVenues}
          onChange={handleVenueChange}
          options={venues}
          styles={customStyles}
          className="w-full max-w-xs md:max-w-sm lg:max-w-md"
          classNamePrefix="react-select"
          placeholder="Select Venues"
        />
      </div>
      <ul className="space-y-4">
        {Object.keys(groupedEvents).map(date => (
          <li key={date} className="p-4 bg-gray-50 dark:bg-gray-900 shadow-sm">
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
