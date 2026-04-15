const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

const MAX_SEATS_PER_MOBILE_PER_DAY = 6;

// ✅ Correct seat format: A1, B1, C1...
const VALID_SEATS = new Set(
  Array.from({ length: 15 }, (_, i) => i + 1)
    .flatMap(row => ['A', 'B', 'C', 'D'].map(col => `${col}${row}`))
);

exports.createBooking = async ({ travelDate, mobile, seats }) => {
  if (!seats || seats.length === 0) {
    throw new Error('At least one seat is required');
  }

  if (seats.length > MAX_SEATS_PER_MOBILE_PER_DAY) {
    throw new Error(`Maximum ${MAX_SEATS_PER_MOBILE_PER_DAY} seats allowed`);
  }

  // Validate seats
  const invalidSeats = seats.filter(s => !VALID_SEATS.has(s));
  if (invalidSeats.length > 0) {
    throw new Error(`Invalid seats: ${invalidSeats.join(', ')}`);
  }

  // Remove duplicates
  const uniqueSeats = [...new Set(seats)];

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ✅ Check existing seat count for mobile on same day
    const existing = await client.query(
      `SELECT SUM(array_length(seats, 1)) AS total
       FROM bookings
       WHERE mobile = $1 AND DATE(travel_date) = $2`,
      [mobile, travelDate]
    );

    const alreadyBooked = parseInt(existing.rows[0].total) || 0;

    if (alreadyBooked + uniqueSeats.length > MAX_SEATS_PER_MOBILE_PER_DAY) {
      throw new Error(
        `Seat limit exceeded. Already booked ${alreadyBooked}, max allowed is ${MAX_SEATS_PER_MOBILE_PER_DAY}`
      );
    }

    // ✅ Check if seats already booked
   const taken = await client.query(
  `SELECT seats
   FROM bookings
   WHERE DATE(travel_date) = $1
   FOR UPDATE`,
  [travelDate]
);

// Flatten seats manually
const takenSeats = new Set(
  taken.rows.flatMap(row => row.seats)
);

    

    const conflicts = uniqueSeats.filter(s => takenSeats.has(s));

    if (conflicts.length > 0) {
      throw new Error(`Seats already booked: ${conflicts.join(', ')}`);
    }

    // ✅ Insert booking
    const id = uuidv4();

    await client.query(
      `INSERT INTO bookings (id, travel_date, mobile, seats, boarded)
       VALUES ($1, $2, $3, $4, false)`,
      [id, travelDate, mobile, uniqueSeats]
    );

    await client.query('COMMIT');

    return {
      id,
      travelDate,
      mobile,
      seats: uniqueSeats,
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};