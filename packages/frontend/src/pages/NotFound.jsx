/**
 * File Path: src/pages/NotFound.jsx
 * Version: 1.0.0
 * Description: 404 Not Found page component.
 */

import React from 'react'
import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="page-container">
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" className="home-link">Go back to Home</Link>
    </div>
  )
}

export default NotFound
