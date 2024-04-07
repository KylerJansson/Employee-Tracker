const mysql = require('mysql2');


const db = mysql.createConnection(
    {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'employee_tracker'

    },

);

db.connect((err) => {
    if (err) throw err;
    console.log("Connected to the Employee Tracker Database.")
})

module.exports = db;