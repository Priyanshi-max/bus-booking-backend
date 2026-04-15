const express = require('express');
const router = express.Router();
const pool = require('../db');
const service = require('../services/bookingService');


// ======================
// ✅ CREATE BOOKING
// ======================
router.post('/book', async (req, res) => {
  try {
    const { travelDate, mobile, seats } = req.body;

    console.log("Incoming booking:", req.body);

    if (!travelDate || !mobile || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ error: 'travelDate, mobile, seats required' });
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ error: 'Invalid mobile number' });
    }

    const data = await service.createBooking({ travelDate, mobile, seats });

    res.status(201).json(data);

  } catch (err) {
    console.error("BOOK ERROR:", err.message);
    res.status(400).json({ error: err.message });
  }
});


// ======================
// ✅ GET BOOKINGS LIST
// ======================
router.get('/list', async (req, res) => {
  try {
    const { date } = req.query;

    console.log("Fetching bookings for:", date);

    if (!date) {
      return res.status(400).json({ error: 'date query required' });
    }

    const result = await pool.query(
      `SELECT id, travel_date, mobile, seats, boarded, created_at
       FROM bookings
       WHERE DATE(travel_date) = $1
       ORDER BY created_at ASC`,
      [date]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("LIST ERROR:", err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});


// ======================
// ✅ GET BOOKED SEATS
// ======================
router.get('/booked-seats', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date required' });
    }

    const result = await pool.query(
      `SELECT UNNEST(seats) AS seat
       FROM bookings
       WHERE DATE(travel_date) = $1`,
      [date]
    );

    res.json({
      bookedSeats: result.rows.map(r => r.seat),
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch seats' });
  }
});


// ======================
// ✅ MARK BOARDED
// ======================
router.put('/board/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE bookings
       SET boarded = true
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: 'Failed to update boarding' });
  }
});


// ======================
// ✅ UPDATE BOOKING
// ======================
router.put('/booking/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { mobile, seats } = req.body;

    if (seats && seats.length > 6) {
      return res.status(400).json({ error: 'Max 6 seats allowed' });
    }

    const existing = await pool.query(
      `SELECT * FROM bookings WHERE id = $1`,
      [id]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const updated = await pool.query(
      `UPDATE bookings
       SET mobile = COALESCE($1, mobile),
           seats = COALESCE($2, seats)
       WHERE id = $3
       RETURNING *`,
      [mobile || null, seats || null, id]
    );

    res.json(updated.rows[0]);

  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});


// ======================
// ✅ DELETE BOOKING
// ======================
router.delete('/booking/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM bookings WHERE id = $1 RETURNING id`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

module.exports = router;