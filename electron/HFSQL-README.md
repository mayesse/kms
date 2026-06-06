# HFSQL Setup Guide — Green Crown POS

## What You Need

1. **HFSQL Client/Server** — free database server from PC SOFT
   - Download: https://windev.com/downloads/ (HFSQL Server is free)
   - Install on your Windows server or local machine

2. **ODBC Driver** — comes with HFSQL Client/Server installation
   - During install, make sure "HFSQL Client/Server ODBC Driver" is selected

3. **Green Crown POS** — the packaged installer EXE

## Setup Steps

### 1. Install HFSQL Server
- Run the HFSQL Server installer
- Create a new database (e.g., `greencrown_pos`)
- Note the host, port (default 4900), username, and password

### 2. Create Tables
- Open **HFSQL Control Center**
- Connect to your server
- Open the SQL editor
- Paste and run the contents of `electron/hfsql-schema.sql`
- This creates all 41 tables required by the app

### 3. Configure Green Crown POS
- Launch the app
- Go to **Account Options**
- Select **HFSQL (Local Server)**
- Fill in: Host, Port, Database name, Username, Password
- Click **Test Connection**
- Click **Save**

## Schema File
The full schema SQL is at:
`./electron/hfsql-schema.sql`
