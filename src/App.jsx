import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Welcome to React + TailwindCSS
        </h1>
        
        <div className="text-center">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
            onClick={() => setCount((count) => count + 1)}
          >
            Count is {count}
          </button>
        </div>
        
        <div className="mt-8 text-sm text-gray-600 text-center">
          <p>Click the button to test React state management</p>
          <p className="mt-2">Styled with TailwindCSS utilities</p>
        </div>
      </div>
    </div>
  )
}

export default App