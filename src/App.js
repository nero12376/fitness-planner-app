import React, { useState, useEffect, useRef } from 'react';

// IMPORTANT: Replace with your actual Google Cloud Project Client ID
// Follow these steps to get your Client ID:
// 1. Go to Google Cloud Console: https://console.cloud.google.com/
// 2. Create a new project or select an existing one.
// 3. Navigate to "APIs & Services" -> "Credentials".
// 4. Click "CREATE CREDENTIALS" -> "OAuth client ID".
// 5. Select "Web application".
// 6. Add "Authorized JavaScript origins":
//    - For local development: http://localhost:3000 (or whatever your local dev server uses)
//    - For Canvas: You'll need to find the exact domain/URL where your Canvas app runs.
//      This is often dynamically generated. For testing in Canvas, you might need to
//      add a broad redirect URI like `http://localhost`.
// 7. Add "Authorized redirect URIs":
//    - For Canvas, this will typically be the URL of the iframe where the app is embedded.
//      Again, this is often dynamically handled, but keep it in mind if you encounter issues.
//      A common fallback for some environments might be `http://localhost`.
// 8. Copy the "Your Client ID" that is generated.
const CLIENT_ID = '729067439732-lpki3rudvja4gs75v83qeq4vtfhajv20.apps.googleusercontent.com'; // <--- REPLACE THIS

// Google API scopes needed for Calendar access
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

// Discovery document for the Google Calendar API
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

// Fitness Plan Data
const fitnessPlan = [
  { day: 'Monday', label: 'Week 1-8: Recovery/Active Rest', activities: [
    { time: 'Morning (e.g., 7:00 AM - 8:00 AM)', description: 'Low-Impact Cardio (45-60 min brisk walk or light cycle)' },
    { time: 'Evening (e.g., 7:00 PM - 7:20 PM)', description: 'Dedicated Flexibility/Mobility (15-20 min foam rolling, static stretching)' }
  ]},
  { day: 'Tuesday', label: 'Week 1-8: Football Training Day', activities: [
    { time: 'During the Day', description: 'Nutrition Focus: Prioritize complex carbs & lean protein for sustained energy. Hydrate consistently.' },
    { time: 'Fixed Time (e.g., 6:00 PM - 8:00 PM)', description: 'Football Training Session' },
    { time: 'Immediately After Training', description: 'Mandatory Post-Session Static Stretching (5-10 min: hamstrings, quads, hip flexors, glutes, adductors, calves).' }
  ]},
  { day: 'Wednesday', label: 'Week 1-8: Strength & Core Focus', activities: [
    { time: 'Morning (e.g., 7:00 AM - 8:15 AM)', description: 'Strength Training Session (60-75 min): Lower Body Endurance/De-bulking (Bodyweight/light band, 15-25 reps) + Core Work (Planks, Dead Bug, Leg Raises etc.).' },
    { time: 'During the Day', description: 'Nutrition Focus: Balanced macros, good protein intake. Moderate carbs.' }
  ]},
  { day: 'Thursday', label: 'Week 1-8: Recovery/Active Rest', activities: [
    { time: 'Morning (e.g., 7:00 AM - 8:00 AM)', description: 'Low-Impact Cardio (45-60 min swimming or cycling at low resistance).' },
    { time: 'Evening (e.g., 7:00 PM - 7:20 PM)', description: 'Dedicated Flexibility/Mobility (15-20 min: deep hip stretches, Psoas stretches, longer hamstring holds).' }
  ]},
  { day: 'Friday', label: 'Week 1-8: Football Training Day', activities: [
    { time: 'During the Day', description: 'Nutrition Focus: Ample complex carbs & lean protein to fuel performance. Consistent hydration.' },
    { time: 'Fixed Time (e.g., 6:00 PM - 8:00 PM)', description: 'Football Training Session' },
    { time: 'Immediately After Training', description: 'Mandatory Post-Session Static Stretching (5-10 min: hamstrings, quads, hip flexors, glutes, adductors, calves).' }
  ]},
  { day: 'Saturday/Sunday (Option A)', label: 'Week 1-8: Football Match Day', activities: [
    { time: 'Fixed Time (e.g., afternoon)', description: 'Football Match' },
    { time: 'Immediately After Match', description: 'Mandatory Post-Match Static Stretching (5-10 min: critical for recovery).' },
    { time: 'Nutrition Focus', description: 'High carbs before, and focus on protein + carbs for recovery after.' }
  ]},
  { day: 'Saturday/Sunday (Option B)', label: 'Week 1-8: Strength/Rest Day', activities: [
    { time: 'Morning (e.g., 8:00 AM - 9:15 AM)', description: 'Strength Training Session (60-75 min): Full body, prioritize lower body endurance & core. OR Full Rest / Light active recovery (gentle walk).' },
    { time: 'Nutrition Focus', description: 'Balanced, moderate carbs.' }
  ]}
];

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' }); // Combined message state
  const googleSignInButtonRef = useRef(null); // Ref for the Google Sign-In button

  // Helper function to set messages
  const displayMessage = (text, type) => {
    setMessage({ text, type });
  };

  // Load Google API Client Library (gapi) for Calendar API
  useEffect(() => {
    const scriptGapi = document.createElement('script');
    scriptGapi.src = 'https://apis.google.com/js/api.js';
    scriptGapi.async = true;
    scriptGapi.defer = true;
    scriptGapi.onload = () => {
      window.gapi.load('client', () => { // Load only 'client' for Calendar API
        window.gapi.client.init({
          discoveryDocs: DISCOVERY_DOCS,
          // No API Key needed for client-side OAuth with calendar.events scope
        }).then(() => {
          console.log('Google Calendar API client loaded.');
        }).catch(error => {
          console.error('Error initializing Google Calendar API client:', error);
        });
      });
    };
    scriptGapi.onerror = () => {
      displayMessage('Failed to load Google API script (gapi). Please check your network.', 'error');
      console.error('Failed to load Google API script (gapi).');
    };
    document.body.appendChild(scriptGapi);

    return () => {
      document.body.removeChild(scriptGapi);
    };
  }, []);

  // Load Google Identity Services (GIS) for authentication
  useEffect(() => {
    const scriptGis = document.createElement('script');
    scriptGis.src = 'https://accounts.google.com/gsi/client';
    scriptGis.async = true;
    scriptGis.defer = true;
    scriptGis.onload = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: handleCredentialResponse, // This function will be called after sign-in
          ux_mode: 'popup', // Use 'popup' for better integration within an iframe/app
        });

        // Render the Google Sign-In button
        if (googleSignInButtonRef.current) {
          window.google.accounts.id.renderButton(
            googleSignInButtonRef.current,
            { theme: 'outline', size: 'large', text: 'signin_with', width: '200' } // Customize button appearance
          );
        }
        displayMessage('Google Sign-In initialized. Please sign in.', 'info');
      } else {
        displayMessage('Google Identity Services (GIS) not found. Ensure script is loaded.', 'error');
        console.error('GIS is not defined. Google Identity Services script might not be loaded.');
      }
    };
    scriptGis.onerror = () => {
      displayMessage('Failed to load Google Identity Services script. Please check your network.', 'error');
      console.error('Failed to load Google Identity Services script.');
    };
    document.body.appendChild(scriptGis);

    return () => {
      document.body.removeChild(scriptGis);
    };
  }, [handleCredentialResponse]); // Added handleCredentialResponse to dependency array


  // Callback function for Google Identity Services authentication
  const handleCredentialResponse = (response) => {
    if (response.credential) {
      // For GIS, `response.credential` is typically an ID token.
      // To get an access token for gapi.client calls, we need to use the token client.
      // This callback is primarily for the initial sign-in state.
      // The actual access token will be requested by `handleSignIn` via `tokenClient.current.requestAccessToken()`.
      setIsSignedIn(true);
      displayMessage('Signed in to Google. You can now add events to your calendar!', 'success');
    } else {
      setIsSignedIn(false);
      displayMessage('Google sign-in failed.', 'error');
    }
  };

  const tokenClient = useRef(null); // Ref to store the token client

  // Initialize the Google OAuth 2.0 Token Client
  useEffect(() => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.access_token) {
            window.gapi.client.setToken({
              access_token: tokenResponse.access_token
            });
            setIsSignedIn(true);
            displayMessage('Signed in to Google. You can now add events to your calendar!', 'success');
          } else {
            setIsSignedIn(false);
            displayMessage('Failed to get access token for Google Calendar.', 'error');
          }
        },
      });
    }
  }, []);


  const handleSignIn = () => {
    if (tokenClient.current) {
      tokenClient.current.requestAccessToken(); // Request the access token
    } else {
      displayMessage('Google Sign-In not initialized. Please refresh.', 'error');
    }
  };

  const handleSignOut = () => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      // Revoke the token
      const accessTokenToRevoke = window.gapi.client.getToken()?.access_token;
      if (accessTokenToRevoke) {
        window.google.accounts.oauth2.revoke(accessTokenToRevoke, () => {
          window.gapi.client.setToken(''); // Clear the token from gapi.client
          setIsSignedIn(false);
          displayMessage('Signed out of Google.', 'info');
        });
      } else {
        setIsSignedIn(false); // Already signed out or no token
        displayMessage('Signed out of Google.', 'info');
      }
    }
  };

  const addEventToCalendar = async (day, activity) => {
    if (!isSignedIn) {
      displayMessage('Please sign in to Google first.', 'error');
      return;
    }
    if (!window.gapi || !window.gapi.client || !window.gapi.client.calendar) {
        displayMessage('Google Calendar API not ready. Please wait a moment and try again.', 'error');
        return;
    }


    displayMessage('Adding event to calendar...', 'info');

    try {
      // Get current date to set events for the current week/future
      const today = new Date();
      const dayOfWeek = today.getDay(); // Sunday - 0, Monday - 1, etc.
      // Adjust day mapping for consistency: Monday=1, ..., Sunday=0
      const dayMap = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };
      const planDayIndex = dayMap[day.split('/')[0]]; // Handle "Saturday/Sunday" by taking "Saturday"

      // Calculate the date for the current week's plan day
      let targetDate = new Date(today);
      targetDate.setDate(today.getDate() + (planDayIndex - dayOfWeek));

      // If the target day has already passed this week, set it for next week
      // Also handle cases where the current day is the target day but the time has passed
      const now = new Date();
      if (targetDate < now && dayOfWeek !== planDayIndex) {
        targetDate.setDate(targetDate.getDate() + 7);
      } else if (targetDate.toDateString() === now.toDateString()) {
         // If it's today, check if the event time has passed
         const timeMatch = activity.time.match(/(\d{1,2}:\d{2})\s*(AM|PM)?/i);
         let eventHours = 9; // Default
         let eventMinutes = 0;
         if (timeMatch) {
            let [hours, minutes] = timeMatch[1].split(':');
            eventHours = parseInt(hours);
            eventMinutes = parseInt(minutes);
            if (timeMatch[2] && timeMatch[2].toLowerCase() === 'pm' && eventHours !== 12) {
              eventHours += 12;
            } else if (timeMatch[2] && timeMatch[2].toLowerCase() === 'am' && eventHours === 12) {
              eventHours = 0; // Midnight
            }
         }
         const eventTimeToday = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), eventHours, eventMinutes);
         if (eventTimeToday < now) {
             targetDate.setDate(targetDate.getDate() + 7); // Schedule for next week
         }
      }


      // Basic time parsing (e.g., "7:00 AM - 8:00 AM" -> "07:00")
      const timeMatch = activity.time.match(/(\d{1,2}:\d{2})\s*(AM|PM)?/i);
      let startTime = '09:00'; // Default if not found
      if (timeMatch) {
        let [hours, minutes] = timeMatch[1].split(':');
        hours = parseInt(hours);
        if (timeMatch[2] && timeMatch[2].toLowerCase() === 'pm' && hours !== 12) {
          hours += 12;
        } else if (timeMatch[2] && timeMatch[2].toLowerCase() === 'am' && hours === 12) {
          hours = 0; // Midnight
        }
        startTime = `${String(hours).padStart(2, '0')}:${minutes}`;
      }

      const eventStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]));
      const eventEnd = new Date(eventStart.getTime() + (60 * 60 * 1000)); // Assume 1 hour duration for simplicity

      const event = {
        'summary': `Football Plan: ${day} - ${activity.description}`,
        'description': `Your scheduled fitness activity: ${activity.description}`,
        'start': {
          'dateTime': eventStart.toISOString(),
          'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone, // Use user's local timezone
        },
        'end': {
          'dateTime': eventEnd.toISOString(),
          'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        'reminders': {
          'useDefault': true,
        },
      };

      const request = window.gapi.client.calendar.events.insert({
        'calendarId': 'primary', // 'primary' refers to the user's default calendar
        'resource': event,
      });

      const response = await request;
      console.log('Event created:', response.result);
      displayMessage(`Event "${event.summary}" added to your Google Calendar!`, 'success');

    } catch (error) {
      console.error('Error adding event to calendar:', error);
      displayMessage(`Failed to add event: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const MemoizedPlanCard = React.memo(({ dayPlan, addEvent }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
      <h3 className="text-xl font-semibold text-blue-700 mb-3 border-b-2 border-blue-200 pb-2">{dayPlan.day}</h3>
      <p className="text-gray-600 text-sm mb-4 italic">{dayPlan.label}</p>
      <ul className="space-y-3">
        {dayPlan.activities.map((activity, idx) => (
          <li key={idx} className="flex items-start">
            <span className="text-blue-500 mr-2 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l3 3a1 1 0 001.414-1.414L11 10.586V6z" clipRule="evenodd" />
              </svg>
            </span>
            <div>
              <p className="font-medium text-gray-800">{activity.time}</p>
              <p className="text-gray-700 text-sm">{activity.description}</p>
              {isSignedIn && (
                <button
                  onClick={() => addEvent(dayPlan.day, activity)}
                  className="mt-2 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-md hover:bg-green-600 transition-colors duration-200 shadow-sm"
                >
                  Add to Calendar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  ));


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-inter">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; }
        `}
      </style>

      <header className="text-center py-8 mb-8 bg-white rounded-xl shadow-md">
        <h1 className="text-4xl font-bold text-blue-800 mb-2">My Football & Fitness Plan</h1>
        <p className="text-lg text-gray-600">2-Month Journey to Leaner Thighs & Stronger Core</p>
      </header>

      {message.text && (
        <div className={`p-4 mb-6 rounded-lg shadow-md text-center ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-center mb-8 space-x-4">
        {isSignedIn ? (
          <button
            onClick={handleSignOut}
            className="px-6 py-3 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-colors duration-200"
          >
            Sign Out of Google
          </button>
        ) : (
          // Use a div with ref for GIS button rendering
          <div ref={googleSignInButtonRef} onClick={handleSignIn} className="cursor-pointer">
            {/* GIS button will be rendered here */}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {fitnessPlan.map((dayPlan, index) => (
          <MemoizedPlanCard key={index} dayPlan={dayPlan} addEvent={addEventToCalendar} />
        ))}
      </div>

      <footer className="text-center py-8 mt-12 text-gray-500 text-sm">
        <p>&copy; 2024 Fitness Planner. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
