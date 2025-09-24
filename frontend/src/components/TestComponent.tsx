import { useState, useEffect } from 'react';

export default function TestComponent() {
  const [test, setTest] = useState('test');

  useEffect(() => {
    console.log('TestComponent mounted');
  }, []);

  return (
    <div>
      <h1>Test Component</h1>
      <p>Value: {test}</p>
      <button onClick={() => setTest(Date.now().toString())}>
        Update Value
      </button>
    </div>
  );
}