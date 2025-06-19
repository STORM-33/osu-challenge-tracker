import { useState, useEffect } from 'react';

export default function Test() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/challenges?active=true')
      .then(res => res.json())
      .then(data => {
        console.log('Test page data:', data);
        setData(data);
      })
      .catch(err => console.error('Test error:', err));
  }, []);

  return (
    <div>
      <h1>Test Page</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}