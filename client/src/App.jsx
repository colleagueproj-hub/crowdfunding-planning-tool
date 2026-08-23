import React, { useState, useEffect } from 'react';
import './styles.css';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage('Crowdfunding Planning Tool');
  }, []);

  return (
    <div className="app-container">
      <div className="header">
        <h1>{message}</h1>
        <p>Google Sheets Edition</p>
      </div>
    </div>
  );
}

export default App;