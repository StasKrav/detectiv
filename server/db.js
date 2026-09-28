const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Путь к файлу БД
const DB_PATH = path.join(__dirname, '..', 'data', 'sherlock.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Подключаемся (файл создастся автоматически)
const db = new Database(DB_PATH);

// Включаем foreign keys — важно для SQLite
db.pragma('foreign_keys = ON');

// Применяем схему при каждом старте (CREATE TABLE IF NOT EXISTS — безопасно)
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

console.log(`База данных подключена: ${DB_PATH}`);

module.exports = db;
