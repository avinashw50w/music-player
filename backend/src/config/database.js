
import knex from 'knex';
import { config } from './env.js';

const db = knex({
    client: 'better-sqlite3',
    connection: {
        filename: config.DB_PATH
    },
    useNullAsDefault: true
});

export default db;
