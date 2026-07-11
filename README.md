SecureCrypt

A Secure File Encryption and Decryption Web Application

--------------------------------------------------------------------------------

Overview

SecureCrypt is a browser-based web application developed to provide a secure platform for file encryption and decryption. The website integrates user authentication, session management, and activity monitoring while utilizing PostgreSQL for reliable and persistent data storage.

The project demonstrates the implementation of secure authentication mechanisms, relational database management, backend development using Flask, and modern web development practices.

--------------------------------------------------------------------------------

Features

- Secure user registration and authentication
- Password hashing for enhanced credential security
- Session-based authentication and access control
- Secure file encryption and decryption
- User activity logging
- Authentication event logging
- Responsive and intuitive user interface
- PostgreSQL database integration
- Environment-based configuration for secure deployment

--------------------------------------------------------------------------------

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

--------------------------------------------------------------------------------

System Architecture

                    Client Browser
                           │
                           ▼
        HTML • CSS • JavaScript Interface
                           │
                           ▼
                 Flask Web Application
                           │
                           ▼
                  PostgreSQL Database

--------------------------------------------------------------------------------

Project Structure

```text
SecureCrypt/
│
├── securecrypt_app/
│   ├── app.py
│   ├── requirements.txt
│   ├── static/
│   ├── templates/
│   ├── uploads/
│   ├── encrypted_files/
│   ├── .env
│   └── ...
│
├── README.md
└── .gitignore
```

--------------------------------------------------------------------------------

Installation

Clone the repository.

```bash
git clone https://github.com/<your-username>/SecureCrypt.git
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

Open the following address in your browser.

```
http://127.0.0.1:5000
```

--------------------------------------------------------------------------------

Database

The project utilizes PostgreSQL as its relational database management system.

The following tables are created during application initialization.

| Table | Description |
|-------|-------------|
| users | Stores user account information |
| activity_log | Records encryption and decryption activities |
| auth_log | Stores user registration, login, and logout events |

--------------------------------------------------------------------------------

Security

SecureCrypt incorporates several security practices, including:

- Secure password hashing
- Session-based authentication
- Environment variable configuration
- Parameterized SQL queries to mitigate SQL injection attacks
- Protected routes for authenticated users
- Secure PostgreSQL connectivity

--------------------------------------------------------------------------------

Deployment

The project is designed for deployment using the following architecture.

- GitHub for source code management
- Render for web hosting
- PostgreSQL services such as Supabase for production database hosting

--------------------------------------------------------------------------------

Author

Taranpreet Kaur

Bachelor of Technology in Computer Science and Engineering

--------------------------------------------------------------------------------

License

This project has been developed for educational and demonstration purposes.
