function generateReservationID() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
  
    // Generate 3 random capital letters
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * letters.length);
      code += letters[randomIndex];
    }
  
    // Generate 2 random numbers
    for (let i = 0; i < 2; i++) {
      code += Math.floor(Math.random() * 10); // Generates random numbers from 0 to 9
    }
  
    return code;
  }

  module.exports = generateReservationID