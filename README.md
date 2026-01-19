# Secure Defense Learning Portal

A full-stack web application for managing and delivering educational video content with role-based access control.

## Features

- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Role-Based Access Control**: Separate admin and student portals
- **Video Management**: Upload, organize, and stream videos via AWS S3
- **Section Management**: Organize videos by subjects (Physics, Chemistry, Biology, etc.)
- **Student Assignment**: Admin can assign students to specific sections
- **Secure Video Streaming**: Videos accessed via signed URLs for security

## Tech Stack

- **Frontend**: React.js with React Router
- **Backend**: Node.js with Express
- **Database**: MySQL (AWS RDS or local)
- **Storage**: AWS S3
- **Authentication**: JWT token

