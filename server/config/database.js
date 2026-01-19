const sql = require('mssql');
const bcrypt = require('bcrypt');
require('dotenv').config();

let pool;

const getPool = () => {
  if (!pool) {
    // Check if Windows Authentication is explicitly enabled or if SQL credentials are missing
    const useWindowsAuth = process.env.DB_USE_WINDOWS_AUTH === 'true' || 
                          (!process.env.DB_USER || process.env.DB_USER.startsWith('#'));
    
    const config = {
      server: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'learning_portal',
      port: parseInt(process.env.DB_PORT || '1433'),
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true', // Use true for Azure SQL
        trustServerCertificate: true, // Use true for local dev
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 30000
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };
    
    if (useWindowsAuth) {
      // Windows Authentication - use explicit credentials if provided, otherwise use integrated
      if (process.env.DB_WINDOWS_USER && process.env.DB_WINDOWS_PASSWORD) {
        config.authentication = {
          type: 'ntlm',
          options: {
            userName: process.env.DB_WINDOWS_USER,
            password: process.env.DB_WINDOWS_PASSWORD,
            domain: process.env.DB_DOMAIN || process.env.DB_HOST || 'localhost'
          }
        };
        console.log(`Connecting to SQL Server with Windows Authentication (explicit credentials): ${config.server}, Database: ${config.database}`);
      } else {
        // Integrated Windows Authentication (current Windows user)
        config.authentication = {
          type: 'ntlm'
        };
        console.log(`Connecting to SQL Server with Integrated Windows Authentication: ${config.server}, Database: ${config.database}`);
      }
    } else {
      // SQL Server Authentication
      config.user = process.env.DB_USER;
      config.password = process.env.DB_PASSWORD;
      console.log(`Connecting to SQL Server: ${config.server}, User: ${config.user}, Database: ${config.database}`);
    }
    
    pool = new sql.ConnectionPool(config);
  }
  return pool;
};

// Helper to determine SQL type from value
const getSqlType = (value) => {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? sql.Int : sql.Float;
  }
  if (typeof value === 'boolean') {
    return sql.Bit;
  }
  return sql.NVarChar;
};

// Create a mysql2-compatible query interface
const createQueryInterface = (pool) => {
  return {
    query: async (queryString, params = []) => {
      if (!pool.connected) {
        await pool.connect();
      }
      
      const request = pool.request();
      
      // Replace ? with @p0, @p1, etc. and add parameters
      let sqlQuery = queryString;
      
      // Handle GROUP_CONCAT -> STRING_AGG conversion
      sqlQuery = sqlQuery.replace(/GROUP_CONCAT\(([^)]+)\)/gi, (match, expr) => {
        return `STRING_AGG(CAST(${expr} AS NVARCHAR(MAX)), ', ')`;
      });
      
      // Check if it's an INSERT statement
      const isInsert = sqlQuery.trim().toUpperCase().startsWith('INSERT');
      
      // For INSERT, modify query to return the inserted ID
      if (isInsert) {
        // Match INSERT INTO table (columns) VALUES pattern
        const insertMatch = sqlQuery.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
        if (insertMatch) {
          const tableName = insertMatch[1];
          sqlQuery = sqlQuery.replace(
            /INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i,
            `INSERT INTO $1 ($2) OUTPUT INSERTED.id VALUES ($3)`
          );
        }
      }
      
      // Replace ? placeholders
      params.forEach((param, index) => {
        const paramName = `p${index}`;
        sqlQuery = sqlQuery.replace('?', `@${paramName}`);
        request.input(paramName, getSqlType(param), param);
      });
      
      try {
        const result = await request.query(sqlQuery);
        
        // Return mysql2-compatible format: [rows, fields]
        // For INSERT, extract the insertId from the result
        if (isInsert && result.recordset.length > 0) {
          const insertId = result.recordset[0].id;
          return [result.recordset, { insertId }];
        }
        
        return [result.recordset, {}];
      } catch (error) {
        // Map SQL Server error codes to MySQL-like errors
        if (error.number === 2627 || error.number === 2601) {
          // Unique constraint violation
          error.code = 'ER_DUP_ENTRY';
        }
        throw error;
      }
    }
  };
};

const initialize = async () => {
  try {
    // Try to create database if it doesn't exist (skip if no permission)
    const dbName = process.env.DB_NAME || 'learning_portal';
    const useWindowsAuth = process.env.DB_USE_WINDOWS_AUTH === 'true' || 
                          (!process.env.DB_USER || process.env.DB_USER.startsWith('#'));
    
    try {
      const masterConfig = {
        server: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '1433'),
        options: {
          encrypt: process.env.DB_ENCRYPT === 'true',
          trustServerCertificate: true,
          enableArithAbort: true,
          requestTimeout: 30000,
          connectionTimeout: 30000
        }
      };
      
      if (useWindowsAuth) {
        // Windows Authentication
        if (process.env.DB_WINDOWS_USER && process.env.DB_WINDOWS_PASSWORD) {
          masterConfig.authentication = {
            type: 'ntlm',
            options: {
              userName: process.env.DB_WINDOWS_USER,
              password: process.env.DB_WINDOWS_PASSWORD,
              domain: process.env.DB_DOMAIN || process.env.DB_HOST || 'localhost'
            }
          };
        } else {
          masterConfig.authentication = {
            type: 'ntlm'
          };
        }
      } else {
        // SQL Server Authentication
        masterConfig.user = process.env.DB_USER;
        masterConfig.password = process.env.DB_PASSWORD;
      }
      
      const masterPool = new sql.ConnectionPool(masterConfig);
      await masterPool.connect();
      
      // Create database if it doesn't exist
      await masterPool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${dbName}')
        BEGIN
          CREATE DATABASE [${dbName}]
        END
      `);
      await masterPool.close();
      console.log(`Database '${dbName}' checked/created successfully`);
    } catch (dbCreateError) {
      // If permission denied, assume database already exists or will be created manually
      if (dbCreateError.number === 262) {
        console.log(`Note: Database creation skipped (permission denied). Assuming '${dbName}' exists or will be created manually.`);
      } else {
        throw dbCreateError;
      }
    }

    // Get pool with database
    const db = getPool();
    await db.connect();

    // Create tables
    await db.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sections]') AND type in (N'U'))
      BEGIN
        CREATE TABLE sections (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL UNIQUE,
          description NVARCHAR(MAX),
          created_at DATETIME DEFAULT GETDATE()
        )
      END
    `);

    await db.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND type in (N'U'))
      BEGIN
        CREATE TABLE users (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL,
          email NVARCHAR(100) NOT NULL UNIQUE,
          password_hash NVARCHAR(255) NOT NULL,
          role NVARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE()
        )
      END
    `);

    await db.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[user_sections]') AND type in (N'U'))
      BEGIN
        CREATE TABLE user_sections (
          id INT IDENTITY(1,1) PRIMARY KEY,
          user_id INT NOT NULL,
          section_id INT NOT NULL,
          assigned_at DATETIME DEFAULT GETDATE(),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
          CONSTRAINT unique_user_section UNIQUE (user_id, section_id)
        )
      END
    `);

    await db.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[videos]') AND type in (N'U'))
      BEGIN
        CREATE TABLE videos (
          id INT IDENTITY(1,1) PRIMARY KEY,
          title NVARCHAR(255) NOT NULL,
          section_id INT NOT NULL,
          s3_key NVARCHAR(500) NOT NULL,
          s3_url NVARCHAR(MAX),
          uploaded_by INT NOT NULL,
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE(),
          FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
          FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
        )
      END
    `);

    // Create trigger to update updated_at timestamp
    await db.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_users_updated_at')
      BEGIN
        EXEC('
          CREATE TRIGGER trg_users_updated_at
          ON users
          AFTER UPDATE
          AS
          BEGIN
            UPDATE users
            SET updated_at = GETDATE()
            FROM users u
            INNER JOIN inserted i ON u.id = i.id
          END
        ')
      END
    `);

    await db.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_videos_updated_at')
      BEGIN
        EXEC('
          CREATE TRIGGER trg_videos_updated_at
          ON videos
          AFTER UPDATE
          AS
          BEGIN
            UPDATE videos
            SET updated_at = GETDATE()
            FROM videos v
            INNER JOIN inserted i ON v.id = i.id
          END
        ')
      END
    `);

    // Create default admin user if it doesn't exist
    const adminCheck = await db.request()
      .input('email', sql.NVarChar, 'admin@learningportal.com')
      .query('SELECT id FROM users WHERE email = @email');

    if (adminCheck.recordset.length === 0) {
      const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
      await db.request()
        .input('name', sql.NVarChar, 'Admin User')
        .input('email', sql.NVarChar, 'admin@learningportal.com')
        .input('password_hash', sql.NVarChar, adminPasswordHash)
        .input('role', sql.NVarChar, 'admin')
        .query('INSERT INTO users (name, email, password_hash, role) VALUES (@name, @email, @password_hash, @role)');
      console.log('Default admin user created: admin@learningportal.com / Admin@123');
    }

    // Create default sections if they don't exist
    const sectionsCheck = await db.request().query('SELECT COUNT(*) as count FROM sections');
    if (sectionsCheck.recordset[0].count === 0) {
      const defaultSections = [
        ['Physics', 'Physics lectures and materials'],
        ['Chemistry', 'Chemistry lectures and materials'],
        ['Biology', 'Biology lectures and materials']
      ];
      for (const [name, description] of defaultSections) {
        await db.request()
          .input('name', sql.NVarChar, name)
          .input('description', sql.NVarChar, description)
          .query('INSERT INTO sections (name, description) VALUES (@name, @description)');
      }
      console.log('Default sections created');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Export a mysql2-compatible interface
module.exports = {
  getPool: () => {
    const pool = getPool();
    return createQueryInterface(pool);
  },
  initialize
};
