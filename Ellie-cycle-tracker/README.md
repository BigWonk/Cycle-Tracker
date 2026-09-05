# 🌸 Bloom — Menstrual Cycle Tracker

Bloom is a full-stack menstrual cycle tracking web application designed to help users record, understand, and manage their menstrual cycles in a simple, private, and aesthetically pleasing environment.

Users can create an account, track their cycle dates, record flow and symptoms, add personal notes, manage their profile, and connect with others through Bloom Circles.

---

## ✨ Features

### 🌷 Menstrual Cycle Tracking

- Record menstrual cycle entries by date
- Track menstrual flow
- Record multiple symptoms
- Add personal notes
- View previously recorded entries
- Update existing cycle entries
- Store cycle information securely in the database

### 👤 User Accounts

- User registration and login
- Secure password hashing
- JWT-based authentication
- Individual user profiles
- Average cycle length tracking
- Average period length tracking

### 💕 Bloom Circles

Bloom includes a circle-based feature that allows users to connect with other users.

- Create a private circle
- Generate a unique circle code
- Join/follow an existing circle
- Store circle ownership information
- Track circle followers

### 🔐 Security

Bloom is designed with privacy and security in mind.

- Passwords are securely hashed
- JWT is used for authentication
- Sensitive configuration is stored in environment variables
- Personal notes can be encrypted before being stored
- Database credentials are never stored directly in the source code
- `.env` is excluded from GitHub using `.gitignore`

---

## 🛠️ Technologies Used

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Node.js
- Express.js

### Database

- PostgreSQL
- Supabase

### Security & Authentication

- JSON Web Token (JWT)
- bcrypt
- dotenv
- Encryption for sensitive notes

### Development & Version Control

- npm
- Git
- GitHub

---

## 🏗️ Application Architecture

```text
                    🌸 BLOOM
                       │
                       ▼
                Frontend Interface
                       │
                       ▼
                Express.js API
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
       Authentication       Application APIs
             │                   │
             └─────────┬─────────┘
                       │
                       ▼
              PostgreSQL Database
                  via Supabase
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
      users      cycle_entries     circles
                                      │
                                      ▼
                              circle_followers
