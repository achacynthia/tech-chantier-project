import React, { useState } from 'react';

function FormTest() {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("Form submitted!");
    console.log("Input value:", inputValue);
    alert(`Form submitted with value: ${inputValue}`);
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Form Test Component</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="testInput" className="block text-sm font-medium text-gray-700 mb-2">
            Test Input:
          </label>
          <input 
            id="testInput"
            type="text" 
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Enter some text..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button 
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
        >
          Submit
        </button>
      </form>

      <div className="mt-4 p-3 bg-gray-100 rounded">
        <p className="text-sm text-gray-600">
          <strong>Instructions:</strong> Enter text and submit the form. Check the browser console and watch for the alert!
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Current input: "{inputValue}"
        </p>
      </div>
    </div>
  );
}

export default FormTest;