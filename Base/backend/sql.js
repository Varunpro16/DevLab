const { spawn } = require('child_process');
const mysql = require('mysql2/promise');

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function start() {
  const portForward = spawn('kubectl', ['port-forward', 'svc/mysql-service', '3308:3308']);

  portForward.stdout.on('data', (data) => console.log(`[stdout] ${data}`));
  portForward.stderr.on('data', (data) => console.error(`[stderr] ${data}`));

  // Wait 2-3 seconds for port to forward
  await sleep(3000);

  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3308,
      user: 'user',
      password: 'password',
    });
console.log('✅ Connected to MySQL as id ' + connection.threadId);

    // const [rows] = await connection.execute('SELECT * FROM your_table');
    // console.log(rows);

    await connection.end();
  } catch (err) {
    console.error('SQL Error:', err);
  }

  // Clean up
  portForward.kill();
}

start();


// Don't forget to close when done
// podConnection.end();


// // Step 1: Create connection
// const connection = mysql.createConnection({
//   host: 'localhost', // Kubernetes Service name
//   user: 'user',
//   password: 'password',
//   database: 'mydb',
//   port: 3308
// });

// // Step 2: Connect to MySQL
// connection.connect(err => {
//   if (err) {
//     console.error('❌ Error connecting to MySQL:', err.stack);
//     return;
//   }
//   console.log('✅ Connected to MySQL as id ' + connection.threadId);

//   // Step 3: Insert a user row
//   const user = { name: 'Saii Varun', email: 'saiivarun@example.com' };
//   connection.query('INSERT INTO users SET ?', user, (insertErr, insertResult) => {
//     if (insertErr) {
//       console.error('❌ Insert error:', insertErr);
//       return;
//     }
//     console.log('✅ Inserted user with ID:', insertResult.insertId);

//     // Step 4: Display all users
//     connection.query('SELECT * FROM users', (selectErr, rows) => {
//       if (selectErr) {
//         console.error('❌ Select error:', selectErr);
//         return;
//       }
//       console.log('✅ Users:');
//       console.table(rows);

//       // Step 5: Close connection
//       connection.end();
//     });
//   });
// });
