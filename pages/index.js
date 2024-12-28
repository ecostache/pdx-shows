import React, { useEffect, useState, useMemo, forwardRef } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import Select from 'react-select';
import 'react-datepicker/dist/react-datepicker.css';

const Home = () => {
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedVenues, setSelectedVenues] = useState([]);
  const [minDate, setMinDate] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(darkModeMediaQuery.matches);

      const handleDarkModeChange = (e) => setIsDarkMode(e.matches);
      darkModeMediaQuery.addEventListener('change', handleDarkModeChange);

      return () => {
        darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
      };
    }
  }, []);

  useEffect(() => {
    axios
      .get('/events.json')
      .then((response) => {
        const currentDate = new Date().setHours(0, 0, 0, 0);
        const futureEvents = response.data.filter(
          (event) => new Date(event.date) >= currentDate
        );

        setEvents(futureEvents);

        const uniqueVenues = [...new Set(futureEvents.map((event) => event.venue))]
          .sort()
          .map((venue) => ({ value: venue, label: venue }));
        setVenues(uniqueVenues);
      })
      .catch((error) => {
        console.error('Error fetching events:', error);
      });
  }, []);

  const handleVenueChange = (selectedOptions) => {
    setSelectedVenues(selectedOptions || []);
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const isVenueMatch =
        selectedVenues.length === 0 ||
        selectedVenues.some((venue) => venue.value === event.venue);
      const eventDate = new Date(event.date);
      const isDateMatch = !minDate || eventDate >= minDate;
      return isVenueMatch && isDateMatch;
    });
  }, [events, selectedVenues, minDate]);

  const groupedEvents = useMemo(() => {
    return filteredEvents.reduce((acc, event) => {
      const date = new Date(event.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    }, {});
  }, [filteredEvents]);

  const customStyles = useMemo(() => {
    const colorTheme = (light, dark) => (isDarkMode ? dark : light);

    return {
      control: (provided) => ({
        ...provided,
        backgroundColor: colorTheme('#fff', '#2d3748'),
        borderColor: colorTheme('#ccc', '#4a5568'),
        color: colorTheme('#000', '#e2e8f0'),
      }),
      menu: (provided) => ({
        ...provided,
        backgroundColor: colorTheme('#fff', '#2d3748'),
        color: colorTheme('#000', '#e2e8f0'),
      }),
      option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isFocused
          ? colorTheme('#e2e8f0', '#4a5568')
          : colorTheme('#fff', '#2d3748'),
        color: colorTheme('#000', '#e2e8f0'),
      }),
      multiValue: (provided) => ({
        ...provided,
        backgroundColor: colorTheme('#e2e8f0', '#4a5568'),
        color: colorTheme('#000', '#e2e8f0'),
      }),
      multiValueRemove: (provided) => ({
        ...provided,
        color: colorTheme('#000', '#e2e8f0'),
        ':hover': {
          backgroundColor: colorTheme('#e2e8f0', '#e53e3e'),
          color: colorTheme('#000', '#fff'),
        },
      }),
      placeholder: (provided) => ({
        ...provided,
        color: colorTheme('#9cafa3', '#a0aec0'),
      }),
      singleValue: (provided) => ({
        ...provided,
        color: colorTheme('#000', '#e2e8f0'),
      }),
    };
  }, [isDarkMode]);

  // Custom input component for the date picker
  const CustomDateInput = forwardRef(({ value, onClick, onClear }, ref) => (
    <div className="relative">
      <input
        ref={ref}
        value={value}
        onClick={onClick}
        readOnly
        className="p-2 w-full text-center bg-white text-gray-400 dark:bg-gray-700 dark:text-gray-400"
        placeholder="Jump to Date..."
      />
      {value && (
        <div
          onClick={onClear}
          aria-hidden="true"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer react-select__indicator react-select__clear-indicator css-15lsz6c-indicatorContainer"
        >
          <svg
            height="20"
            width="20"
            viewBox="0 0 20 20"
            aria-hidden="true"
            focusable="false"
            className="css-tj5bde-Svg"
          >
            <path d="M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z"></path>
          </svg>
        </div>
      )}
    </div>
  ));
  

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-gray-100">
        PDX Shows
      </h1>
      <div className="flex flex-col items-center mb-4 space-y-4">
        <DatePicker
          selected={minDate}
          onChange={(date) => setMinDate(date)}
          customInput={
            <CustomDateInput
              onClear={() => setMinDate(null)}
            />
          }
          dateFormat="d MMMM yyyy"
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
        {Object.entries(groupedEvents).map(([date, events]) => (
          <li key={date} className="p-4 bg-gray-50 dark:bg-gray-900 shadow-sm">
            <h2 className="text-sm font-semibold text-center text-gray-900 dark:text-gray-100 mb-2">
              {date}
            </h2>
            <ul className="space-y-2">
              {events.map((event, index) => (
                <li
                  key={index}
                  className={`p-2 ${
                    index !== events.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
                  }`}
                >
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
