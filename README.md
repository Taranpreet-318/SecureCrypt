SecureCrypt

A Secure File Encryption and Decryption Web Application

Overview

SecureCrypt is a browser-based web application developed to provide a secure environment for file encryption and decryption. The platform integrates user authentication, session management, and comprehensive activity logging while leveraging PostgreSQL for persistent data storage. The project demonstrates the implementation of secure authentication mechanisms, backend development using Flask, relational database management, and modern web development practices.

Features

- Secure user registration and authentication
- Password hashing using industry-standard techniques
- Session-based access control
- File encryption and decryption interface
- User activity monitoring
- Authentication event logging
- Responsive user interface
- PostgreSQL database integration
- Environment-based configuration for secure deployment

Technology Stack

Frontend

- HTML5
- CSS3
- JavaScript

Backend

- Python
- Flask

Database

- PostgreSQL

Libraries

- psycopg2
- Werkzeug
- python-dotenv
- Gunicorn

System Architecture

```
Client Browser
       │
       ▼
Frontend (HTML, CSS, JavaScript)
       │
       ▼
Flask Web Server
       │
       ▼
PostgreSQL Database
```

Project Structure

```text
SecureCrypt/
│
├── securecrypt_app/
│   ├── app.py
│   ├── requirements.txt
│   ├── templates/
│   ├── static/
│   ├── uploads/
│   ├── encrypted_files/
│   └── .env
│
├── README.md
└── .gitignore
```

Installation

Clone the repository.

```bash
git clone https://github.com/<username>/SecureCrypt.git
```

Navigate to the project directory.

```bash
cd SecureCrypt/securecrypt_app
```

Create a virtual environment.

```bash
python -m venv venv
```

Activate the virtual environment.

Windows

```bash
venv\Scripts\activate
```

Install the required dependencies.

```bash
pip install -r requirements.txt
```

Create a `.env` file.

```env
DATABASE_URL=your_postgresql_connection_string
SECRET_KEY=your_secret_key
```

Run the development server.

```bash
python app.py
```

The website will be available at:

```
http://127.0.0.1:5000
```

Database

The project uses PostgreSQL as its relational database management system. During initialization, the application automatically creates the following tables if they do not already exist.

| Table | Purpose |
|-------|---------|
| users | Stores registered user information |
| activity_log | Records encryption and decryption activities |
| auth_log | Maintains authentication events, including user registration, login, and logout |

Security Considerations

SecureCrypt incorporates several security practices to improve application security and data integrity.

- Password hashing using Werkzeug
- Session-based authentication
- Parameterized SQL queries to prevent SQL injection
- Environment variable management through python-dotenv
- Protected routes for authenticated users
- Secure PostgreSQL database connectivity

Deployment

The project is designed for deployment using the following architecture.

- GitHub for version control
- Render for web hosting
- PostgreSQL services such as Supabase, Render PostgreSQL, or Neon for production data storage

Future Development

Potential enhancements include:

- Multi-factor authentication
- Password recovery functionality
- Administrative dashboard
- Role-based access control
- Enhanced audit reporting
- Cloud storage integration

Author

Taranpreet Kaur

Bachelors of Technology in Computer Science and Engineering

License
This project is intended solely for educational and demonstration purposes.
